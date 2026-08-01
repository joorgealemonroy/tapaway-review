import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";


interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Avoid re-setting identical session objects: every setState here creates a
    // new `user` identity that re-triggers downstream effects (admin/rep checks),
    // which caused repeated duplicate queries.
    const applySession = (next: Session | null) => {
      setSession((prev) => {
        if (prev?.access_token === next?.access_token) return prev;
        return next;
      });
      setUser((prev) => {
        const nextUser = next?.user ?? null;
        if (prev?.id === nextUser?.id && prev?.updated_at === nextUser?.updated_at) return prev;
        return nextUser;
      });
      setLoading(false);
    };

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        applySession(session);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    return () => subscription.unsubscribe();
  }, []);


  const signUp = async (email: string, _password: string) => {
    // IMPORTANT: We do not use the default auth email pipeline for signups.
    // Signup + verification happens inside /onboarding via our custom OTP flow.
    console.warn("[Auth] signUp blocked; redirecting to /onboarding for custom verification");
    toast.message("Continue setup in onboarding to verify your email.");
    navigate("/onboarding");
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      return { error };
    }

    toast.success("Signed in successfully!");
    
    // Priority routing:
    // 1. Super admin (tap@tapaway.co) → always go to /admin
    // 2. Test accounts (tester*@tapaway.co or test@me.com) → go to /admin for testing
    // 3. Normal users → check onboarding status, then dashboard or onboarding
    const emailLower = email.toLowerCase();
    
    if (emailLower === 'tap@tapaway.co') {
      // Super admin: always redirect to admin dashboard
      navigate("/admin");
    } else if (emailLower === 'test@me.com' || (emailLower.includes('@tapaway.co') && emailLower.includes('tester'))) {
      // Test accounts: ensure linked, then redirect to admin
      if (data.user && emailLower === "test@me.com") {
        try {
          const { error: assignError } = await supabase.functions.invoke('assign-test-owner');
          if (assignError) {
            console.error('[signIn] Failed to assign test restaurant:', assignError);
          }
        } catch (err) {
          console.error('[signIn] Error calling assign-test-owner:', err);
        }
      }
      navigate("/admin");
    } else {
      // Check if affiliate-only (no dashboard account)
      const { data: affiliate } = await supabase
        .from("affiliates")
        .select("id")
        .eq("user_id", data.user?.id)
        .eq("is_active", true)
        .maybeSingle();

      if (affiliate) {
        const [personalResult, restaurantResult] = await Promise.all([
          supabase
            .from("personal_profiles")
            .select("id")
            .eq("user_id", data.user?.id)
            .maybeSingle(),
          supabase
            .from("restaurants")
            .select("id")
            .eq("owner_id", data.user?.id)
            .limit(1),
        ]);

        if (!personalResult.data && (!restaurantResult.data || restaurantResult.data.length === 0)) {
          navigate("/affiliate");
          return { error: null };
        }
      }

      // Let Dashboard.tsx decide() handle all business vs personal routing
      navigate("/dashboard");
    }

    return { error: null };
  };

  const signOut = async () => {
    // Clear local state immediately
    setUser(null);
    setSession(null);
    
    try {
      await supabase.auth.signOut();
    } catch (err) {
      // Session may already be expired/invalid - that's fine
      console.log('Sign out completed (session may have been expired)');
    }
    
    toast.success("Signed out successfully");
    navigate("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";


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
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    let authRevision = 0;
    // Avoid re-setting identical session objects: every setState here creates a
    // new `user` identity that re-triggers downstream effects (admin/rep checks),
    // which caused repeated duplicate queries.
    const applySession = (next: Session | null) => {
      if (!active) return;
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
        authRevision += 1;
        if (event === "SIGNED_OUT") {
          queryClient.removeQueries({ queryKey: ["sales-rep"] });
          queryClient.removeQueries({ queryKey: ["admin-role"] });
        }
        applySession(session);
      }
    );

    // Then check for existing session
    const restoreSession = async () => {
      const revision = authRevision;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        // A newer sign-in, refresh or explicit sign-out wins over an older read.
        if (active && revision === authRevision) applySession(session);
      } catch (err) {
        console.error("Could not restore session:", err);
        if (active && revision === authRevision) setLoading(false);
      }
    };
    void restoreSession();
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) void restoreSession();
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [queryClient]);


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
    
    // The server's role record is the only authority for admin routing.
    const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
    if (!roleError && isAdmin === true) {
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

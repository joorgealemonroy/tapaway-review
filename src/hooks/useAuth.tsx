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
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = email === "test@me.com" 
      ? `${window.location.origin}/dashboard`
      : `${window.location.origin}/onboarding`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Account created! Redirecting...");
      
      // If this is the master admin email, assign admin role
      if (data.user && email === "tap@tapaway.co") {
        await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: "admin" });
      }
      
      // If test account, link to test restaurant using backend function
      if (data.user && email === "test@me.com") {
        try {
          const { error: assignError } = await supabase.functions.invoke('assign-test-owner');
          if (assignError) {
            console.error('[signUp] Failed to assign test restaurant:', assignError);
            toast.error("Failed to link test account");
          }
        } catch (err) {
          console.error('[signUp] Error calling assign-test-owner:', err);
        }
        navigate("/dashboard");
      } else {
        navigate("/onboarding");
      }
    }

    return { error };
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
      // Normal users: check subscription and onboarding status
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("onboarding_completed, subscription_status")
        .eq("owner_id", data.user?.id)
        .maybeSingle();
      
      if (!restaurant) {
        // No restaurant - redirect to paywall to subscribe
        navigate("/paywall");
      } else if (restaurant.subscription_status !== 'active') {
        // Has restaurant but no active subscription - redirect to paywall
        navigate("/paywall");
      } else if (!restaurant.onboarding_completed) {
        // Active subscription but incomplete onboarding
        navigate("/onboarding");
      } else {
        // Fully onboarded with active subscription
        navigate("/dashboard");
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
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

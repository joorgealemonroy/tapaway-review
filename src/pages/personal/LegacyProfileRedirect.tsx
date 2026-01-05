import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

// 301 redirect from /u/:username to /:username
const LegacyProfileRedirect = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (username) {
      // Use replace to simulate 301 redirect (replaces history entry)
      navigate(`/${username}`, { replace: true });
    }
  }, [username, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
};

export default LegacyProfileRedirect;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  Check, 
  Copy, 
  ExternalLink,
  Package,
  Smartphone,
  RefreshCw,
  PartyPopper
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  username: string;
}

export const SuccessScreen = ({ username }: Props) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const profileUrl = `tapaway.co/${username}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`https://${profileUrl}`);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const nextSteps = [
    {
      icon: Package,
      title: "Your card is being prepared",
      description: "Ships in 1–2 business days with tracking",
    },
    {
      icon: Smartphone,
      title: "Tap to share in person",
      description: "Just hold your card to any phone — no app needed",
    },
    {
      icon: RefreshCw,
      title: "Update links anytime",
      description: "Changes appear instantly on your profile",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4">
          <a href="/personal" className="font-black text-xl tracking-tight text-foreground">
            TapAway
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto px-4 py-12 flex flex-col items-center text-center">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
          >
            <PartyPopper className="h-10 w-10 text-primary" />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-foreground mb-2"
        >
          You're all set! 🎉
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-8"
        >
          Your TapAway profile is live and your card is being prepared.
        </motion.p>

        {/* Profile Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full p-4 bg-muted/50 rounded-xl border border-border mb-8"
        >
          <p className="text-sm text-muted-foreground mb-2">Your profile link</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-background rounded-lg font-mono text-sm text-foreground truncate">
              {profileUrl}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={copyToClipboard}
              className="h-11 w-11 flex-shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Add this to your Instagram, TikTok bio, or anywhere you share
          </p>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="w-full space-y-3 mb-8"
        >
          <h2 className="text-sm font-semibold text-foreground text-left">What's next</h2>
          {nextSteps.map((step, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 bg-card rounded-xl border border-border text-left"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full"
        >
          <Button
            onClick={() => navigate("/personal/dashboard")}
            className="w-full h-14 text-base font-semibold"
          >
            Go to dashboard
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </motion.div>
      </main>
    </div>
  );
};

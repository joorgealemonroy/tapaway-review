import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Package, Mail, Settings, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const TrialConfirmed = () => {
  const navigate = useNavigate();

  const confirmationPoints = [
    { icon: Check, text: "Your free 30-day trial is active" },
    { icon: Settings, text: "We're setting up your review + social hub" },
    { icon: Package, text: "Your NFC cards will ship in 1–2 business days" },
  ];

  const nextSteps = [
    "We prepare your custom setup",
    "Your NFC cards ship within 1–2 business days",
    "We email you once everything is ready",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-center">
          <span className="font-bold text-xl">TapAway</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-xl mx-auto px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
            className="flex justify-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-10 h-10 text-primary" />
            </div>
          </motion.div>

          {/* Headline */}
          <div className="text-center space-y-3">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              You're all set 🎉
            </h1>
            <p className="text-muted-foreground text-lg">
              We're getting TapAway ready for your business.
            </p>
          </div>

          {/* Confirmation Points */}
          <Card className="p-6 bg-primary/5 border-primary/10">
            <ul className="space-y-4">
              {confirmationPoints.map((point, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <point.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium">{point.text}</span>
                </motion.li>
              ))}
            </ul>
          </Card>

          {/* What Happens Next */}
          <Card className="p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              What happens next
            </h2>
            <ol className="space-y-3">
              {nextSteps.map((step, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 + index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-sm font-semibold text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="text-sm text-muted-foreground pt-0.5">{step}</span>
                </motion.li>
              ))}
            </ol>
          </Card>

          {/* Reassurance */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="text-center text-sm text-muted-foreground"
          >
            You don't need to do anything right now — we'll take care of the setup.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.1 }}
            className="space-y-3"
          >
            <Button
              onClick={() => navigate("/onboarding")}
              className="w-full h-14 text-lg font-bold"
            >
              Continue to Setup
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              We'll guide you through a quick setup to personalize your experience.
            </p>
          </motion.div>

          {/* Trial reminder */}
          <div className="text-center pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground">
              Free 30-day trial • No charge today • Cancel anytime before day 30
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TrialConfirmed;

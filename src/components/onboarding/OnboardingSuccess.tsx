import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Package, Star, Clock } from "lucide-react";
import { motion } from "framer-motion";

interface OnboardingSuccessProps {
  businessName?: string;
}

export function OnboardingSuccess({ businessName }: OnboardingSuccessProps) {
  const navigate = useNavigate();

  const checklist = [
    { icon: Clock, label: "Trial active (14 days)", done: true },
    { icon: Package, label: "Cards queued for shipping", done: true },
    { icon: Star, label: "Review hub being finalized", done: true },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {/* Success icon */}
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Check className="w-8 h-8 text-primary" />
            </motion.div>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            You're all set 🎉
          </h1>
          
          {businessName && (
            <p className="text-lg text-muted-foreground mb-2">
              {businessName}
            </p>
          )}

          <p className="text-muted-foreground mb-8">
            Your TapAway cards are being prepared.<br />
            They'll ship in 1–2 business days.
          </p>

          {/* Checklist */}
          <div className="space-y-3 mb-8">
            {checklist.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-3 text-left"
              >
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {item.label}
                </span>
              </motion.div>
            ))}
          </div>

          <Button 
            onClick={() => navigate("/dashboard")} 
            className="w-full"
            size="lg"
          >
            Go to Dashboard
          </Button>
        </motion.div>
      </Card>
    </div>
  );
}

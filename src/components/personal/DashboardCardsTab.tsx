import { CreditCard } from "lucide-react";

interface DashboardCardsTabProps {
  userId: string;
  username: string;
}

export const DashboardCardsTab = ({ userId, username }: DashboardCardsTabProps) => {
  return (
    <div className="text-center py-16 space-y-4 max-w-sm mx-auto">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
        <CreditCard className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-foreground">NFC Cards — Coming Soon</h3>
      <p className="text-sm text-muted-foreground">
        Tap your TapAway card on any phone to instantly share your profile — no app needed. Stay tuned!
      </p>
    </div>
  );
};

import { Card } from "@/components/ui/card";
import { Trophy, Mail } from "lucide-react";

interface CompetitorTabProps {
  restaurantId: string;
}

export const CompetitorTab = ({ restaurantId }: CompetitorTabProps) => {
  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
          <Trophy className="w-7 h-7 text-primary" />
          Competitors (Coming Soon)
        </h2>
        <p className="text-muted-foreground">Track how you stack up against local competition</p>
      </div>

      <Card className="p-8 text-center gradient-subtle border-none shadow-lg">
        <div className="max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Trophy className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold mb-4">Competitor Insights In Progress</h3>
          <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
            We're building a live competitor insights tool that will show how your reviews and growth 
            stack up against similar restaurants nearby. This feature is currently in progress and will 
            be released soon.
          </p>
          <div className="bg-background/50 rounded-lg p-6 mb-6">
            <h4 className="font-semibold mb-3 text-lg">What to Expect:</h4>
            <ul className="text-left text-muted-foreground space-y-2 max-w-md mx-auto">
              <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>Real-time review count comparisons</span></li>
              <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>Rating benchmarks and performance trends</span></li>
              <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>Automatic competitor identification</span></li>
              <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>Growth insights to stay ahead</span></li>
            </ul>
          </div>
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="w-4 h-4" />
            <span>Want early access? Email <a href="mailto:tap@tapaway.co" className="text-primary hover:underline font-semibold">tap@tapaway.co</a></span>
          </div>
        </div>
      </Card>
    </div>
  );
};

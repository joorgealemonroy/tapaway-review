import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, HelpCircle, Star, Clock, Users } from "lucide-react";

export const SupportTab = () => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Best Practices for Using TapAway</h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            <Star className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium">Increase 5-Star Reviews</h4>
              <p className="text-sm text-muted-foreground">
                Ask satisfied customers to leave a review right after their positive experience. The sooner they review, the more detailed and enthusiastic their feedback will be.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium">When to Hand Out NFC Cards</h4>
              <p className="text-sm text-muted-foreground">
                Present NFC cards or QR codes when dropping off the check, or after the meal when customers appear satisfied. Train staff to gauge customer satisfaction before offering.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Users className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium">Staff Training</h4>
              <p className="text-sm text-muted-foreground">
                Make sure your team understands the Review Hub process. They should be able to explain how it works and encourage guests to use it naturally, without being pushy.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">How Analytics Work</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your analytics dashboard tracks every interaction with your Review Hub. This includes:
        </p>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
          <li>Total number of taps (customers who opened your hub)</li>
          <li>Which buttons customers click (Google, Yelp, Instagram, Directions, Menu)</li>
          <li>Peak days and times for customer engagement</li>
          <li>Historical trends over 7, 14, and 30 days</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-4">
          Use this data to understand when customers are most engaged and which platforms they prefer for leaving reviews.
        </p>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm">How do I update my menu?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Navigate to the Menu tab in your dashboard. You can add, edit, or remove sections and items. Changes appear on your Review Hub instantly.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-sm">Can I customize my review hub URL?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Yes! Go to Settings → Basic Information and update your Custom Slug. Your hub will be accessible at tapaway.co/your-slug.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-sm">What if a customer has a bad experience?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Your staff guidance prompts (in Settings) help your team handle negative feedback professionally. Encourage staff to empathize and offer to connect unhappy guests with management before they leave a public review.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium text-sm">How do I view my billing information?</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Click the Billing tab to see your current plan, next billing date, and manage your subscription through the Stripe customer portal.
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-6 h-6 text-primary flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">Need More Help?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Our support team is here to help you succeed. Contact us for technical support, billing questions, or general inquiries.
            </p>
            <Button asChild>
              <a href="mailto:tap@tapaway.co">
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </a>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
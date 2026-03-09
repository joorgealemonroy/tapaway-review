import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Mail, BookOpen, MessageCircle, Lightbulb } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const SupportTab = () => {
  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
          <HelpCircle className="w-7 h-7 text-primary" />
          Support & Help
        </h2>
        <p className="text-muted-foreground">Get answers and reach out to our team</p>
      </div>

      <Card className="p-6 card-elevated bg-primary/10 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Mail className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2 text-foreground">Need Help?</h3>
            <p className="text-muted-foreground mb-4">
              Our team is here to help you get the most out of TapAway. Have questions about your account, 
              features, or need technical support? We're just an email away.
            </p>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
              <a href="mailto:tap@tapaway.co">
                <Mail className="w-4 h-4 mr-2" />
                Contact Support
              </a>
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 card-elevated">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-bold">Best Practices</h3>
        </div>
        <div className="space-y-4 text-sm leading-relaxed">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <div>
              <p className="font-semibold mb-1">Place cards strategically</p>
              <p className="text-muted-foreground">
                Put TapAway cards on every table and near the register. The more visible, the more reviews you'll get.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <div>
              <p className="font-semibold mb-1">Train your staff</p>
              <p className="text-muted-foreground">
                Make sure your team knows to mention the cards to happy customers. A quick "We'd love your feedback!" goes a long way.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">3</span>
            </div>
            <div>
              <p className="font-semibold mb-1">Follow up on feedback</p>
              <p className="text-muted-foreground">
                Use AI Coach insights to improve operations and respond to reviews promptly to show you care.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 card-elevated">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-xl font-bold">Frequently Asked Questions</h3>
        </div>
        <Accordion type="single" collapsible className="space-y-2">
          <AccordionItem value="item-1" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              How do I get more taps on my cards?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Place cards prominently on tables, at checkout, and train staff to mention them to satisfied customers. 
              Consider adding a small incentive like "Leave us a review and get 10% off your next visit!"
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              Can I customize my Review Hub URL?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Your custom slug is set during onboarding and cannot be changed to maintain link stability. 
              If you absolutely need to change it, contact our support team at tap@tapaway.co.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              How does the AI Coach work?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              AI Coach analyzes your tap data, review patterns, and customer behavior to provide personalized recommendations. 
              It unlocks after 1,000 taps to ensure we have enough data for meaningful insights.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              What if I need to update my menu?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Go to the Menu tab and either upload a new menu image for AI parsing or manually edit items. 
              Changes take effect immediately after you save.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-5" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              How do I manage my subscription?
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              Visit the Billing tab to access your Stripe customer portal where you can update payment methods, 
              view invoices, and manage your subscription.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <Card className="p-6 bg-accent/10 border-accent/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="font-bold mb-2">💡 Pro Tip</h3>
            <p className="text-sm text-foreground">
              Check your AI Coach tab regularly for personalized insights based on your restaurant's performance. 
              The more data you collect, the better recommendations you'll get!
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone } from "lucide-react";

const AIDisclaimer = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">TapAway</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">AI Features Disclaimer</h1>
        <p className="text-muted-foreground mb-4">Last Updated: February 21, 2026</p>
        <p className="text-muted-foreground mb-8 italic">
          This disclaimer applies to TapAway's AI-powered features available to business users, including AI Coach,
          AI review reply suggestions, AI-generated insights, and any other AI-assisted functionality.
        </p>

        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Nature of AI Features</h2>
            <p className="text-muted-foreground">
              TapAway's AI features use artificial intelligence and machine learning models to generate suggestions,
              insights, review reply drafts, and business recommendations. These features are designed to assist
              you—not replace professional judgment. AI outputs are generated automatically based on available data
              and algorithmic processing. They are not reviewed, verified, or endorsed by TapAway staff before
              being presented to you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. No Guarantees of Accuracy</h2>
            <p className="text-muted-foreground mb-4">
              <strong>TAPAWAY MAKES NO GUARANTEE</strong> regarding the accuracy, completeness, reliability,
              suitability, or timeliness of any AI-generated content. AI outputs may:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Contain factual errors, inaccuracies, or outdated information</li>
              <li>Produce irrelevant or inappropriate suggestions</li>
              <li>Generate content that does not accurately reflect your business or situation</li>
              <li>Vary in quality and relevance over time as models are updated</li>
              <li>Produce different results for the same or similar inputs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Not Professional Advice</h2>
            <p className="text-muted-foreground mb-4">
              <strong>AI-GENERATED CONTENT IS NOT:</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Legal advice or legal counsel</li>
              <li>Financial or investment advice</li>
              <li>Medical or health advice</li>
              <li>Professional business consulting</li>
              <li>Marketing strategy guaranteed to produce results</li>
              <li>A substitute for professional expertise in any field</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              You should consult qualified professionals for specific legal, financial, medical, or business advice.
              Reliance on AI-generated content is entirely at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. User Responsibility</h2>
            <p className="text-muted-foreground mb-4">
              <strong>YOU ARE SOLELY RESPONSIBLE</strong> for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Reviewing all AI-generated content before using, posting, or acting on it</li>
              <li>Editing and verifying AI-generated review replies before posting them publicly</li>
              <li>Evaluating the accuracy and appropriateness of AI insights for your specific situation</li>
              <li>Any decisions made based on AI-generated suggestions or insights</li>
              <li>Ensuring AI-generated content complies with applicable laws and platform policies</li>
              <li>Any consequences arising from your use of AI-generated content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. No Guarantee of Business Results</h2>
            <p className="text-muted-foreground">
              <strong>AI FEATURES DO NOT GUARANTEE</strong> any specific business outcomes, including but not limited
              to: increased reviews, higher ratings, more customers, revenue growth, improved reputation, or competitive
              advantage. AI insights are based on available data and algorithmic analysis—they are not predictive
              guarantees. Actual results depend on numerous factors outside TapAway's control.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. AI Model Changes</h2>
            <p className="text-muted-foreground">
              TapAway may change, update, replace, or discontinue AI models, algorithms, and features at any time
              without notice. Changes to AI models may affect the quality, style, or content of AI-generated outputs.
              TapAway is not obligated to maintain any specific AI model, capability, or level of output quality.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Data Usage for AI</h2>
            <p className="text-muted-foreground">
              AI features process data from your account and publicly available information to generate outputs. This
              includes your analytics data, public Google reviews, competitor public listings, and dashboard
              configuration. The use of this data is governed by our Privacy Policy. AI-generated outputs are not
              stored, shared, or used to train models for other customers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              <strong>TO THE MAXIMUM EXTENT PERMITTED BY LAW,</strong> TapAway shall not be liable for any damages,
              losses, costs, or expenses arising from your use of or reliance on AI-generated content, including but
              not limited to: lost profits, reputational harm, business losses, customer disputes, platform policy
              violations, or any direct, indirect, incidental, special, consequential, or punitive damages. Your
              use of AI features is entirely at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Contact</h2>
            <p className="text-muted-foreground">
              For questions about AI features, contact us at: <strong>tap@tapaway.co</strong>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AIDisclaimer;

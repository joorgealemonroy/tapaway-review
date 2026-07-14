import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Do I need staff training?",
    answer:
      "No. TapAway is completely done-for-you. We ship your cards, set up your review page, and handle everything. Just place the NFC card on your counter or hand it to happy guests, one tap and they're on your Google review page. No apps, no passwords, no explanation needed.",
  },
  {
    question: "Is my logo printed on the cards?",
    answer:
      "Yes! We include free custom logo printing on your NFC cards at no extra charge. Want something simpler? Unbranded cards are also available. Just let us know your preference during setup.",
  },
  {
    question: "Why NFC instead of QR codes?",
    answer:
      "NFC has a much higher completion rate. With QR codes, customers have to open their camera, scan, wait for the link, then tap, multiple friction points. With TapAway, it's just one tap and they're instantly on your review page. No friction, more reviews.",
  },
  {
    question: "Does this violate Google policies?",
    answer:
      "No. TapAway is 100% compliant with Google's review policies. We never offer incentives for reviews, we simply make it faster and easier for happy customers to leave honest feedback. Google encourages businesses to ask for reviews.",
  },
  {
    question: "What happens after 30 days?",
    answer:
      "After your 30-day free trial, TapAway is just $30/month. You can cancel anytime before the trial ends and you won't be charged. If you love it (most do), your card on file will be billed automatically on day 31, no action needed.",
  },
  {
    question: "Can I add more locations later?",
    answer:
      "Yes! You can add additional locations at any time. Each location gets its own set of NFC cards and a custom review page. Multi-location businesses get volume discounts.",
  },
  {
    question: "How fast do the cards ship?",
    answer:
      "Cards ship within 1–2 business days. Most customers receive their TapAway cards within 5 business days of signing up.",
  },
  {
    question: "What if my cards get lost or damaged?",
    answer:
      "We replace lost or damaged cards for free during your subscription. Just reach out to support and we'll ship new ones within 2 business days.",
  },
];

export const FAQSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 px-4 bg-muted/30">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
            Questions? We've Got Answers.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-card rounded-xl border border-border px-6 data-[state=open]:shadow-lg transition-all"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

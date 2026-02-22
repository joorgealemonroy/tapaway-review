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
    question: "Does it work on iPhone and Android?",
    answer:
      "Yes! TapAway cards work with all modern iPhones (iPhone 7 and newer) and most Android phones with NFC. Just tap and it opens instantly — no app download needed.",
  },
  {
    question: "Do I need to download an app?",
    answer:
      "No app required. Your card links directly to your custom link page. Anyone who taps your card will see your links instantly in their browser.",
  },
  {
    question: "Can I change my links after I get my card?",
    answer:
      "Yes! You can update your links anytime through your TapAway dashboard. Your card stays the same — only your links change.",
  },
  {
    question: "How fast do the cards ship?",
    answer:
      "Cards ship within 1–2 business days. Most customers receive their TapAway card within 5 business days of ordering.",
  },
  {
    question: "What links can I add?",
    answer:
      "Anything you want — Instagram, TikTok, YouTube, Spotify, PayPal, Venmo, your website, booking link, portfolio, and more. No limits.",
  },
];

export const PersonalFAQ = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 px-4 bg-background">
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
                className="bg-muted/30 rounded-xl border border-border px-6 data-[state=open]:shadow-lg transition-all"
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

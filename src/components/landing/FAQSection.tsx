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
      "We design your cards and set up your hub. Show customers how to tap with a compatible phone or scan the QR code to open your business links.",
  },
  {
    question: "Is my logo printed on the cards?",
    answer:
      "Yes. Custom printing with your logo is included. You can also choose unbranded cards during setup.",
  },
  {
    question: "Why NFC instead of QR codes?",
    answer:
      "Your card includes both. NFC opens your hub on compatible phones; the QR code offers a camera-based alternative. Choose whichever works for your customer.",
  },
  {
    question: "Does this violate Google policies?",
    answer:
      "Ask customers for honest feedback without incentives, rating targets, or filtering based on satisfaction. Platform rules differ and can change. Google and Yelp determine their own review policies; TapAway does not certify compliance.",
  },
  {
    question: "What happens after 14 days?",
    answer:
      "After your 14-day trial, the selected monthly or full annual subscription amount is billed. See the pricing section for current available prices. Renews at your chosen interval until canceled. Cancel before your trial ends to avoid the first subscription charge.",
  },
  {
    question: "Will I be charged $1?",
    answer:
      "Card verification uses a temporary $1 authorization with manual capture. We request cancellation without capturing it. Your bank controls when the pending authorization disappears.",
  },
  {
    question: "Can I add more locations later?",
    answer:
      "Contact Support about your additional locations and available options. Your current subscription and card allowance remain unchanged until you choose an approved change.",
  },
  {
    question: "How fast do the cards ship?",
    answer:
      "We prepare your custom cards after setup. Shipping timing depends on design readiness and delivery conditions. Check your dashboard or contact Support for order updates.",
  },
  {
    question: "What if my cards get lost or damaged?",
    answer:
      "Eligible active or trialing accounts can request cards through their dashboard, up to the server-enforced calendar-month allowance: 4 for the 4-card plan or 15 for the 15-card plan. This is not an unlimited replacement guarantee. Shipping damage or defective NFC must be reported within 7 days for replacement review. Customer-input errors are not covered. See the Refund Policy for details.",
  },
];

export const FAQSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-12 md:py-16 px-4 bg-muted/30">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-6"
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

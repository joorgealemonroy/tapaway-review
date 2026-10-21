import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { STOREFRONT_FAQS } from "@/lib/storefrontFaqs";

export function FAQSection() {
  return (
    <section
      className="sf-section sf-container"
      id="faq"
      aria-labelledby="faq-heading"
    >
      <div className="sf-faq-grid">
        <div>
          <p className="sf-eyebrow">Good questions. Clear answers.</p>
          <h2 id="faq-heading" className="sf-title">
            Let's clear
            <br />a few things up.
          </h2>
          <p className="sf-copy">
            Still wondering if TapAway is right for you? Ask us. You don't need
            an account to get an answer.
          </p>
          <Link to="/support#question" className="sf-text-link">
            Talk to a real person <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Accordion type="single" collapsible>
          {STOREFRONT_FAQS.map((faq, i) => (
            <AccordionItem key={faq.question} value={`faq-${i}`}>
              <AccordionTrigger className="py-5 text-left text-[13px] font-semibold hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-[13px] leading-7 text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

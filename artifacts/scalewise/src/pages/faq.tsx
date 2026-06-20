import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What exactly is ScaleWise?",
    a: "ScaleWise is a premium marketplace connecting business owners with verified industry experts who have actually built and run businesses. We provide real, lived expertise rather than generic consulting advice."
  },
  {
    q: "Who are the experts on ScaleWise?",
    a: "Our experts are real business owners, operators, and founders—not textbook consultants. They've lived the challenges you're facing and have the scars to prove it."
  },
  {
    q: "What's the difference between Business Discovery, Consultancy, and Growth Strategy?",
    a: "Discovery is a quick pulse-check. Consultancy dives deep into a specific problem. Growth Strategy provides ongoing 3- or 6-month support to execute larger initiatives."
  },
  {
    q: "How do I book a session?",
    a: "Search for an expert by industry or challenge, pick a session type on their profile, choose an available time, and complete your booking."
  },
  {
    q: "How much does it cost?",
    a: "Experts set their own prices based on their experience. You pay per session—there are no hidden subscription fees."
  },
  {
    q: "How do I pay?",
    a: "We accept M-Pesa, Airtel Money, and all major credit/debit cards."
  },
  {
    q: "What happens after I book?",
    a: "You'll receive a confirmation with a Google Meet link and access to our messaging platform to share details with your expert before the call."
  },
  {
    q: "Can I leave a review without an account?",
    a: "Yes, reviews are open to all to ensure transparency and trust in our community."
  },
  {
    q: "How do experts apply?",
    a: "Experienced business leaders can apply through our Founding Expert program. We vet every application to ensure quality."
  },
  {
    q: "What if I need ongoing help?",
    a: "Many experts offer 3-month and 6-month Growth Strategy plans for continued mentorship and accountability."
  }
];

export default function FAQ() {
  return (
    <div className="py-24 container mx-auto px-4 max-w-3xl">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Frequently Asked Questions</h1>
        <p className="text-xl text-muted-foreground">Everything you need to know about ScaleWise.</p>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {FAQS.map((faq, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger className="text-left text-lg font-medium hover:text-primary">{faq.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground text-base leading-relaxed">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

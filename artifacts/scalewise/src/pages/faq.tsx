import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const P = {
  blue:   "#6395EE",
  mblue:  "#90B8D6",
  mgreen: "#88CFA8",
  mint:   "#85DECB",
};

const FAQ_GROUPS = [
  {
    heading: "About ScaleWise",
    color: P.blue,
    faqs: [
      {
        q: "What exactly is ScaleWise?",
        a: "ScaleWise is a premium marketplace connecting business owners with verified industry experts who have actually built and run businesses. We provide real, lived expertise rather than generic consulting advice.",
      },
      {
        q: "Who are the experts on ScaleWise?",
        a: "Our experts are real business owners, operators, and founders — not textbook consultants. They have lived the challenges you are facing and have the scars to prove it.",
      },
    ],
  },
  {
    heading: "Sessions and Booking",
    color: P.mgreen,
    faqs: [
      {
        q: "What is the difference between Business Discovery, Consultancy, and Growth Strategy?",
        a: "Discovery is a quick pulse-check. Consultancy dives deep into a specific problem. Growth Strategy provides ongoing 3 or 6 month support to execute larger initiatives.",
      },
      {
        q: "How do I book a session?",
        a: "Search for an expert by industry or challenge, pick a session type on their profile, choose an available time, and complete your booking.",
      },
      {
        q: "What happens after I book?",
        a: "You will receive a confirmation with a Google Meet link and access to our messaging platform to share details with your expert before the call.",
      },
    ],
  },
  {
    heading: "Pricing and Payments",
    color: P.mint,
    faqs: [
      {
        q: "How much does it cost?",
        a: "Experts set their own prices based on their experience. You pay per session — there are no hidden subscription fees.",
      },
      {
        q: "How do I pay?",
        a: "We accept M-Pesa, Airtel Money, and all major credit and debit cards.",
      },
    ],
  },
  {
    heading: "Reviews and Experts",
    color: P.mblue,
    faqs: [
      {
        q: "Can I leave a review without an account?",
        a: "Yes, reviews are open to all to ensure transparency and trust in our community.",
      },
      {
        q: "How do experts apply?",
        a: "Experienced business leaders can apply through our Founding Expert program. We vet every application to ensure quality.",
      },
      {
        q: "What if I need ongoing help?",
        a: "Many experts offer 3-month and 6-month Growth Strategy plans for continued mentorship and accountability.",
      },
    ],
  },
];

export default function FAQ() {
  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden py-16"
        style={{ background: `linear-gradient(135deg, ${P.blue}0A, ${P.mint}0C)` }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-10 -right-10 h-[280px] w-[280px] rounded-full opacity-[0.11] blur-[100px]" style={{ background: P.blue }} />
          <div className="absolute bottom-0 left-0 h-[220px] w-[220px] rounded-full opacity-[0.09] blur-[80px]" style={{ background: P.mint }} />
        </div>
        <div className="relative z-10 container mx-auto px-4 max-w-3xl text-center">
          <span className="inline-block rounded-full px-4 py-1.5 text-xs font-semibold mb-5" style={{ background: P.blue + "14", color: P.blue }}>
            Help Center
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Frequently Asked{" "}
            <span style={{ color: P.blue }}>Questions</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Everything you need to know about ScaleWise. Can not find what you are looking for?{" "}
            <Link href="/contact" className="underline" style={{ color: P.mgreen }}>Contact us.</Link>
          </p>
        </div>
      </div>

      {/* ── FAQ groups ── */}
      <div className="container mx-auto px-4 max-w-3xl py-16 space-y-12">
        {FAQ_GROUPS.map((group) => (
          <section key={group.heading}>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-1 w-8 rounded-full" style={{ background: group.color }} />
              <h2 className="text-xl font-bold" style={{ color: group.color }}>{group.heading}</h2>
            </div>
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: group.color + "28" }}
            >
              <Accordion type="single" collapsible className="w-full">
                {group.faqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`${group.heading}-${i}`}
                    className="border-b last:border-0"
                    style={{ borderColor: group.color + "20" }}
                  >
                    <AccordionTrigger
                      className="text-left text-base font-medium px-5 py-4 hover:no-underline"
                      style={{ ["--hover-color" as any]: group.color }}
                    >
                      <span className="hover:opacity-80 transition-opacity">{faq.q}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm leading-relaxed px-5 pb-4">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        ))}

        {/* Still have questions */}
        <div
          className="rounded-3xl p-8 text-center"
          style={{ background: P.mgreen + "0A", border: `1px solid ${P.mgreen}30` }}
        >
          <h3 className="text-xl font-bold mb-2" style={{ color: P.mgreen }}>Still have questions?</h3>
          <p className="text-muted-foreground mb-5 text-sm">Our team is happy to help with anything not covered here.</p>
          <Link href="/contact">
            <Button className="rounded-xl" style={{ background: P.mgreen, color: "#083d2e" }}>
              Contact Us →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

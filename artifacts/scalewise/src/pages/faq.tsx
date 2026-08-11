import { usePageTitle } from "@/hooks/use-page-title";
import { useState, useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const P = {
  blue:   "#6395EE",
  mblue:  "#90B8D6",
  mgreen: "#88CFA8",
  mint:   "#85DECB",
};

type FaqItem = {
  q: string;
  a: React.ReactNode;
};

type FaqSection = {
  heading: string;
  color: string;
  expertOnly?: boolean;
  faqs: FaqItem[];
};

const FAQ_SECTIONS: FaqSection[] = [
  {
    heading: "General",
    color: P.blue,
    faqs: [
      {
        q: "What is GrowPia?",
        a: "GrowPia is a platform that connects business owners with verified experts who have already solved the exact challenges you are facing. Instead of generic advice from someone who has only read about your problem, you get matched with a real business operator who has lived through it, fixed it, and is ready to walk you through it. Whether you need a quick conversation, focused problem-solving, or a long term growth plan, GrowPia puts the right person in your corner.",
      },
      {
        q: "Who are the experts at GrowPia?",
        a: "Our experts are experienced business owners, operators, and industry professionals who have spent years, often decades, building and running real businesses in their specific sectors. They are not generic consultants or theorists. They are people who have navigated the same pricing pressures, staffing challenges, slow seasons, and growth plateaus that you are facing right now. Every expert on GrowPia goes through a verification and approval process before appearing on the platform. We review their background, industry experience, and track record before approving them, so you can book with confidence knowing the person on the other side has genuinely been where you are.",
      },
      {
        q: "What is the difference between Business Discovery, Consultancy, and Growth Strategy?",
        a: "Business Discovery is for when you are not sure exactly what the problem is. You just know something is not working and you need to talk it through with someone experienced. It is an open, unstructured conversation, no agenda required. Consultancy is for when you have already identified a specific challenge and need focused, expert diagnosis and a clear action plan you can implement immediately. Growth Strategy is for business owners who are ready to commit to long term, structured support. You choose either a 3 month plan with 6 bi-weekly sessions, or a 6 month plan with 12 bi-weekly sessions, with a full strategy roadmap and accountability check-ins throughout. If you are unsure which one fits, start with Business Discovery.",
      },
      {
        q: "Is GrowPia available outside Kenya?",
        a: "Yes. Anyone can browse experts and book sessions on GrowPia. Our payment options currently support M-Pesa only, but the platform itself is open to clients and experts everywhere.",
      },
      {
        q: "Can I change the language on GrowPia?",
        a: "GrowPia is currently available in English only. Additional language support may be introduced in future updates.",
      },
      {
        q: "Are there community guidelines I should know about?",
        a: "Yes. GrowPia has both Community Guidelines for all users and Expert Standards specifically for experts. These cover expected conduct, platform policies, and what happens if they are violated. Links to both are available in the footer.",
      },
    ],
  },
  {
    heading: "Booking & Sessions",
    color: P.mgreen,
    faqs: [
      {
        q: "How do I book a session?",
        a: "Search or browse experts by industry, select the expert that fits your needs, choose your session type (Business Discovery, Consultancy, or Growth Strategy), pick an available time slot from the expert's calendar, and complete payment via M-Pesa. Your booking is instantly confirmed once payment is processed.",
      },
      {
        q: "What happens after I book?",
        a: "Immediately after payment, you will receive a confirmation email containing your session date, time, Google Meet link, and your expert's name. Your booking will also appear in your Client Dashboard under Upcoming Sessions. You can message your expert directly through your inbox from this point onward.",
      },
      {
        q: "How will I know my booking is confirmed?",
        a: "Your booking is confirmed the moment your M-Pesa payment is successfully processed. You will receive an instant confirmation email with your Google Meet link and session details. No additional approval from the expert is required for the booking to be valid. Separately, you will also see an Acknowledged status on your booking once your expert has confirmed they have seen and accepted the booking. This is a courtesy confirmation and does not affect your booking's confirmed status.",
      },
      {
        q: "How much does it cost?",
        a: "Session pricing varies by expert and session type. Each expert sets their own rate based on their experience and the value they bring. You will always see the full price clearly on the expert's profile before you book, with no hidden fees or surprises.",
      },
      {
        q: "How do I pay?",
        a: "GrowPia currently accepts M-Pesa only. After selecting your session and time slot, you will receive an M-Pesa STK push prompt on your phone to complete payment. Your booking is only confirmed once payment is successfully completed. No booking record exists in the system until payment goes through.",
      },
      {
        q: "What if I need ongoing help?",
        a: "Growth Strategy is built exactly for this. Choose either a 3 month plan with 6 bi-weekly sessions, or a 6 month plan with 12 bi-weekly sessions, giving you structured long term engagement with your expert including a full strategy roadmap and regular accountability check-ins. You can also continue messaging your expert through the platform inbox at any time after your sessions.",
      },
      {
        q: "Can someone else join my session with me?",
        a: "Yes. Since sessions happen over Google Meet, you can share your meeting link with a co-founder, business partner, or team member before the session starts.",
      },
      {
        q: "Can I sync my upcoming sessions with my calendar?",
        a: "Calendar sync is not yet available but is on our roadmap. In the meantime, your upcoming sessions, Google Meet link, and session details are always accessible in your Client Dashboard.",
      },
      {
        q: "Does GrowPia support screen sharing during a session?",
        a: "Yes. Since all sessions are conducted over Google Meet, both you and your expert can share your screen at any point during the call, just as you would in any standard Google Meet session.",
      },
      {
        q: "Can I conduct sessions outside of Google Meet?",
        a: "No. All GrowPia sessions must be conducted through the Google Meet link provided by the platform after booking. Conducting sessions outside of GrowPia, whether by phone, WhatsApp, another video platform, or in person, is a violation of our platform policy. If you choose to arrange a session outside GrowPia, the platform accepts no responsibility for any complaints, disputes, or refund requests that arise.",
      },
    ],
  },
  {
    heading: "Cancellations, Refunds & Rescheduling",
    color: P.mint,
    faqs: [
      {
        q: "What happens to my payment if a session is cancelled?",
        a: (
          <>
            This depends on who cancels and when. Please refer to our full{" "}
            <Link href="/refund-policy" className="underline font-medium" style={{ color: P.blue }}>
              Cancellation and Refund Policy
            </Link>{" "}
            page for the exact details of every scenario.
          </>
        ),
      },
      {
        q: "What is the refund timeline?",
        a: "Approved refunds are processed within 72 business hours. If you have not received your refund within that time, please contact us directly through the Contact page and we will investigate immediately.",
      },
      {
        q: "Can I reschedule a session?",
        a: "Yes, subject to the following rules. You cannot reschedule a session that starts within 24 hours. You may reschedule the same booking a maximum of 3 times. After 3 reschedules, only cancellation is available. Rescheduling does not reset your refund window. See our Cancellation and Refund Policy for full details.",
      },
      {
        q: "What happens if I do not show up for my session?",
        a: (
          <>
            If you do not join the session within 15 minutes of the scheduled start time and have not messaged your expert or our team in advance, the session is marked as a no-show. Please refer to our{" "}
            <Link href="/refund-policy" className="underline font-medium" style={{ color: P.blue }}>
              Cancellation and Refund Policy
            </Link>{" "}
            page for the refund details that apply in this scenario. If you know you will be late, message your expert through the platform inbox before the session starts.
          </>
        ),
      },
      {
        q: "What happens if my expert cancels?",
        a: "If your expert cancels for any reason, including cancelling a rescheduled session, you will receive a full 100% refund automatically. No questions asked.",
      },
      {
        q: "What should I do if my M-Pesa payment fails?",
        a: (
          <>
            Double check your M-Pesa number and ensure you have sufficient balance, then try again. If the issue persists,{" "}
            <Link href="/contact" className="underline font-medium" style={{ color: P.blue }}>
              contact us
            </Link>{" "}
            directly and we will help resolve it.
          </>
        ),
      },
    ],
  },
  {
    heading: "Your Account & Privacy",
    color: P.mblue,
    faqs: [
      {
        q: "Is my contact information kept private?",
        a: "Yes. Clients and experts communicate entirely through GrowPia's built-in messaging system. Your personal email address and phone number are never shared with the other party at any point.",
      },
      {
        q: "Are GrowPia sessions private and confidential?",
        a: "Yes. Sessions are between you and your expert only, unless you choose to invite someone else via the Google Meet link. GrowPia does not record or monitor session content.",
      },
      {
        q: "How do I edit or update my basic information?",
        a: "Go to Account Settings to update your name, email, password, and profile details at any time.",
      },
      {
        q: "How do I change my password?",
        a: "In Account Settings, select Change Password and follow the prompts. You may be asked to verify your current password before setting a new one.",
      },
      {
        q: "How do I change my profile picture?",
        a: "Go to Account Settings, click your current profile photo, and upload a new image. Square images of at least 400 by 400 pixels work best.",
      },
      {
        q: "How do I delete my account?",
        a: (
          <>
            Contact our support team directly through the{" "}
            <Link href="/contact" className="underline font-medium" style={{ color: P.blue }}>
              Contact page
            </Link>{" "}
            and we will process your account deletion request. Note that deleting your account is permanent and cannot be undone.
          </>
        ),
      },
      {
        q: "How do I update my email address?",
        a: "Go to Account Settings and update your email address there. You may be asked to verify the new address before the change takes effect.",
      },
    ],
  },
  {
    heading: "Reviews",
    color: P.mgreen,
    faqs: [
      {
        q: "How do I leave a review?",
        a: "After a session is completed, you will see a Leave a Review option in your Client Dashboard. Verified reviews tied to a real completed booking are shown on the expert's profile and help other business owners make informed decisions. You can also leave a general platform review from the Reviews section on the homepage, open to anyone without login.",
      },
      {
        q: "Can I edit or delete my review?",
        a: (
          <>
            To request an edit or removal of a review you have submitted, contact our support team directly through the{" "}
            <Link href="/contact" className="underline font-medium" style={{ color: P.blue }}>
              Contact page
            </Link>. We review these requests individually.
          </>
        ),
      },
    ],
  },
  {
    heading: "Client Account",
    color: P.blue,
    faqs: [
      {
        q: "How do I send a message through my inbox?",
        a: "Once you have booked a session with an expert, a direct messaging thread opens between you automatically. You will find it in your Inbox, accessible from your Client Dashboard. This thread remains permanently available and visible, even after your session ends.",
      },
      {
        q: "Do messages with my expert ever disappear?",
        a: "No. Once you have booked a session with an expert, your full conversation history and messaging thread remain permanently visible in your Inbox. Nothing disappears after a session ends.",
      },
      {
        q: "What if I cannot find the right expert for my industry?",
        a: (
          <>
            We are actively onboarding new verified experts across all 13 industries. If you do not see the right fit yet,{" "}
            <Link href="/contact" className="underline font-medium" style={{ color: P.blue }}>
              contact us
            </Link>{" "}
            directly and we will help connect you, or notify you when a matching expert joins the platform.
          </>
        ),
      },
      {
        q: "How do I share an expert's profile with others?",
        a: "On any expert's profile page, use the share option to copy a direct link you can send to a colleague or business partner.",
      },
      {
        q: "Where can I find experts I have saved?",
        a: "Go to your Client Dashboard and click Saved Experts to see everyone you have bookmarked. You can save an expert by clicking the bookmark or heart icon on their profile or card.",
      },
      {
        q: "How do I get a receipt for my session?",
        a: "A receipt is automatically generated after every successful payment. You can view, download, and print it from your Client Dashboard under your booking history at any time.",
      },
      {
        q: "How do I prepare for my session?",
        a: "Before your session, think through what you want to walk away with. If you are booking a Consultancy or Growth Strategy session, write down the specific problem or goal beforehand so you can use your time efficiently. If you are not sure what the issue is, that is exactly what Business Discovery is for, just show up honestly and the conversation will guide itself.",
      },
    ],
  },
  {
    heading: "Expert Application",
    color: P.mint,
    faqs: [
      {
        q: "How do experts apply?",
        a: (
          <>
            Experienced business owners and operators can apply to become a GrowPia expert by filling out our expert application form, available on the{" "}
            <Link href="/apply" className="underline font-medium" style={{ color: P.blue }}>
              Become an Expert
            </Link>{" "}
            page. The form collects your name, email, industry, and years of experience. Our admin team reviews every application and you will be notified by email once a decision has been made. Approved experts are then guided through profile setup before going live on the platform.
          </>
        ),
      },
    ],
  },
  {
    heading: "Expert Dashboard & Earnings",
    color: P.mgreen,
    expertOnly: true,
    faqs: [
      {
        q: "How do I acknowledge a booking?",
        a: "When a client books a session with you, it will appear in your Expert Dashboard under Incoming Bookings with a yellow Acknowledge button. Click it to confirm you have seen the booking. You will have the option to add a short personal message to the client, such as Looking forward to our session, before confirming. Once acknowledged, the booking status updates to Acknowledged, visible to both the client and the admin. Note that the booking is already confirmed the moment the client pays. Your acknowledgment is a trust and communication step, not a gate.",
      },
      {
        q: "How do I change my session rates?",
        a: "Go to your Expert Dashboard, select Profile Settings, and update your pricing for any of your session types at any time. Changes take effect immediately for new bookings.",
      },
      {
        q: "How and when do I get paid?",
        a: "GrowPia processes expert payouts manually via direct bank transfer. Your Expert Dashboard shows your current pending balance, commission deducted, and full payment history. You will be notified once a payout has been marked as paid by our admin team.",
      },
      {
        q: "What can I see in my Expert Dashboard?",
        a: "Your upcoming and completed sessions, total earnings to date, commission paid to GrowPia, pending payout balance, incoming booking requests with the acknowledge button, your availability calendar, and your permanent inbox for messaging clients and the GrowPia admin team.",
      },
      {
        q: "How do I set my availability?",
        a: "In your Expert Dashboard, use the availability calendar to set your open time slots in 1 hour blocks on a weekly basis, or set your availability on a long term recurring schedule if you prefer not to update it every week. Your available slots display live on your public profile for clients to book directly. If you submit your availability on a weekly basis, you will receive email reminders on the Friday, Saturday, and Sunday before the new week begins if you have not yet set your availability for that week. Once you submit, reminders stop until the following week.",
      },
      {
        q: "What is the Available for new bookings toggle?",
        a: "In your Expert Dashboard, you can switch this toggle off at any time to pause new bookings, for example if you are on leave or fully booked. When switched off, you will not appear in search results until you switch it back on. This does not affect existing confirmed bookings.",
      },
      {
        q: "How do I get notified of new booking requests?",
        a: "You will receive an email notification and see new bookings appear in your Expert Dashboard under Incoming Bookings with the yellow Acknowledge button.",
      },
      {
        q: "How much should I charge for my time?",
        a: "That is entirely your decision. Consider your years of experience, the depth of the problems you solve, and what reflects the real value of your knowledge. You can always adjust your rate at any time from your Expert Dashboard.",
      },
      {
        q: "How can I best prepare for a session?",
        a: "Review any notes or information the client shared when booking. Come ready to listen first before advising. The most valuable sessions on GrowPia feel like a real, honest conversation between two people who both want the same outcome, not a lecture.",
      },
      {
        q: "How do I create a strong profile?",
        a: "Be specific. Instead of saying I help businesses grow, say I grew a restaurant from one location to five over four years. Specific, real experiences build far more trust than broad claims. Use your long bio to tell your actual story, and your short bio to capture the single most compelling thing about your background.",
      },
      {
        q: "How do I promote my GrowPia profile?",
        a: "Share your profile link on your social media, with past clients, or anywhere you already talk about your business expertise. Every completed session and every verified review you earn also improves your visibility on the platform naturally over time.",
      },
      {
        q: "What is the ideal size for my profile photo?",
        a: "A square image, at least 400 by 400 pixels, with good lighting and a clear view of your face works best. Avoid logos, group photos, or heavily filtered images.",
      },
      {
        q: "How does the commission structure work?",
        a: "GrowPia takes a 20% commission on Business Discovery and Consultancy sessions, and 15% on Growth Strategy sessions. You keep the remainder. Commission is deducted before your payout is calculated, and you can see the exact breakdown for every session in your Expert Dashboard.",
      },
      {
        q: "How long can my bio be?",
        a: "You have two bio fields. The Short Bio is limited to 150 characters and appears on your expert card in search results. The Long Bio is limited to 800 characters and appears on your full profile page. Both fields have a live character counter as you type.",
      },
      {
        q: "What happens if I cancel a session?",
        a: "If you cancel a confirmed session for any reason, the client receives a full 100% refund automatically. This also applies to rescheduled sessions you cancel. Repeated cancellations may affect your standing on the platform and could result in account review.",
      },
      {
        q: "What are GrowPia expert standards?",
        a: "Every expert on GrowPia is expected to maintain honest and accurate profile information, acknowledge bookings promptly, show up on time for every confirmed session, and conduct all sessions through the platform's provided Google Meet link. Taking sessions outside the GrowPia platform is strictly prohibited. If a client and expert arrange a session outside GrowPia, the platform accepts no responsibility for any complaints, disputes, or refund requests. For experts found conducting off-platform sessions or soliciting clients to bypass the platform, consequences include immediate account suspension, permanent loss of commission protection, and ineligibility for any refund or dispute resolution support from GrowPia. Repeated cancellations, no-shows, or unprofessional conduct may also result in account suspension or removal from the platform.",
      },
    ],
  },
  {
    heading: "Troubleshooting & Support",
    color: P.mblue,
    faqs: [
      {
        q: "Why do I see an empty state instead of experts or reviews?",
        a: (
          <>
            GrowPia is in its early stages and we are carefully onboarding our first verified experts. We would rather show you an honest empty state than populate the platform with fake profiles or fabricated reviews. Real experts and real reviews are on their way. In the meantime, if you are an experienced business owner or operator, consider{" "}
            <Link href="/apply" className="underline font-medium" style={{ color: P.blue }}>
              applying as a Founding Expert
            </Link>.
          </>
        ),
      },
      {
        q: "What happens if a session is marked as a no-show?",
        a: (
          <>
            A no-show is recorded when a client does not join the session within 15 minutes of the scheduled start time and has not contacted the expert or the GrowPia team in advance. Please refer to our{" "}
            <Link href="/refund-policy" className="underline font-medium" style={{ color: P.blue }}>
              Cancellation and Refund Policy
            </Link>{" "}
            page for what this means for your booking.
          </>
        ),
      },
      {
        q: "How do I cancel or reschedule a session?",
        a: (
          <>
            You can cancel or request a reschedule from your Dashboard, or directly from the reminder emails you receive 48 hours, 24 hours, and 1 hour before your session. Please refer to our{" "}
            <Link href="/refund-policy" className="underline font-medium" style={{ color: P.blue }}>
              Cancellation and Refund Policy
            </Link>{" "}
            page for full details on what applies in each scenario.
          </>
        ),
      },
    ],
  },
];

function getAnswerText(a: React.ReactNode): string {
  if (typeof a === "string") return a;
  if (Array.isArray(a)) return a.map(getAnswerText).join(" ");
  if (a && typeof a === "object" && "props" in (a as object)) {
    const props = (a as { props: Record<string, unknown> }).props;
    return getAnswerText(props.children as React.ReactNode);
  }
  return "";
}

export default function FAQ() {
  usePageTitle("FAQ — GrowPia");
  const { user } = useAuth();
  const isExpert = user?.role === "expert";
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_SECTIONS
      .filter((s) => !s.expertOnly || isExpert)
      .map((section) => ({
        ...section,
        faqs: q
          ? section.faqs.filter(
              (faq) =>
                faq.q.toLowerCase().includes(q) ||
                getAnswerText(faq.a).toLowerCase().includes(q)
            )
          : section.faqs,
      }))
      .filter((s) => s.faqs.length > 0);
  }, [query, isExpert]);

  const totalResults = filtered.reduce((acc, s) => acc + s.faqs.length, 0);

  return (
    <div className="min-h-screen">

      {/* Hero */}
      <div
        className="relative overflow-hidden py-10"
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
          <p className="text-xl text-muted-foreground mb-8">
            Everything you need to know about GrowPia. Can't find what you are looking for?{" "}
            <Link href="/contact" className="underline" style={{ color: P.mgreen }}>Contact us.</Link>
          </p>

          {/* Search bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions…"
              className="pl-10 h-12 rounded-xl text-base border-2 focus-visible:ring-0"
              style={{ borderColor: query ? P.blue + "60" : undefined }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {query && (
            <p className="mt-3 text-sm text-muted-foreground">
              {totalResults === 0
                ? "No questions match your search."
                : `${totalResults} question${totalResults === 1 ? "" : "s"} found`}
            </p>
          )}
        </div>
      </div>

      {/* FAQ sections */}
      <div className="container mx-auto px-4 max-w-3xl py-10 space-y-8">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium mb-2">No results found</p>
            <p className="text-sm">Try a different search term or <Link href="/contact" className="underline" style={{ color: P.mgreen }}>contact us</Link> directly.</p>
          </div>
        )}

        {filtered.map((section) => (
          <section key={section.heading}>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-1 w-8 rounded-full" style={{ background: section.color }} />
              <h2 className="text-xl font-bold" style={{ color: section.color }}>
                {section.heading}
                {section.expertOnly && (
                  <span className="ml-2 text-xs font-semibold rounded-full px-2 py-0.5 align-middle" style={{ background: section.color + "18", color: section.color }}>
                    Experts only
                  </span>
                )}
              </h2>
            </div>
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: section.color + "28" }}
            >
              <Accordion type="single" collapsible className="w-full">
                {section.faqs.map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`${section.heading}-${i}`}
                    className="border-b last:border-0"
                    style={{ borderColor: section.color + "20" }}
                  >
                    <AccordionTrigger className="text-left text-base font-medium px-5 py-4 hover:no-underline">
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
        {filtered.length > 0 && (
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
        )}
      </div>
    </div>
  );
}

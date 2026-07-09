import { Link } from "wouter";

const P = {
  blue:   "#6395EE",
  mblue:  "#90B8D6",
  mgreen: "#88CFA8",
  mint:   "#85DECB",
};

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-1 w-8 rounded-full flex-shrink-0" style={{ background: color }} />
        <h2 className="text-xl font-bold" style={{ color }}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PolicyCard({ scenario, client, expert, platform, note }: {
  scenario: string;
  client: string;
  expert: string;
  platform: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border p-5 mb-4" style={{ borderColor: P.blue + "20" }}>
      <p className="font-semibold text-sm mb-3 text-foreground">{scenario}</p>
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div className="rounded-xl py-3 px-2" style={{ background: P.mgreen + "15" }}>
          <div className="text-xs text-muted-foreground mb-1">Client receives</div>
          <div className="font-bold text-base" style={{ color: P.mgreen }}>{client}</div>
        </div>
        <div className="rounded-xl py-3 px-2" style={{ background: P.blue + "10" }}>
          <div className="text-xs text-muted-foreground mb-1">Expert receives</div>
          <div className="font-bold text-base" style={{ color: P.blue }}>{expert}</div>
        </div>
        <div className="rounded-xl py-3 px-2" style={{ background: P.mblue + "15" }}>
          <div className="text-xs text-muted-foreground mb-1">Platform keeps</div>
          <div className="font-bold text-base" style={{ color: P.mblue }}>{platform}</div>
        </div>
      </div>
      {note && <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{note}</p>}
    </div>
  );
}

export default function RefundPolicy() {
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
            Platform Policy
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Cancellation &{" "}
            <span style={{ color: P.blue }}>Refund Policy</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Clear, automatic, and fair — every scenario is handled the same way for everyone.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 max-w-3xl py-10">

        <Section title="Cancellation Outcomes" color={P.blue}>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Every cancellation is handled automatically by the platform. Refund amounts are calculated immediately based on who cancels and when, relative to the session start time. No manual negotiation is required.
          </p>

          <PolicyCard
            scenario="Client cancels more than 24 hours before session start"
            client="100% refund"
            expert="Nothing"
            platform="Nothing"
            note="Full refund, no questions asked. Cancel at least 24 hours in advance to receive your full payment back."
          />

          <PolicyCard
            scenario="Client cancels less than 24 hours before session start"
            client="75% refund"
            expert="20% compensation"
            platform="5%"
            note="The expert reserved the time for you and prepared for your session. 20% of the session fee is paid to them as compensation for the reserved slot."
          />

          <PolicyCard
            scenario="Client no-show (does not join within 15 minutes, no prior contact)"
            client="50% refund"
            expert="35% compensation"
            platform="15%"
            note="A no-show is recorded when you do not join within 15 minutes of the scheduled start time and have not contacted your expert or our team in advance. If you know you will be late, message your expert through the platform inbox before the session starts."
          />

          <PolicyCard
            scenario="Expert cancels for any reason"
            client="100% refund"
            expert="Nothing"
            platform="Nothing"
            note="If your expert cancels for any reason — including cancelling a rescheduled session — you receive a full 100% refund automatically. No questions asked."
          />
        </Section>

        <Section title="Rescheduling Rules" color={P.mgreen}>
          <div className="rounded-2xl border p-6 space-y-4 text-sm text-muted-foreground leading-relaxed" style={{ borderColor: P.mgreen + "28" }}>
            <div className="flex gap-3">
              <span className="font-bold text-foreground flex-shrink-0">24-hour lockout</span>
              <span>You cannot reschedule a session that starts within 24 hours. This window matches the late-cancellation policy — if rescheduling within 24 hours were allowed, it could be used to reset the refund clock before cancelling.</span>
            </div>
            <div className="w-full h-px" style={{ background: P.mgreen + "25" }} />
            <div className="flex gap-3">
              <span className="font-bold text-foreground flex-shrink-0">Maximum 3 reschedules</span>
              <span>Each booking may be rescheduled a maximum of 3 times. After 3 reschedules, only cancellation is available for that booking.</span>
            </div>
            <div className="w-full h-px" style={{ background: P.mgreen + "25" }} />
            <div className="flex gap-3">
              <span className="font-bold text-foreground flex-shrink-0">Refund anchor rule</span>
              <span>If you reschedule a session and then cancel it, the refund tier is calculated from the earliest known session time — not the most recent rescheduled time. This means rescheduling does not reset your refund window.</span>
            </div>
            <div className="w-full h-px" style={{ background: P.mgreen + "25" }} />
            <div className="flex gap-3">
              <span className="font-bold text-foreground flex-shrink-0">How to reschedule</span>
              <span>You can reschedule from your Client Dashboard or directly from the reminder emails sent 48 hours, 24 hours, and 1 hour before your session.</span>
            </div>
          </div>
        </Section>

        <Section title="Refund Timeline" color={P.mint}>
          <div className="rounded-2xl border p-6 text-sm text-muted-foreground leading-relaxed" style={{ borderColor: P.mint + "40" }}>
            <p className="mb-3">
              Refunds are processed manually via M-Pesa reversal or direct transfer. Your refund will be processed within <strong className="text-foreground">72 business hours</strong> of the cancellation or no-show being recorded.
            </p>
            <p>
              If you have not received your refund within 72 business hours, please{" "}
              <Link href="/contact" className="underline font-medium" style={{ color: P.blue }}>
                contact us through the Contact page
              </Link>{" "}
              and we will investigate immediately.
            </p>
          </div>
        </Section>

        <Section title="No-Show Process" color={P.mblue}>
          <div className="rounded-2xl border p-6 text-sm text-muted-foreground leading-relaxed space-y-3" style={{ borderColor: P.mblue + "30" }}>
            <p>
              A session is eligible to be marked as a no-show when a client does not join within 15 minutes of the scheduled start time and has not contacted the expert or our team in advance.
            </p>
            <p>
              Experts have a <strong className="text-foreground">Mark as No-Show</strong> button that becomes available exactly 15 minutes after the session start time. Clicking it triggers the automatic no-show refund split immediately.
            </p>
            <p>
              If you know you will be late or need to cancel last minute, always message your expert through the platform inbox before the session start time.
            </p>
          </div>
        </Section>

        <Section title="Expert Cancellation Standards" color={P.mgreen}>
          <div className="rounded-2xl border p-6 text-sm text-muted-foreground leading-relaxed" style={{ borderColor: P.mgreen + "28" }}>
            <p className="mb-3">
              Every expert on ScaleWise commits to showing up for every confirmed session. If an expert cancels:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>The client receives a full 100% refund automatically.</li>
              <li>The expert receives no compensation for the cancelled session.</li>
              <li>Repeated cancellations may result in account review or removal from the platform.</li>
            </ul>
          </div>
        </Section>

        <div
          className="rounded-3xl p-8 text-center"
          style={{ background: P.mgreen + "0A", border: `1px solid ${P.mgreen}30` }}
        >
          <h3 className="text-xl font-bold mb-2" style={{ color: P.mgreen }}>Still have questions?</h3>
          <p className="text-muted-foreground mb-5 text-sm">Our team is happy to help clarify any scenario not covered here.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/contact">
              <button className="rounded-xl px-5 py-2.5 text-sm font-semibold" style={{ background: P.mgreen, color: "#083d2e" }}>
                Contact Us →
              </button>
            </Link>
            <Link href="/faq">
              <button className="rounded-xl px-5 py-2.5 text-sm font-semibold border" style={{ borderColor: P.blue + "40", color: P.blue }}>
                Read the FAQ
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

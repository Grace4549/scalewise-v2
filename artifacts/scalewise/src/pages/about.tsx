import { Button } from "@/components/ui/button";
import { Link } from "wouter";

const P = {
  blue:   "#6395EE",
  mblue:  "#90B8D6",
  mgreen: "#88CFA8",
  mint:   "#85DECB",
};

const SECTIONS = [
  {
    title: "Our Story",
    color: P.blue,
    body: "Running a business is incredibly lonely. When you hit a wall — whether it is managing cash flow, dealing with staff turnover, or figuring out how to scale without breaking — you do not need a textbook theory. You need someone who has stared at the exact same ceiling, worried about the exact same things, and found a way through.",
  },
  {
    title: "Our Mission",
    color: P.mgreen,
    body: "To connect ambitious business owners with real, lived expertise, turning hard-earned lessons into actionable growth. No jargon. No retainers. Just honest conversations with people who have been exactly where you are.",
  },
  {
    title: "For Business Owners",
    color: P.mint,
    body: "You get direct access to seasoned founders and operators. No long-term contracts unless you want them. Just book a session, ask your hardest questions, and get real answers from people who have been in the trenches.",
  },
  {
    title: "For Experts",
    color: P.mblue,
    body: "Your scars and successes have value. ScaleWise gives you a platform to monetize your experience on your own terms, helping the next generation of businesses succeed while building a meaningful second revenue stream.",
  },
];

export default function About() {
  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden py-20" style={{ background: `linear-gradient(135deg, ${P.mgreen}0A, ${P.blue}0C)` }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 right-0 h-[320px] w-[320px] rounded-full opacity-[0.11] blur-[110px]" style={{ background: P.mgreen }} />
          <div className="absolute bottom-0 left-10 h-[250px] w-[250px] rounded-full opacity-[0.09] blur-[90px]" style={{ background: P.blue }} />
        </div>
        <div className="relative z-10 container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block rounded-full px-4 py-1.5 text-xs font-semibold mb-5" style={{ background: P.mgreen + "15", color: P.mgreen }}>
                Our Purpose
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight mb-5 text-foreground">
                Built Because Business Owners Deserve{" "}
                <span style={{ color: P.blue }}>Better Than Guesswork</span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                ScaleWise is not another consulting firm. It is the partner you wish you had — one who has already been exactly where you are, and is one call away.
              </p>
              <div className="flex gap-3 mt-8">
                <Link href="/experts">
                  <Button className="rounded-xl" style={{ background: P.mgreen, color: "#083d2e" }}>Browse Experts</Button>
                </Link>
                <Link href="/apply-expert">
                  <Button variant="outline" className="rounded-xl">Become an Expert</Button>
                </Link>
              </div>
            </div>
            <div className="hidden md:block relative rounded-3xl overflow-hidden shadow-2xl aspect-[4/3]">
              <img
                src="/photos/about-hero.png"
                alt="Entrepreneurs collaborating in a modern workspace"
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 rounded-3xl" style={{ background: `linear-gradient(to bottom left, ${P.mgreen}20, transparent 60%)` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Story sections ── */}
      <div className="container mx-auto px-4 max-w-4xl py-20">
        <div className="space-y-12 text-lg leading-relaxed">
          {SECTIONS.map((s) => (
            <section
              key={s.title}
              className="rounded-3xl border p-8"
              style={{ borderColor: s.color + "30", background: s.color + "06" }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-1 w-8 rounded-full" style={{ background: s.color }} />
                <h2 className="text-2xl font-bold" style={{ color: s.color }}>{s.title}</h2>
              </div>
              <p className="text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>

        {/* ── Quote card ── */}
        <div
          className="mt-16 rounded-3xl p-10 text-center"
          style={{ background: `linear-gradient(135deg, ${P.blue}0A, ${P.mgreen}0D)`, border: `1px solid ${P.blue}28` }}
        >
          <div className="text-5xl mb-6">✨</div>
          <h3 className="text-2xl md:text-3xl font-bold mb-5 text-foreground">
            "You are not alone in this.{" "}
            <span style={{ color: P.blue }}>Not anymore.</span>"
          </h3>
          <div>
            <p className="font-semibold text-foreground">Grace Kihonge</p>
            <p className="text-muted-foreground text-sm">Founder & CEO, ScaleWise</p>
          </div>
        </div>

        {/* ── Story photo ── */}
        <div className="mt-14 rounded-3xl overflow-hidden shadow-xl relative">
          <img
            src="/photos/about-story.png"
            alt="Business coaching moment"
            className="w-full object-cover"
            style={{ maxHeight: 320 }}
            loading="lazy"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(26,37,64,0.3) 0%, transparent 50%)" }} />
        </div>
      </div>
    </div>
  );
}

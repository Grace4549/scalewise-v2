import { usePageTitle } from "@/hooks/use-page-title";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";

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
    body: "Your scars and successes have value. GrowPia gives you a platform to monetize your experience on your own terms, helping the next generation of businesses succeed while building a meaningful second revenue stream.",
  },
];

function BeforeAfterImage({ wide = false }: { wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [shimmer, setShimmer] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setShimmer(true), 600);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <div
      ref={ref}
      className="relative rounded-3xl overflow-hidden shadow-xl"
      style={wide ? { height: 320 } : { aspectRatio: "4/3" }}
    >
      {/* ── LEFT: Before ── */}
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{
          width: "50%",
          transition: "opacity 0.9s ease",
          opacity: visible ? 1 : 0,
        }}
      >
        <img
          src="/photos/about-before.png"
          alt="Business owner overwhelmed, alone with paperwork"
          className="w-full h-full object-cover object-center"
          style={{
            filter: "saturate(0.22) brightness(0.88) contrast(1.05)",
            transform: "scale(1.04)",
          }}
          loading="eager"
        />
        {/* dark-left vignette */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(0,0,0,0.22) 0%, transparent 80%)" }}
        />
        {/* label */}
        <div
          className="absolute bottom-4 left-4 rounded-xl px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm"
          style={{
            background: "rgba(0,0,0,0.38)",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.6s ease 0.8s, transform 0.6s ease 0.8s",
          }}
        >
          Before
        </div>
      </div>

      {/* ── RIGHT: After ── */}
      <div
        className="absolute inset-y-0 right-0 overflow-hidden"
        style={{
          width: "50%",
          transition: "opacity 0.9s ease 0.15s",
          opacity: visible ? 1 : 0,
        }}
      >
        <img
          src="/photos/about-after.png"
          alt="Business owner confident, engaged on a video call"
          className="w-full h-full object-cover object-center"
          style={{
            filter: "saturate(1.12) brightness(1.04)",
            transform: "scale(1.04)",
          }}
          loading="eager"
        />
        {/* brand-tinted overlay */}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to left, ${P.mgreen}28 0%, transparent 70%)` }}
        />
        {/* label */}
        <div
          className="absolute bottom-4 right-4 rounded-xl px-3 py-1.5 text-xs font-semibold backdrop-blur-sm"
          style={{
            background: P.mgreen + "CC",
            color: "#083d2e",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.6s ease 0.9s, transform 0.6s ease 0.9s",
          }}
        >
          After
        </div>
      </div>

      {/* ── DIVIDER ── */}
      <div
        className="absolute inset-y-0 pointer-events-none"
        style={{
          left: "calc(50% - 2px)",
          width: "4px",
          background: "rgba(255,255,255,0.55)",
          transition: "opacity 0.6s ease 0.4s",
          opacity: visible ? 1 : 0,
        }}
      >
        {/* shimmer wipe animation */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "-8px",
            width: "20px",
            height: "100%",
            background: `linear-gradient(to bottom, transparent 0%, ${P.mint}CC 30%, white 50%, ${P.mgreen}BB 70%, transparent 100%)`,
            animation: shimmer ? "dividerWipe 2.4s ease-in-out forwards" : "none",
          }}
        />
        {/* circle icon at center */}
        <div
          className="absolute rounded-full border-2 border-white flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: `linear-gradient(135deg, ${P.mgreen}, ${P.blue})`,
            boxShadow: `0 0 0 4px rgba(255,255,255,0.35), 0 0 16px ${P.mgreen}88`,
            opacity: visible ? 1 : 0,
            transition: "opacity 0.5s ease 0.7s",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 6h6M7 4l2 2-2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* gradient overlay blending the two halves at join */}
      <div
        className="absolute inset-y-0 pointer-events-none"
        style={{
          left: "calc(50% - 24px)",
          width: "48px",
          background: "linear-gradient(to right, rgba(0,0,0,0.08) 0%, rgba(255,255,255,0.12) 50%, rgba(0,0,0,0.06) 100%)",
        }}
      />

      <style>{`
        @keyframes dividerWipe {
          0%   { transform: translateY(-100%); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function About() {
  usePageTitle("About Us — GrowPia");
  return (
    <div className="min-h-screen">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden py-12" style={{ background: `linear-gradient(135deg, ${P.mgreen}0A, ${P.blue}0C)` }}>
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
                GrowPia is not another consulting firm. It is the partner you wish you had — one who has already been exactly where you are, and is one call away.
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
      <div className="container mx-auto px-4 max-w-4xl py-12">
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
            "We built GrowPia because brilliant ideas deserve brilliant counsel. Our promise is simple: bring you the right expert, at the right moment, for the decisions that matter most."
          </h3>
          <div>
            <p className="font-semibold text-foreground">Grace Kihonge</p>
            <p className="text-muted-foreground text-sm">Founder & CEO, GrowPia</p>
          </div>
        </div>

        {/* ── Story before/after image ── */}
        <div className="mt-14">
          <BeforeAfterImage wide />
        </div>
      </div>
    </div>
  );
}

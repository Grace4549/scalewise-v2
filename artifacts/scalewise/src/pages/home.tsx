import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListExperts, useListReviews, useGetMe } from "@workspace/api-client-react";
import { ExpertCard } from "@/components/expert-card";
import { ChevronLeft, ChevronRight, Search, Clock, Star } from "lucide-react";

// ── Brand palette ──────────────────────────────────────────────
const P = {
  blue:   "#6395EE",
  mblue:  "#90B8D6",
  mgreen: "#88CFA8",
  mint:   "#85DECB",
};

// ── Industries with distinct icons + colours ───────────────────
const INDUSTRIES = [
  { name: "Agriculture & Agribusiness",  icon: "🌾", color: P.mgreen },
  { name: "Beauty & Salons",             icon: "💄", color: P.mblue  },
  { name: "Construction & Contracting",  icon: "🏗️",  color: P.blue   },
  { name: "Education & Training",        icon: "📚", color: P.mint   },
  { name: "E-commerce & Retail",         icon: "🛍️",  color: P.mgreen },
  { name: "Financial Services",          icon: "💰", color: P.blue   },
  { name: "Healthcare & Clinics",        icon: "🏥", color: P.mblue  },
  { name: "Hospitality & Tourism",       icon: "🌴", color: P.mint   },
  { name: "Logistics & Transport",       icon: "🚛", color: P.blue   },
  { name: "Manufacturing & SMEs",        icon: "⚙️",  color: P.mgreen },
  { name: "Real Estate",                 icon: "🏘️",  color: P.mblue  },
  { name: "Restaurants & Food Business", icon: "🍽️",  color: P.mint   },
  { name: "Tech Startups",               icon: "💻", color: P.blue   },
];

const HOW_IT_WORKS = [
  {
    step: "01", color: P.blue,   bg: "rgba(99,149,238,0.07)",   border: "rgba(99,149,238,0.18)",
    title: "Describe your challenge",
    desc:  "Tell us what is keeping you up at night. Pricing, growth, staff, operations — any of it.",
  },
  {
    step: "02", color: P.mblue,  bg: "rgba(144,184,214,0.09)",  border: "rgba(144,184,214,0.22)",
    title: "Browse matched experts",
    desc:  "Filter by industry and session type. Every expert is vetted and approved by our team.",
  },
  {
    step: "03", color: P.mgreen, bg: "rgba(136,207,168,0.09)",  border: "rgba(136,207,168,0.22)",
    title: "Book a session",
    desc:  "Pick a time that works. Get a Google Meet link instantly. Pay securely on the spot.",
  },
  {
    step: "04", color: P.mint,   bg: "rgba(133,222,203,0.09)",  border: "rgba(133,222,203,0.22)",
    title: "Get unstuck",
    desc:  "Real conversation. Actionable answers. Every time.",
  },
];

const SESSION_TYPES = [
  {
    icon: "🔍", color: P.blue,   bg: "rgba(99,149,238,0.06)",
    name: "Business Discovery", tagline: "Open conversation",
    desc: "Honest, expert perspective on your biggest challenge. No agenda — just real talk.",
    duration: "30 to 60 min", best: "Getting unstuck fast",
  },
  {
    icon: "🎯", color: P.mgreen, bg: "rgba(136,207,168,0.06)",
    name: "Consultancy", tagline: "Focused problem-solving",
    desc: "Deep dive into one specific challenge. Walk away with a clear, actionable plan.",
    duration: "60 to 90 min", best: "Solving a specific problem",
  },
  {
    icon: "📈", color: P.mint,   bg: "rgba(133,222,203,0.06)",
    name: "Growth Strategy", tagline: "3 or 6 month program",
    desc: "Weekly touchpoints, milestone tracking, and accountability all the way to scale.",
    duration: "3 or 6 months", best: "Scaling your business",
  },
];

const FALLBACK_REVIEWS = [
  { id: -1, rating: 5, body: "I had been stuck on my pricing for eight months. After one session, I had a clear model that actually worked. The ROI was immediate.", reviewerName: "Grace Wanjiru" },
  { id: -2, rating: 5, body: "I was skeptical at first. Then I walked away from a discovery call with a staffing playbook I started using the same week.", reviewerName: "David Mwangi" },
  { id: -3, rating: 5, body: "My restaurant was bleeding money every weekend. My expert spotted the problem in 20 minutes that I had missed for a year.", reviewerName: "Amina Hassan" },
  { id: -4, rating: 5, body: "Finally someone who has actually run a business. Not a theory — a real plan I could execute immediately.", reviewerName: "Peter Kamau" },
  { id: -5, rating: 5, body: "I came in thinking I had a cash flow problem. Turns out I had a pricing problem. That distinction changed everything.", reviewerName: "Ruth Nyambura" },
];

// ── Live SVG ticking clock ─────────────────────────────────────
function TickingClock() {
  const [tick, setTick] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTick(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const s = tick.getSeconds();
  const m = tick.getMinutes();
  const h = tick.getHours() % 12;
  const sDeg = s * 6;
  const mDeg = m * 6 + s * 0.1;
  const hDeg = h * 30 + m * 0.5;

  const hand = (deg: number, len: number, w: number, col: string) => {
    const r = deg * Math.PI / 180;
    return (
      <line
        x1="40" y1="40"
        x2={40 + len * Math.sin(r)} y2={40 - len * Math.cos(r)}
        stroke={col} strokeWidth={w} strokeLinecap="round"
        style={{ transition: deg === sDeg ? "all 0.12s linear" : "all 0.4s ease" }}
      />
    );
  };

  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0">
      <circle cx="40" cy="40" r="36" fill="none" stroke={P.mint}  strokeWidth="2.5" opacity="0.45" />
      <circle cx="40" cy="40" r="36" fill="none" stroke={P.blue}  strokeWidth="1"   strokeDasharray="4 6" opacity="0.25" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30) * Math.PI / 180;
        const r1 = 30, r2 = 33;
        return (
          <line key={i}
            x1={40 + r1 * Math.sin(a)} y1={40 - r1 * Math.cos(a)}
            x2={40 + r2 * Math.sin(a)} y2={40 - r2 * Math.cos(a)}
            stroke={P.mblue} strokeWidth={i % 3 === 0 ? 2 : 1} opacity="0.55"
          />
        );
      })}
      {hand(hDeg, 16, 3,   P.blue)}
      {hand(mDeg, 22, 2,   P.mgreen)}
      {hand(sDeg, 26, 1.5, P.mint)}
      <circle cx="40" cy="40" r="3" fill={P.blue} />
    </svg>
  );
}

// ── Scroll reveal ──────────────────────────────────────────────
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity:    visible ? 1 : 0,
      transform:  visible ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

// ── RoleLoginBanner ────────────────────────────────────────────
function RoleLoginBanner() {
  const { data: user } = useGetMe();
  const [, navigate] = useLocation();

  if (user) {
    const dashboardPath =
      user.role === "admin"  ? "/dashboard/admin"  :
      user.role === "expert" ? "/dashboard/expert" : "/dashboard/client";

    return (
      <div className="bg-primary/5 border border-primary/20 rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm font-medium">
          Welcome back, <strong>{user.name}</strong>! Ready to continue?
        </p>
        <Button size="sm" onClick={() => navigate(dashboardPath)}>
          Go to My Dashboard →
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-2xl px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
      <p className="text-sm text-muted-foreground font-medium">Already have an account? Jump right in:</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/login">
          <Button size="sm" variant="outline" className="rounded-xl text-sm" style={{ color: P.blue, borderColor: P.blue + "55" }}>
            I am a Business Owner
          </Button>
        </Link>
        <Link href="/login?role=expert">
          <Button size="sm" variant="outline" className="rounded-xl text-sm" style={{ color: P.mgreen, borderColor: P.mgreen + "55" }}>
            I am an Expert
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Reviews Carousel ───────────────────────────────────────────
type ReviewItem = { id: number; rating: number; body: string; reviewerName: string; businessName?: string | null };

function ReviewsCarousel({ reviews }: { reviews: ReviewItem[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const n = reviews.length;

  const prev = useCallback(() => setCurrent(c => (c - 1 + n) % n), [n]);
  const next = useCallback(() => setCurrent(c => (c + 1) % n), [n]);

  // Reset auto-advance
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 4500);
  }, [next]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const handlePrev = () => { prev(); resetTimer(); };
  const handleNext = () => { next(); resetTimer(); };

  const CARD_SCHEMES = [
    { border: P.blue,   bg: "rgba(99,149,238,0.07)",   star: P.blue,   badge: "rgba(99,149,238,0.12)"  },
    { border: P.mgreen, bg: "rgba(136,207,168,0.08)",  star: P.mgreen, badge: "rgba(136,207,168,0.14)" },
    { border: P.mint,   bg: "rgba(133,222,203,0.08)",  star: P.mint,   badge: "rgba(133,222,203,0.14)" },
    { border: P.mblue,  bg: "rgba(144,184,214,0.08)",  star: P.mblue,  badge: "rgba(144,184,214,0.12)" },
  ];

  const getCard = (offset: -1 | 0 | 1) => {
    const idx = (current + offset + n) % n;
    const r = reviews[idx];
    const isCenter = offset === 0;
    const scheme = CARD_SCHEMES[idx % CARD_SCHEMES.length];
    return (
      <div
        key={r.id}
        style={{
          transform:   isCenter ? "scale(1)"   : "scale(0.87)",
          opacity:     isCenter ? 1            : 0.45,
          transition:  "all 0.45s ease",
          flex:        "0 0 33.333%",
          background:  isCenter ? scheme.bg    : "rgba(255,255,255,0.5)",
          borderColor: isCenter ? scheme.border : "transparent",
          borderWidth: isCenter ? 2            : 1,
          borderStyle: "solid",
        }}
        className={`rounded-3xl p-7 flex flex-col ${isCenter ? "shadow-xl" : "shadow-sm bg-card"}`}
      >
        {/* Accent bar at top */}
        {isCenter && (
          <div className="h-1 w-12 rounded-full mb-5" style={{ background: scheme.border }} />
        )}
        <div className="flex gap-0.5 mb-4">
          {Array.from({ length: r.rating }).map((_, j) => (
            <Star key={j} className="h-4 w-4 fill-current" style={{ color: scheme.star }} />
          ))}
        </div>
        <p className="italic text-muted-foreground text-sm leading-relaxed flex-1">"{r.body}"</p>
        <div className="mt-5 pt-4 border-t">
          <div className="font-semibold text-foreground text-sm">{r.reviewerName}</div>
        </div>
      </div>
    );
  };

  if (n < 3) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        {reviews.map((r, i) => {
          const col = CARD_SCHEMES[i % CARD_SCHEMES.length].star;
          return (
            <div key={r.id} className="p-6 rounded-3xl bg-card border shadow-sm flex flex-col">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="h-4 w-4 fill-current" style={{ color: col }} />)}
              </div>
              <p className="italic text-muted-foreground text-sm leading-relaxed flex-1">"{r.body}"</p>
              <div className="mt-5 pt-4 border-t">
                <div className="font-semibold text-foreground text-sm">{r.reviewerName}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Carousel track */}
      <div className="overflow-hidden px-4">
        <div className="flex gap-6" style={{ willChange: "transform" }}>
          {getCard(-1)}
          {getCard(0)}
          {getCard(1)}
        </div>
      </div>

      {/* Arrows */}
      <button
        onClick={handlePrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 h-10 w-10 rounded-full bg-card border shadow-md flex items-center justify-center hover:bg-primary/5 transition-colors z-10"
        aria-label="Previous review"
      >
        <ChevronLeft className="h-5 w-5 text-foreground" />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 h-10 w-10 rounded-full bg-card border shadow-md flex items-center justify-center hover:bg-primary/5 transition-colors z-10"
        aria-label="Next review"
      >
        <ChevronRight className="h-5 w-5 text-foreground" />
      </button>

      {/* Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {reviews.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrent(i); resetTimer(); }}
            className="rounded-full transition-all"
            style={{
              width:      i === current ? 20 : 8,
              height:     8,
              background: i === current ? P.blue : "#d1daf0",
            }}
          />
        ))}
      </div>

      {/* Leave a Review CTA */}
      <div className="text-center mt-8">
        <p className="text-sm text-muted-foreground mb-3">Had a session? Share your experience.</p>
        <Link href="/experts">
          <Button variant="outline" className="rounded-xl" style={{ borderColor: P.mgreen + "60", color: P.mgreen }}>
            Leave a Review →
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ── Industries with search ─────────────────────────────────────
function IndustriesSection() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query.trim()
    ? INDUSTRIES.filter(ind => ind.name.toLowerCase().includes(query.toLowerCase()))
    : INDUSTRIES;

  const handleInput = (val: string) => {
    setQuery(val);
    if (val.trim()) {
      const matches = INDUSTRIES
        .map(i => i.name)
        .filter(n => n.toLowerCase().includes(val.toLowerCase()) && n.toLowerCase() !== val.toLowerCase())
        .slice(0, 5);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const pickSuggestion = (name: string) => {
    setQuery(name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <Reveal>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
            Whatever Your Business Is,{" "}
            <span style={{ color: P.blue }}>Someone Here</span> Has{" "}
            <span style={{ color: P.mint }}>Lived It</span>
          </h2>
          <p className="text-center text-muted-foreground mb-8">13 industries. Verified experts in every one.</p>
        </Reveal>

        {/* Search bar */}
        <Reveal delay={80}>
          <div className="relative max-w-md mx-auto mb-10">
            <div className="flex items-center gap-2 bg-card border rounded-2xl px-4 py-3 shadow-sm">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Search industries..."
                value={query}
                onChange={e => handleInput(e.target.value)}
                onFocus={() => query && setShowSuggestions(suggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {query && (
                <button onClick={() => { setQuery(""); setSuggestions([]); }} className="text-muted-foreground hover:text-foreground text-xs transition-colors">✕</button>
              )}
            </div>
            {showSuggestions && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-card border rounded-xl shadow-lg z-20 overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors"
                    onMouseDown={() => pickSuggestion(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Reveal>

        {/* Industry grid — static, no animation */}
        <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
          {filtered.length > 0 ? filtered.map((ind, i) => (
            <Reveal key={ind.name} delay={i * 30}>
              <Link href={`/experts?industry=${encodeURIComponent(ind.name)}`}>
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border cursor-pointer font-medium text-sm shadow-sm transition-all hover:scale-105 hover:shadow-md"
                  style={{
                    borderColor: ind.color + "45",
                    background:  ind.color + "0F",
                    color:       ind.color === P.mblue ? "#2d6a8a" : ind.color,
                  }}
                >
                  <span>{ind.icon}</span>
                  <span className="text-foreground">{ind.name}</span>
                </div>
              </Link>
            </Reveal>
          )) : (
            <p className="text-muted-foreground text-sm py-4">No industries match "{query}"</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function Home() {
  const [search, setSearch]   = useState("");
  const [, navigate]          = useLocation();
  const { data: expertData, isLoading: expertsLoading } = useListExperts({ limit: 3 });
  const { data: reviewsData } = useListReviews();

  const reviews: ReviewItem[] = reviewsData && reviewsData.length > 0
    ? reviewsData.map(r => ({ id: r.id, rating: r.rating, body: r.body, reviewerName: r.reviewerName }))
    : FALLBACK_REVIEWS;

  const handleSearch = () => {
    if (search.trim()) navigate(`/experts?search=${encodeURIComponent(search.trim())}`);
    else navigate("/experts");
  };

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-background">
        {/* Animated blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 h-[520px] w-[520px] rounded-full opacity-[0.13] blur-[120px] animate-blob" style={{ background: P.blue }} />
          <div className="absolute top-10 -right-10 h-[440px] w-[440px] rounded-full opacity-[0.12] blur-[110px] animate-blob animation-delay-2000" style={{ background: P.mint }} />
          <div className="absolute -bottom-10 left-1/3 h-[360px] w-[360px] rounded-full opacity-[0.10] blur-[100px] animate-blob animation-delay-4000" style={{ background: P.mgreen }} />
        </div>

        <div className="container relative z-10 mx-auto px-4 md:px-6 pt-6 pb-4">
          <RoleLoginBanner />
        </div>

        <div className="container relative z-10 mx-auto px-4 md:px-6 pt-8 pb-20 sm:pb-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-7">
              <Reveal>
                <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                  For Business Owners Who Are Tired of Guessing
                </span>
              </Reveal>
              <Reveal delay={60}>
                <h1 className="text-5xl md:text-[58px] font-extrabold tracking-tight text-foreground leading-[1.05]">
                  Finally, Someone<br />
                  <span style={{ color: P.blue }}>Who</span> Gets <span style={{ color: P.mint }}>It</span>
                </h1>
              </Reveal>
              <Reveal delay={120}>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                  Stuck on <strong style={{ color: P.mgreen }}>pricing</strong>? Losing <strong style={{ color: P.blue }}>staff</strong>? Stalled on <strong style={{ color: P.mint }}>growth</strong>?{" "}
                  Talk to someone who has actually fixed this exact problem before. Not a textbook. Not a guess. Just real answers from people who have built what you are building.
                </p>
              </Reveal>
              <Reveal delay={180}>
                <div className="flex gap-3 p-2 bg-card rounded-2xl shadow-lg border max-w-xl">
                  <Input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder="Try 'pricing', 'staff turnover', 'growth'..."
                    className="border-0 shadow-none focus-visible:ring-0 text-base h-11"
                  />
                  <Button size="lg" className="rounded-xl h-11 px-6 whitespace-nowrap shrink-0" onClick={handleSearch}>
                    Find My Expert
                  </Button>
                </div>
              </Reveal>
              <Reveal delay={220}>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  {[["Verified practitioners", P.mgreen], ["13 industries", P.blue], ["Real results", P.mint]].map(([txt, col]) => (
                    <span key={txt} className="flex items-center gap-1.5">
                      <span className="font-bold" style={{ color: col }}>✓</span> {txt}
                    </span>
                  ))}
                </div>
              </Reveal>
            </div>

            <div className="relative hidden md:block">
              <div className="absolute inset-0 rounded-3xl" style={{ background: `linear-gradient(135deg, ${P.blue}18, ${P.mint}18)` }} />
              <img
                src="/photos/hero-video-call.png"
                alt="Business owner on a coaching video call"
                className="w-full rounded-3xl shadow-2xl object-cover aspect-video relative z-10"
                loading="eager"
              />
              <div className="absolute -bottom-4 -left-4 bg-card border rounded-2xl shadow-lg px-4 py-3 z-20">
                <p className="text-xs text-muted-foreground">Session just ended</p>
                <p className="font-semibold text-sm">★ 5.0 — Incredibly useful advice</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Your Solution Is{" "}
                <span style={{ color: P.blue }}>One Call Away</span>
              </h2>
              <p className="text-lg text-muted-foreground">No long forms. No waiting. Real help, fast.</p>
            </div>
          </Reveal>

          <div className="grid md:grid-cols-4 gap-5 mb-10">
            {HOW_IT_WORKS.map((s, i) => (
              <Reveal key={s.step} delay={i * 80}>
                <div
                  className="p-6 rounded-3xl border shadow-sm h-full flex flex-col transition-all hover:shadow-md hover:-translate-y-1"
                  style={{ background: s.bg, borderColor: s.border }}
                >
                  <div className="text-[48px] font-black leading-none mb-4 opacity-25" style={{ color: s.color }}>{s.step}</div>
                  <h3 className="text-lg font-bold mb-2 text-foreground">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Consultation photo */}
          <Reveal delay={120}>
            <div className="max-w-3xl mx-auto rounded-3xl overflow-hidden shadow-xl relative">
              <img
                src="/photos/consultation-session.png"
                alt="Business consultation in progress"
                className="w-full object-cover"
                style={{ maxHeight: 320 }}
                loading="lazy"
              />
              <div className="absolute inset-0 rounded-3xl" style={{ background: "linear-gradient(to top, rgba(26,37,64,0.35) 0%, transparent 60%)" }} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── TICKING CLOCK URGENCY BANNER ── */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <Reveal>
            <div
              className="rounded-3xl border p-8 flex flex-col md:flex-row items-center gap-7"
              style={{ background: `rgba(133,222,203,0.07)`, borderColor: P.mint + "40" }}
            >
              <TickingClock />
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-extrabold text-foreground mb-2 leading-snug">
                  Every minute you wait is a minute your{" "}
                  <span style={{ color: P.mint }}>competitor isn't.</span>
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">
                  The business problem keeping you up tonight? Someone on ScaleWise has already solved it. Help is one call away. Stop losing time to uncertainty.
                </p>
              </div>
              <Link href="/experts">
                <Button size="lg" className="rounded-xl whitespace-nowrap shrink-0" style={{ background: P.mint, color: "#0c4a3a" }}>
                  Book a Call Now →
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── SESSION TYPES ── */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Three Ways to <span style={{ color: P.mgreen }}>Get Help</span>
              </h2>
              <p className="text-lg text-muted-foreground">Pick the format that matches where you are right now.</p>
            </div>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {SESSION_TYPES.map((t, i) => (
              <Reveal key={t.name} delay={i * 90}>
                <div
                  className="p-8 rounded-3xl border shadow-sm hover:shadow-md transition-all hover:-translate-y-1 flex flex-col h-full"
                  style={{ background: t.bg, borderColor: t.color + "35" }}
                >
                  <div className="text-4xl mb-4">{t.icon}</div>
                  <div className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: t.color }}>{t.tagline}</div>
                  <h3 className="text-xl font-bold mb-3 text-foreground">{t.name}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1">{t.desc}</p>
                  <div className="mt-6 pt-5 border-t flex justify-between text-sm">
                    <span className="text-muted-foreground">⏱ {t.duration}</span>
                    <span className="font-medium" style={{ color: t.color }}>Best for: {t.best}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES ── */}
      <IndustriesSection />

      {/* ── FEATURED EXPERTS ── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <div className="flex justify-between items-end mb-10">
              <h2 className="text-3xl md:text-4xl font-bold max-w-lg">
                The People Who Have{" "}
                <span style={{ color: P.mgreen }}>Actually</span>{" "}
                <span style={{ color: P.blue }}>Done It</span>
              </h2>
              <Link href="/experts">
                <Button variant="outline" className="hidden md:flex rounded-xl">Browse All Experts →</Button>
              </Link>
            </div>
          </Reveal>

          {expertsLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className="h-64 rounded-3xl bg-muted animate-pulse" />)}
            </div>
          ) : expertData?.experts?.length ? (
            <>
              <div className="grid md:grid-cols-3 gap-6">
                {expertData.experts.map(expert => (
                  <ExpertCard key={expert.id} expert={expert as any} />
                ))}
              </div>
              <div className="text-center mt-10">
                <Link href="/experts">
                  <Button variant="outline" size="lg" className="rounded-xl">View All Experts</Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center p-12 bg-card rounded-3xl border max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold mb-4">We are building our founding roster</h3>
              <p className="text-muted-foreground mb-8">
                We are hand-picking our very first experts — people who have genuinely run businesses like yours.
              </p>
              <Link href="/apply-expert">
                <Button>Apply as a Founding Expert</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── REVIEWS CAROUSEL ── */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <Reveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
              Business Owners, <span style={{ color: P.mgreen }}>Telling It Like It Is</span>
            </h2>
            <p className="text-center text-muted-foreground mb-12">Real experiences from real people.</p>
          </Reveal>
          <ReviewsCarousel reviews={reviews} />
        </div>
      </section>

      {/* ── EXPERT CTA ── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Reveal>
            <div
              className="relative rounded-3xl border overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${P.blue}07, rgba(255,255,255,0.6), ${P.mgreen}0F)`, borderColor: P.mgreen + "35" }}
            >
              {/* Decorative blob */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-[280px] w-[280px] rounded-full opacity-[0.18] blur-[80px]" style={{ background: P.mgreen }} />

              <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center p-10 md:p-14">
                <div className="relative hidden md:block">
                  <img
                    src="/photos/expert-cta.png"
                    alt="Expert advisor ready to help"
                    className="w-full rounded-3xl shadow-xl object-cover aspect-[4/3]"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-5">
                  <span className="inline-block rounded-full px-4 py-1.5 text-sm font-semibold" style={{ background: P.mgreen + "18", color: P.mgreen }}>
                    For Industry Practitioners
                  </span>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-foreground">
                    Turn Your <span style={{ color: P.mgreen }}>Experience</span><br />
                    Into <span style={{ color: P.blue }}>Income</span>
                  </h2>
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    You have spent years building something real. Other business owners need exactly what you know. Join ScaleWise as a verified expert, set your own rates, and start earning on your schedule.
                  </p>
                  <ul className="space-y-2 text-muted-foreground text-sm">
                    {[
                      ["Set your own prices and availability",              P.mgreen],
                      ["Get matched with business owners in your industry", P.blue  ],
                      ["Earn from Discovery, Consultancy, and Growth sessions", P.mint ],
                      ["Build your reputation with verified client reviews", P.mblue ],
                    ].map(([text, col]) => (
                      <li key={text} className="flex items-center gap-2.5">
                        <span className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: col }}>✓</span>
                        {text}
                      </li>
                    ))}
                  </ul>
                  <Link href="/apply-expert">
                    <Button
                      size="lg"
                      className="rounded-2xl px-8 text-base font-bold shadow-lg mt-2"
                      style={{ background: `linear-gradient(135deg, ${P.mgreen}, ${P.mint})`, color: "#083d2e", boxShadow: `0 8px 28px ${P.mgreen}50` }}
                    >
                      🚀 Apply as a Founding Expert →
                    </Button>
                  </Link>
                  <p className="text-xs" style={{ color: P.mgreen }}>
                    Limited spots available — we are hand-picking our first cohort.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

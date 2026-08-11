import { useState, useEffect, useRef } from "react";
import { Search, ArrowRight, Star, ChevronRight, Clock, Users, Award, Zap } from "lucide-react";

const PALETTE = {
  blue:    "#6395EE",
  mblue:   "#90B8D6",
  mgreen:  "#88CFA8",
  mint:    "#85DECB",
};

const INDUSTRIES = [
  "Agriculture & Agribusiness", "Beauty & Salons", "Construction & Contracting",
  "Education & Training", "E-commerce & Retail", "Financial Services",
  "Healthcare & Clinics", "Hospitality & Tourism", "Logistics & Transport",
  "Manufacturing & SMEs", "Real Estate", "Restaurants & Food Business", "Tech Startups"
];

const STEPS = [
  {
    step: "01", color: PALETTE.blue,   bg: "rgba(99,149,238,0.08)",  border: "rgba(99,149,238,0.18)",
    icon: <Search className="h-5 w-5" />,
    title: "Describe your challenge",
    desc: "Tell us what is keeping you up at night. Pricing, growth, staff, operations — any of it.",
  },
  {
    step: "02", color: PALETTE.mblue,  bg: "rgba(144,184,214,0.10)", border: "rgba(144,184,214,0.22)",
    icon: <Users className="h-5 w-5" />,
    title: "Browse matched experts",
    desc: "Filter by industry and session type. Every expert is vetted and approved by our team.",
  },
  {
    step: "03", color: PALETTE.mgreen, bg: "rgba(136,207,168,0.10)", border: "rgba(136,207,168,0.22)",
    icon: <Award className="h-5 w-5" />,
    title: "Book a session",
    desc: "Pick a time that works. Get a Google Meet link instantly. Pay securely on the spot.",
  },
  {
    step: "04", color: PALETTE.mint,   bg: "rgba(133,222,203,0.10)", border: "rgba(133,222,203,0.22)",
    icon: <Zap className="h-5 w-5" />,
    title: "Get unstuck",
    desc: "Real conversation. Actionable answers. Every time.",
  },
];

const SESSION_TYPES = [
  {
    icon: "🔍", color: PALETTE.blue,  bg: "rgba(99,149,238,0.07)",
    name: "Business Discovery",
    tagline: "Open conversation",
    desc: "Honest, expert perspective on your biggest challenge. No agenda. Just real talk.",
    duration: "30 to 60 min",
    best: "Getting unstuck fast",
  },
  {
    icon: "🎯", color: PALETTE.mgreen, bg: "rgba(136,207,168,0.07)",
    name: "Consultancy",
    tagline: "Focused problem-solving",
    desc: "Deep dive into one specific challenge. Walk away with a clear, actionable plan.",
    duration: "60 to 90 min",
    best: "Solving a specific problem",
  },
  {
    icon: "📈", color: PALETTE.mint,  bg: "rgba(133,222,203,0.07)",
    name: "Growth Strategy",
    tagline: "3 or 6 month program",
    desc: "Weekly touchpoints, milestone tracking, and accountability all the way to scale.",
    duration: "3 or 6 months",
    best: "Scaling your business",
  },
];

const REVIEWS = [
  { rating: 5, body: "I had been stuck on my pricing for eight months. After one session, I had a clear model that actually worked. The ROI was immediate.", name: "Grace Wanjiru", biz: "Bloom Beauty Studio, Nairobi" },
  { rating: 5, body: "I was skeptical at first. Then I walked away from a discovery call with a staffing playbook I started using the same week.", name: "David Mwangi", biz: "Mwangi Construction, Mombasa" },
  { rating: 5, body: "My restaurant was bleeding money every weekend. My expert spotted the problem in 20 minutes that I had missed for a year.", name: "Amina Hassan", biz: "Spice Route Restaurant, Kisumu" },
];

// Animated ticking clock component
function TickingClock() {
  const [time, setTime] = useState({ s: 0, m: 0, h: 0 });
  useEffect(() => {
    const now = new Date();
    setTime({ s: now.getSeconds(), m: now.getMinutes(), h: now.getHours() % 12 });
    const id = setInterval(() => {
      const n = new Date();
      setTime({ s: n.getSeconds(), m: n.getMinutes(), h: n.getHours() % 12 });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const sDeg = time.s * 6;
  const mDeg = time.m * 6 + time.s * 0.1;
  const hDeg = time.h * 30 + time.m * 0.5;

  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r="36" fill="none" stroke={PALETTE.mint} strokeWidth="2.5" opacity="0.5" />
      <circle cx="40" cy="40" r="36" fill="none" stroke={PALETTE.blue} strokeWidth="1" strokeDasharray="4 6" opacity="0.3" />
      {/* Hour marks */}
      {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
        const a = i * 30 * Math.PI / 180;
        const r1 = 30, r2 = 33;
        return (
          <line key={i}
            x1={40 + r1 * Math.sin(a)} y1={40 - r1 * Math.cos(a)}
            x2={40 + r2 * Math.sin(a)} y2={40 - r2 * Math.cos(a)}
            stroke={PALETTE.mblue} strokeWidth={i % 3 === 0 ? 2 : 1} opacity="0.6"
          />
        );
      })}
      {/* Hour hand */}
      <line
        x1="40" y1="40"
        x2={40 + 16 * Math.sin(hDeg * Math.PI / 180)}
        y2={40 - 16 * Math.cos(hDeg * Math.PI / 180)}
        stroke={PALETTE.blue} strokeWidth="3" strokeLinecap="round"
        style={{ transition: "all 0.5s ease" }}
      />
      {/* Minute hand */}
      <line
        x1="40" y1="40"
        x2={40 + 22 * Math.sin(mDeg * Math.PI / 180)}
        y2={40 - 22 * Math.cos(mDeg * Math.PI / 180)}
        stroke={PALETTE.mgreen} strokeWidth="2" strokeLinecap="round"
        style={{ transition: "all 0.5s ease" }}
      />
      {/* Second hand */}
      <line
        x1="40" y1="40"
        x2={40 + 26 * Math.sin(sDeg * Math.PI / 180)}
        y2={40 - 26 * Math.cos(sDeg * Math.PI / 180)}
        stroke={PALETTE.mint} strokeWidth="1.5" strokeLinecap="round"
        style={{ transition: "all 0.15s linear" }}
      />
      <circle cx="40" cy="40" r="3" fill={PALETTE.blue} />
    </svg>
  );
}

// Scroll-reveal hook
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useReveal();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// Login role picker modal
function LoginModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="mx-4 w-full max-w-sm rounded-3xl border border-white/60 bg-white/90 p-8 shadow-2xl backdrop-blur-xl"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: "0 24px 80px rgba(99,149,238,0.18)" }}
      >
        <h3 className="mb-2 text-xl font-bold text-[#1a2540]">How would you like to sign in?</h3>
        <p className="mb-6 text-sm text-[#6b7a99]">Choose the option that describes you best.</p>
        <div className="flex flex-col gap-3">
          <button className="flex items-center gap-4 rounded-2xl border-2 border-[#6395EE]/30 bg-[#f5f8ff] px-5 py-4 text-left transition-all hover:border-[#6395EE] hover:bg-[#6395EE]/5">
            <span className="text-2xl">🏢</span>
            <div>
              <div className="font-semibold text-[#1a2540]">I am a Business Owner</div>
              <div className="text-xs text-[#6b7a99]">Looking for expert guidance on my business</div>
            </div>
          </button>
          <button className="flex items-center gap-4 rounded-2xl border-2 border-[#88CFA8]/30 bg-[#f5fff8] px-5 py-4 text-left transition-all hover:border-[#88CFA8] hover:bg-[#88CFA8]/5">
            <span className="text-2xl">💡</span>
            <div>
              <div className="font-semibold text-[#1a2540]">I am an Expert</div>
              <div className="text-xs text-[#6b7a99]">Sharing my expertise and coaching others</div>
            </div>
          </button>
        </div>
        <button onClick={onClose} className="mt-5 w-full text-center text-xs text-[#a0aec0] hover:text-[#6b7a99] transition-colors">Cancel</button>
      </div>
    </div>
  );
}

export function HomepageV2() {
  const [query, setQuery] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f0f4ff] font-['Inter']">

      {/* ── Global keyframes & utility styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes blob1 { 0%,100%{transform:translate(0,0)scale(1)}33%{transform:translate(30px,-20px)scale(1.05)}66%{transform:translate(-20px,30px)scale(0.95)} }
        @keyframes blob2 { 0%,100%{transform:translate(0,0)scale(1)}33%{transform:translate(-40px,20px)scale(1.08)}66%{transform:translate(20px,-30px)scale(0.97)} }
        @keyframes blob3 { 0%,100%{transform:translate(0,0)scale(1)}50%{transform:translate(25px,25px)scale(1.06)} }
        @keyframes ticker { 0%{transform:translateX(0)}100%{transform:translateX(-50%)} }
        @keyframes popIn { 0%{opacity:0;transform:scale(0.92)translateY(16px)}100%{opacity:1;transform:scale(1)translateY(0)} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)} }
        .card-hover { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(99,149,238,0.15); }
        .chip-hover { transition: all 0.2s ease; }
        .chip-hover:hover { background:#6395EE; color:#fff; transform:translateY(-2px); }
        .cta-glow:hover { transform:translateY(-2px); box-shadow:0 10px 36px rgba(99,149,238,0.38); }
        .green-glow:hover { transform:translateY(-2px); box-shadow:0 10px 36px rgba(136,207,168,0.4); }
        .step-card { animation: popIn 0.5s ease both; }
        .underline-anim { position:relative; display:inline-block; }
        .underline-anim::after { content:''; position:absolute; bottom:-2px; left:0; width:0; height:2px; background:#6395EE; border-radius:2px; transition:width 0.35s ease; }
        .underline-anim:hover::after { width:100%; }
        .ticker-track { display:flex; width:max-content; animation: ticker 28s linear infinite; }
        .ticker-track:hover { animation-play-state: paused; }
        .modal-in { animation: fadeSlide 0.2s ease; }
      `}</style>

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[#6395EE] opacity-[0.11] blur-[130px]" style={{ animation: "blob1 12s ease-in-out infinite" }} />
        <div className="absolute top-20 right-0 h-[500px] w-[500px] rounded-full bg-[#85DECB] opacity-[0.12] blur-[110px]" style={{ animation: "blob2 15s ease-in-out infinite" }} />
        <div className="absolute bottom-1/3 left-1/4 h-[400px] w-[400px] rounded-full bg-[#88CFA8] opacity-[0.09] blur-[100px]" style={{ animation: "blob3 18s ease-in-out infinite" }} />
        <div className="absolute bottom-0 right-1/4 h-[450px] w-[450px] rounded-full bg-[#90B8D6] opacity-[0.11] blur-[120px]" style={{ animation: "blob1 20s ease-in-out infinite reverse" }} />
      </div>

      {/* ── LOGIN MODAL ── */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}

      {/* ── NAVBAR ── */}
      <nav className="relative z-20 flex items-center justify-between px-10 py-5 border-b border-white/30 backdrop-blur-sm bg-white/20">
        <span className="text-xl font-extrabold tracking-tight text-[#1a2540]">Scale<span style={{ color: PALETTE.blue }}>Wise</span></span>
        <div className="flex items-center gap-8 text-sm text-[#4a5568]">
          <a href="#" className="underline-anim hover:text-[#6395EE] transition-colors">Browse Experts</a>
          <a href="#" className="underline-anim hover:text-[#6395EE] transition-colors">About</a>
          <a href="#" className="underline-anim hover:text-[#6395EE] transition-colors">FAQ</a>
          <a href="#" className="underline-anim hover:text-[#6395EE] transition-colors">Contact</a>
        </div>
        <div className="flex items-center gap-2">
          {/* Main Login — asks role */}
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-4 py-2 text-sm text-[#4a5568] hover:text-[#6395EE] transition-colors rounded-xl hover:bg-white/50"
          >
            Login
          </button>
          <a href="#" className="cta-glow px-5 py-2 rounded-full bg-[#6395EE] text-white text-sm font-semibold transition-all duration-200">Sign Up</a>
          {/* Admin Login — direct, separate */}
          <a href="#" className="px-3 py-1.5 text-xs text-[#a0aec0] hover:text-[#6b7a99] transition-colors border border-transparent hover:border-[#e2e8f0] rounded-xl">Admin</a>
        </div>
      </nav>

      {/* ── ROLE BANNER ── */}
      <div className="relative z-10 mx-10 mt-4 flex items-center justify-between rounded-2xl border border-white/50 bg-white/50 px-6 py-3 backdrop-blur-sm">
        <span className="text-sm text-[#6b7a99]">Already have an account? Jump right in:</span>
        <div className="flex items-center gap-2">
          {/* Direct — no role picker */}
          <a href="/login?role=client" className="rounded-xl border border-[#6395EE]/30 bg-white/80 px-4 py-1.5 text-sm font-medium text-[#6395EE] hover:bg-[#6395EE] hover:text-white transition-all duration-200">
            I am a Business Owner
          </a>
          <a href="/login?role=expert" className="rounded-xl border border-[#88CFA8]/40 bg-white/80 px-4 py-1.5 text-sm font-medium text-[#88CFA8] hover:bg-[#88CFA8] hover:text-white transition-all duration-200" style={{ color: PALETTE.mgreen }}>
            I am an Expert
          </a>
          {/* Admin — completely separate */}
          <a href="/login?role=admin" className="rounded-xl px-3 py-1.5 text-xs text-[#a0aec0] hover:text-[#6b7a99] transition-colors">
            Admin
          </a>
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="relative z-10 px-10 pt-10 pb-14">
        <div className="grid grid-cols-[1fr_auto] gap-10 items-start">
          <div>
            <Reveal delay={0}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#6395EE]/20 bg-white/60 px-4 py-1.5 text-xs text-[#6395EE] backdrop-blur-sm font-medium">
                For Business Owners Who Are Tired of Guessing
              </div>
            </Reveal>
            <Reveal delay={60}>
              <h1 className="mb-5 text-[58px] font-extrabold leading-[1.05] tracking-tight text-[#1a2540]">
                Finally, Someone<br />
                <span style={{ color: PALETTE.blue }}>Who</span> Gets <span style={{ color: PALETTE.mint }}>It</span>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mb-8 max-w-xl text-lg text-[#6b7a99] leading-relaxed">
                Stuck on <span className="font-semibold" style={{ color: PALETTE.mgreen }}>pricing</span>? Losing <span className="font-semibold" style={{ color: PALETTE.blue }}>staff</span>? Stalled on <span className="font-semibold" style={{ color: PALETTE.mint }}>growth</span>?{" "}
                Talk to someone who has actually fixed this exact problem before. Not a textbook. Not a guess. Just{" "}
                <span className="font-semibold text-[#1a2540]">real answers</span> from people who have built what you are building.
              </p>
            </Reveal>
            <Reveal delay={180}>
              <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-5 py-3.5 shadow-lg backdrop-blur-md max-w-xl">
                <Search className="h-5 w-5 shrink-0" style={{ color: PALETTE.blue }} />
                <input
                  className="flex-1 bg-transparent text-sm text-[#1a2540] placeholder:text-[#a0aec0] outline-none"
                  placeholder="What is keeping you up at night? Try 'pricing' or 'growth'..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                <button className="cta-glow shrink-0 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-all duration-200" style={{ background: PALETTE.blue }}>
                  Find My Expert
                </button>
              </div>
              <div className="mt-4 flex items-center gap-5 text-sm text-[#6b7a99]">
                {[["✓", "Verified practitioners", PALETTE.mgreen], ["✓", "13 industries", PALETTE.blue], ["✓", "Real results", PALETTE.mint]].map(([ic, txt, col]) => (
                  <span key={txt as string} className="flex items-center gap-1.5">
                    <span className="font-bold" style={{ color: col as string }}>{ic}</span> {txt}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Floating stat cards */}
          <div className="flex flex-col gap-3 pt-4">
            {[
              { val: "13", label: "Industries covered", col: PALETTE.blue, bg: "rgba(99,149,238,0.08)" },
              { val: "4.9★", label: "Avg session rating", col: PALETTE.mgreen, bg: "rgba(136,207,168,0.10)" },
              { val: "3", label: "Session types", col: PALETTE.mint, bg: "rgba(133,222,203,0.10)" },
            ].map(({ val, label, col, bg }) => (
              <div key={label} className="card-hover rounded-2xl border border-white/50 px-5 py-4 backdrop-blur-md shadow-sm" style={{ background: bg }}>
                <div className="text-2xl font-bold" style={{ color: col }}>{val}</div>
                <div className="text-xs text-[#6b7a99] mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 px-10 pb-14">
        <Reveal>
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-[32px] font-extrabold text-[#1a2540] leading-tight">
                Your Solution Is <span style={{ color: PALETTE.blue }}>One Call Away</span>
              </h2>
              <p className="mt-1 text-sm text-[#6b7a99]">No long forms. No waiting. Real help, fast.</p>
            </div>
            <a href="/experts" className="flex items-center gap-1 text-sm font-medium transition-all hover:gap-2" style={{ color: PALETTE.blue }}>
              Browse all experts <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </Reveal>

        <div className="grid grid-cols-4 gap-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 80}>
              <div
                className="card-hover step-card rounded-[24px] border p-6 backdrop-blur-md shadow-sm flex flex-col gap-3"
                style={{ background: s.bg, borderColor: s.border, animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[44px] font-black leading-none opacity-20" style={{ color: s.color }}>{s.step}</span>
                  <span className="rounded-xl p-2.5" style={{ background: s.color + "18", color: s.color }}>{s.icon}</span>
                </div>
                <h3 className="font-bold text-[#1a2540] text-base leading-snug">{s.title}</h3>
                <p className="text-sm text-[#6b7a99] leading-relaxed">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── TICKING CLOCK URGENCY BANNER ── */}
      <section className="relative z-10 px-10 pb-14">
        <Reveal>
          <div
            className="rounded-[24px] border p-8 backdrop-blur-md flex items-center gap-8"
            style={{ background: "rgba(133,222,203,0.08)", borderColor: "rgba(133,222,203,0.25)" }}
          >
            <div className="shrink-0">
              <TickingClock />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-extrabold text-[#1a2540] mb-2 leading-snug">
                Every minute you wait is a minute your <span style={{ color: PALETTE.mint }}>competitor isn't.</span>
              </h3>
              <p className="text-[#6b7a99] text-sm leading-relaxed max-w-lg">
                The business problem keeping you up tonight? Someone on GrowPia has already solved it. Help is one call away. Stop losing time to uncertainty.
              </p>
            </div>
            <a href="/experts" className="cta-glow shrink-0 flex items-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-white text-sm transition-all duration-200 whitespace-nowrap" style={{ background: PALETTE.mint, color: "#0d4a3e" }}>
              Book a Call Now <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </Reveal>
      </section>

      {/* ── SESSION TYPES ── */}
      <section className="relative z-10 px-10 pb-14">
        <Reveal>
          <div className="mb-8 text-center">
            <h2 className="text-[32px] font-extrabold text-[#1a2540] leading-tight">
              Three Ways to <span style={{ color: PALETTE.mgreen }}>Get Help</span>
            </h2>
            <p className="mt-2 text-[#6b7a99]">Pick the format that matches where you are right now.</p>
          </div>
        </Reveal>
        <div className="grid grid-cols-3 gap-5">
          {SESSION_TYPES.map((t, i) => (
            <Reveal key={t.name} delay={i * 100}>
              <div
                className="card-hover rounded-[24px] border border-white/50 p-7 backdrop-blur-md shadow-sm flex flex-col"
                style={{ background: t.bg }}
              >
                <div className="text-4xl mb-4">{t.icon}</div>
                <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: t.color }}>{t.tagline}</div>
                <h3 className="text-xl font-bold text-[#1a2540] mb-3">{t.name}</h3>
                <p className="text-sm text-[#6b7a99] leading-relaxed flex-1">{t.desc}</p>
                <div className="mt-5 pt-4 border-t border-white/40 flex justify-between text-xs text-[#6b7a99]">
                  <span>⏱ {t.duration}</span>
                  <span className="font-medium" style={{ color: t.color }}>Best for: {t.best}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── INDUSTRY TICKER ── */}
      <section className="relative z-10 pb-12 overflow-hidden">
        <Reveal>
          <div className="mb-5 px-10 text-center">
            <h2 className="text-[28px] font-extrabold text-[#1a2540]">
              Whatever Your Business Is, <span style={{ color: PALETTE.blue }}>Someone Here Has Lived It</span>
            </h2>
          </div>
        </Reveal>
        <div className="relative overflow-hidden">
          <div className="ticker-track gap-3 py-2">
            {[...INDUSTRIES, ...INDUSTRIES].map((ind, i) => {
              const col = [PALETTE.blue, PALETTE.mblue, PALETTE.mgreen, PALETTE.mint][i % 4];
              return (
                <a
                  key={i} href={`/experts?industry=${encodeURIComponent(ind)}`}
                  className="chip-hover shrink-0 rounded-full border px-5 py-2.5 text-sm font-medium backdrop-blur-sm shadow-sm"
                  style={{ borderColor: col + "35", background: col + "0D", color: col === PALETTE.mblue ? "#3a6b8a" : col, whiteSpace: "nowrap" }}
                >
                  {ind}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section className="relative z-10 px-10 pb-14">
        <Reveal>
          <h2 className="mb-8 text-center text-[28px] font-extrabold text-[#1a2540] leading-tight">
            Business Owners, <span style={{ color: PALETTE.mgreen }}>Telling It Like It Is</span>
          </h2>
        </Reveal>
        <div className="grid grid-cols-3 gap-5">
          {REVIEWS.map((r, i) => {
            const col = [PALETTE.blue, PALETTE.mgreen, PALETTE.mint][i];
            return (
              <Reveal key={r.name} delay={i * 90}>
                <div
                  className="card-hover rounded-[24px] border border-white/50 bg-white/55 p-7 backdrop-blur-md shadow-sm flex flex-col"
                >
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: r.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-current" style={{ color: col }} />
                    ))}
                  </div>
                  <p className="italic text-[#4a5568] text-sm leading-relaxed flex-1">"{r.body}"</p>
                  <div className="mt-5 pt-4 border-t border-white/40">
                    <div className="font-semibold text-[#1a2540] text-sm">{r.name}</div>
                    <div className="text-xs text-[#6b7a99]">{r.biz}</div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── EXPERT CTA ── */}
      <section className="relative z-10 px-10 pb-16">
        <Reveal>
          <div
            className="relative rounded-[32px] border overflow-hidden p-12"
            style={{ background: "linear-gradient(135deg, rgba(99,149,238,0.07) 0%, rgba(255,255,255,0.65) 50%, rgba(136,207,168,0.10) 100%)", borderColor: "rgba(136,207,168,0.25)" }}
          >
            {/* Decorative corner blob */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-[300px] w-[300px] rounded-full opacity-20 blur-[80px]" style={{ background: PALETTE.mgreen }} />

            <div className="relative z-10 flex items-center justify-between gap-12">
              <div className="max-w-xl">
                <span className="mb-4 inline-block rounded-full px-4 py-1.5 text-xs font-semibold" style={{ background: "rgba(136,207,168,0.12)", color: PALETTE.mgreen }}>
                  For Industry Practitioners
                </span>
                <h2 className="mb-4 text-[34px] font-extrabold leading-tight text-[#1a2540]">
                  Turn Your <span style={{ color: PALETTE.mgreen }}>Experience</span><br />
                  Into <span style={{ color: PALETTE.blue }}>Income</span>
                </h2>
                <p className="text-[#6b7a99] text-base leading-relaxed mb-6">
                  You have spent years building something real. Other business owners need exactly what you know. Join GrowPia as a verified expert, set your own rates, and start earning on your schedule.
                </p>
                <ul className="space-y-2 text-sm text-[#6b7a99]">
                  {[
                    ["Set your own prices and availability", PALETTE.mgreen],
                    ["Get matched with business owners in your industry", PALETTE.blue],
                    ["Earn from Discovery, Consultancy, and Growth sessions", PALETTE.mint],
                    ["Build your reputation with verified client reviews", PALETTE.mblue],
                  ].map(([text, col]) => (
                    <li key={text as string} className="flex items-center gap-2.5">
                      <span className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: col as string }}>✓</span>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* BIG, prominent CTA button */}
              <div className="shrink-0 flex flex-col items-center gap-4">
                <a
                  href="/apply-expert"
                  className="green-glow flex flex-col items-center justify-center gap-2 rounded-[20px] px-10 py-7 font-extrabold text-white text-lg text-center transition-all duration-200 shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${PALETTE.mgreen}, ${PALETTE.mint})`, boxShadow: `0 8px 30px rgba(136,207,168,0.35)`, minWidth: 220 }}
                >
                  <span className="text-3xl">🚀</span>
                  <span>Apply as a<br />Founding Expert</span>
                  <span className="flex items-center gap-1 text-sm font-medium opacity-80">
                    Free to apply <ArrowRight className="h-4 w-4" />
                  </span>
                </a>
                <p className="text-xs text-center max-w-[180px]" style={{ color: PALETTE.mgreen }}>
                  Limited spots available. We are hand-picking our first cohort.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/30 bg-white/30 backdrop-blur-sm px-10 py-12">
        <div className="grid grid-cols-5 gap-8 mb-10">
          <div className="col-span-2">
            <div className="text-xl font-extrabold tracking-tight text-[#1a2540] mb-3">
              Scale<span style={{ color: PALETTE.blue }}>Wise</span>
            </div>
            <p className="text-sm text-[#6b7a99] leading-relaxed max-w-xs">
              A premium expert marketplace connecting business owners with verified industry practitioners for paid consultancy and coaching.
            </p>
          </div>
          {[
            {
              title: "Quick Links",
              links: [["Browse Experts", "/experts"], ["How It Works", "#how-it-works"], ["Apply as Expert", "/apply-expert"], ["About Us", "/about"]],
            },
            {
              title: "For Business Owners",
              links: [["Find an Expert", "/experts"], ["Session Types", "/experts"], ["Book a Session", "/experts"], ["Client Dashboard", "/dashboard/client"]],
            },
            {
              title: "For Experts",
              links: [["Apply Now", "/apply-expert"], ["Expert Dashboard", "/dashboard/expert"], ["How Payouts Work", "/faq"], ["Expert FAQ", "/faq"]],
            },
            {
              title: "Legal and Support",
              links: [["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["FAQ", "/faq"], ["Contact Us", "/contact"]],
            },
          ].map(col => (
            <div key={col.title}>
              <div className="text-xs font-bold uppercase tracking-widest text-[#a0aec0] mb-3">{col.title}</div>
              <ul className="space-y-2">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-sm text-[#6b7a99] hover:text-[#6395EE] transition-colors underline-anim">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-white/30 pt-6 flex items-center justify-between text-xs text-[#a0aec0]">
          <span>© 2026 GrowPia. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-[#6395EE] transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-[#6395EE] transition-colors">Terms</a>
            <a href="/contact" className="hover:text-[#6395EE] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

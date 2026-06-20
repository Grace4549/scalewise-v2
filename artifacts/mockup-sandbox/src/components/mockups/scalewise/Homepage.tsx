import { useState } from "react";
import { Search, ArrowRight, Star, ChevronRight } from "lucide-react";

const INDUSTRIES = [
  "Agriculture & Agribusiness", "Beauty & Salons", "Construction & Contracting",
  "Education & Training", "E-commerce & Retail", "Financial Services",
  "Healthcare & Clinics", "Hospitality & Tourism", "Logistics & Transport",
  "Manufacturing & SMEs", "Real Estate", "Restaurants & Food Business", "Tech Startups"
];

const HOW_IT_WORKS = [
  { step: "01", title: "Describe your challenge", desc: "Tell us what's keeping you up at night — pricing, growth, operations, or anything in between." },
  { step: "02", title: "Browse matched experts", desc: "Filter by industry, session type, and availability. Every expert is vetted and approved by our team." },
  { step: "03", title: "Book a session", desc: "Pick a time that works. Get a Google Meet link instantly. Pay securely by M-Pesa, Airtel, or card." },
];

export function Homepage() {
  const [query, setQuery] = useState("");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f0f4ff] font-['Inter']">

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-[#6395EE] opacity-[0.12] blur-[120px] animate-[blob1_12s_ease-in-out_infinite]" />
        <div className="absolute top-20 right-0 h-[500px] w-[500px] rounded-full bg-[#85DECB] opacity-[0.14] blur-[100px] animate-[blob2_15s_ease-in-out_infinite]" />
        <div className="absolute bottom-40 left-1/3 h-[400px] w-[400px] rounded-full bg-[#88CFA8] opacity-[0.10] blur-[90px] animate-[blob3_18s_ease-in-out_infinite]" />
        <div className="absolute -bottom-20 right-1/4 h-[450px] w-[450px] rounded-full bg-[#90B8D6] opacity-[0.13] blur-[110px] animate-[blob1_20s_ease-in-out_infinite_reverse]" />
      </div>

      <style>{`
        @keyframes blob1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 30px) scale(0.95); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 20px) scale(1.08); }
          66% { transform: translate(20px, -30px) scale(0.97); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(25px, 25px) scale(1.06); }
        }
        .card-glow:hover {
          box-shadow: 0 8px 40px rgba(99, 149, 238, 0.18), 0 2px 12px rgba(99, 149, 238, 0.08);
          transform: translateY(-3px);
        }
        .industry-chip:hover {
          background: #6395EE;
          color: white;
          transform: translateY(-2px);
        }
        .cta-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(99, 149, 238, 0.4);
        }
      `}</style>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-10 py-5">
        <span className="text-xl font-bold tracking-tight text-[#1a2540]">ScaleWise</span>
        <div className="flex items-center gap-8 text-sm text-[#4a5568]">
          <a href="#" className="hover:text-[#6395EE] transition-colors">Browse Experts</a>
          <a href="#" className="hover:text-[#6395EE] transition-colors">About</a>
          <a href="#" className="hover:text-[#6395EE] transition-colors">FAQ</a>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm text-[#4a5568] hover:text-[#6395EE] transition-colors">Login</button>
          <button className="cta-btn px-5 py-2 rounded-full bg-[#6395EE] text-white text-sm font-medium transition-all duration-200">Sign Up</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-10 pt-16 pb-20">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#6395EE]/20 bg-white/60 px-4 py-1.5 text-xs text-[#6395EE] backdrop-blur-sm">
            For Business Owners Who Are Tired of Guessing
          </div>
          <h1 className="mb-6 text-[62px] font-extrabold leading-[1.05] tracking-tight text-[#1a2540]">
            Finally, Someone<br />Who Gets It
          </h1>
          <p className="mb-10 max-w-xl text-lg text-[#6b7a99] leading-relaxed">
            Stuck on pricing? Losing staff? Stalled on growth? Talk to someone who has actually fixed this exact problem before — not a textbook, not a guess. Just real answers from people who have built what you&apos;re building.
          </p>

          {/* Search bar */}
          <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-5 py-4 shadow-lg shadow-[#6395EE]/8 backdrop-blur-md max-w-xl">
            <Search className="h-5 w-5 shrink-0 text-[#6395EE]" />
            <input
              className="flex-1 bg-transparent text-sm text-[#1a2540] placeholder:text-[#a0aec0] outline-none"
              placeholder="What's keeping you up at night? Try 'pricing,' 'staff turnover,' 'growth'"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button className="cta-btn shrink-0 rounded-xl bg-[#6395EE] px-5 py-2 text-sm font-medium text-white transition-all duration-200">
              Find My Person
            </button>
          </div>
        </div>

        {/* Floating stat cards */}
        <div className="absolute right-12 top-24 flex flex-col gap-3">
          <div className="card-glow rounded-2xl border border-white/50 bg-white/65 px-5 py-4 backdrop-blur-md transition-all duration-300 shadow-md">
            <div className="text-2xl font-bold text-[#1a2540]">13</div>
            <div className="text-xs text-[#6b7a99]">Industries covered</div>
          </div>
          <div className="card-glow rounded-2xl border border-white/50 bg-white/65 px-5 py-4 backdrop-blur-md transition-all duration-300 shadow-md">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-[#88CFA8] text-[#88CFA8]" />
              <span className="text-2xl font-bold text-[#1a2540]">4.9</span>
            </div>
            <div className="text-xs text-[#6b7a99]">Avg session rating</div>
          </div>
        </div>
      </section>

      {/* How It Works + Industries */}
      <section className="relative z-10 px-10 pb-20">
        <div className="mb-10 flex items-end justify-between">
          <h2 className="text-3xl font-bold text-[#1a2540]">How It Works</h2>
          <a href="#" className="flex items-center gap-1 text-sm text-[#6395EE] hover:gap-2 transition-all">
            Browse all experts <ChevronRight className="h-4 w-4" />
          </a>
        </div>

        {/* Asymmetric grid: 3 steps + industries side panel */}
        <div className="grid grid-cols-[1fr_340px] gap-6">
          <div className="flex flex-col gap-4">
            {HOW_IT_WORKS.map(item => (
              <div key={item.step} className="card-glow flex gap-5 rounded-[24px] border border-white/50 bg-white/60 p-6 backdrop-blur-md transition-all duration-300 shadow-sm">
                <span className="text-4xl font-extrabold text-[#6395EE]/20 leading-none shrink-0">{item.step}</span>
                <div>
                  <div className="mb-1 font-semibold text-[#1a2540]">{item.title}</div>
                  <div className="text-sm text-[#6b7a99] leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Industries panel */}
          <div className="rounded-[24px] border border-white/50 bg-white/50 p-6 backdrop-blur-md shadow-sm">
            <div className="mb-4 text-sm font-semibold text-[#1a2540]">Browse by Industry</div>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map(ind => (
                <button key={ind} className="industry-chip rounded-full border border-[#6395EE]/20 bg-white/70 px-3 py-1.5 text-xs text-[#4a5568] transition-all duration-200 backdrop-blur-sm">
                  {ind}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Become an Expert CTA */}
      <section className="relative z-10 px-10 pb-20">
        <div className="rounded-[28px] border border-[#6395EE]/15 bg-gradient-to-br from-[#6395EE]/8 via-white/60 to-[#85DECB]/8 p-12 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="mb-3 text-3xl font-bold text-[#1a2540]">You&apos;ve solved hard problems.<br />Help others do the same.</h2>
              <p className="max-w-lg text-[#6b7a99]">Apply as a founding expert. Set your own rates. Work with business owners who need exactly what you know.</p>
            </div>
            <button className="cta-btn flex items-center gap-2 rounded-[16px] bg-[#6395EE] px-8 py-4 font-semibold text-white transition-all duration-200 shrink-0">
              Apply as Founding Expert <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

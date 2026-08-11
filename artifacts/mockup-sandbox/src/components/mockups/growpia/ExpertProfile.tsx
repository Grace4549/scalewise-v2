import { useState } from "react";
import { Star, Clock, MapPin, MessageSquare, Shield, ChevronDown, Calendar, Video, ArrowRight } from "lucide-react";

const SESSION_TYPES = [
  {
    id: "discovery",
    label: "Business Discovery",
    desc: "Open conversation — good when you're not sure exactly what you need",
    price: 8000,
    duration: "60 min",
    color: "#6395EE",
  },
  {
    id: "consultancy",
    label: "Consultancy",
    desc: "Focused advice for a specific, already-identified problem",
    price: 12000,
    duration: "90 min",
    color: "#85DECB",
  },
  {
    id: "growth",
    label: "Growth Strategy",
    desc: "Structured long-term engagement — 3-month or 6-month plan",
    price: 45000,
    duration: "Biweekly sessions",
    color: "#88CFA8",
  },
];

const TAGS = ["Product Strategy", "Fundraising", "Go-to-Market", "Pricing", "Team Building", "Investor Relations"];

export function ExpertProfile() {
  const [selectedSession, setSelectedSession] = useState("discovery");
  const [growthPlan, setGrowthPlan] = useState<"3m" | "6m">("3m");

  const session = SESSION_TYPES.find(s => s.id === selectedSession)!;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f0f4ff] font-['Inter']">

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-[#6395EE] opacity-[0.09] blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[450px] w-[450px] rounded-full bg-[#85DECB] opacity-[0.11] blur-[100px]" />
        <div className="absolute top-1/3 -left-20 h-[350px] w-[350px] rounded-full bg-[#88CFA8] opacity-[0.08] blur-[80px]" />
      </div>

      <style>{`
        .session-card:hover { box-shadow: 0 8px 32px rgba(99, 149, 238, 0.14); transform: translateY(-2px); }
        .session-card.selected { border-color: var(--session-color); }
        .book-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(99, 149, 238, 0.4); }
      `}</style>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/40 bg-white/30 backdrop-blur-md">
        <span className="text-lg font-bold tracking-tight text-[#1a2540]">GrowPia</span>
        <nav className="flex items-center gap-6 text-sm text-[#4a5568]">
          <a href="#" className="hover:text-[#6395EE] transition-colors">Browse Experts</a>
          <a href="#" className="hover:text-[#6395EE] transition-colors">About</a>
        </nav>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm text-[#4a5568]">Login</button>
          <button className="px-5 py-2 rounded-full bg-[#6395EE] text-white text-sm font-medium">Sign Up</button>
        </div>
      </nav>

      {/* Main asymmetric layout */}
      <div className="relative z-10 mx-auto max-w-6xl px-8 py-10 grid grid-cols-[1fr_360px] gap-8 items-start">

        {/* Left: profile */}
        <div>
          {/* Expert header */}
          <div className="mb-6 flex gap-5 rounded-[28px] border border-white/60 bg-white/60 p-6 backdrop-blur-md shadow-sm">
            <div className="h-20 w-20 shrink-0 rounded-[20px] flex items-center justify-center text-white text-2xl font-bold" style={{ background: "linear-gradient(135deg, #6395EE, #85DECB)" }}>
              AO
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[#1a2540]">Amara Osei</h1>
                <div className="flex items-center gap-1 rounded-full bg-[#88CFA8]/15 px-2.5 py-0.5">
                  <Shield className="h-3 w-3 text-[#2d6a4f]" />
                  <span className="text-xs font-medium text-[#2d6a4f]">Verified Expert</span>
                </div>
              </div>
              <p className="mb-2 text-[#6b7a99]">Product & Growth Advisor — Tech Startups</p>
              <div className="flex items-center gap-5 text-sm text-[#a0aec0]">
                <span className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-[#88CFA8] text-[#88CFA8]" /><strong className="text-[#1a2540]">4.9</strong> rating</span>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />12 yrs experience</span>
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />Nairobi, Kenya</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-5 rounded-[24px] border border-white/60 bg-white/55 p-6 backdrop-blur-md shadow-sm">
            <h2 className="mb-3 font-semibold text-[#1a2540]">About Amara</h2>
            <p className="text-sm leading-relaxed text-[#6b7a99]">
              I&apos;ve helped 30+ East African tech startups navigate the transition from idea to market — from product-market fit to series A. Before advising, I spent a decade as a product lead at companies across Nairobi, Lagos, and Cape Town. I care about one thing: making sure you&apos;re solving the right problem before you scale.
            </p>
          </div>

          {/* Expertise tags */}
          <div className="mb-5 rounded-[24px] border border-white/60 bg-white/55 p-6 backdrop-blur-md shadow-sm">
            <h2 className="mb-3 font-semibold text-[#1a2540]">Areas of Expertise</h2>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(t => (
                <span key={t} className="rounded-full border border-[#6395EE]/20 bg-[#6395EE]/8 px-3 py-1 text-xs text-[#6395EE]">{t}</span>
              ))}
            </div>
          </div>

          {/* Reviews — honest empty state */}
          <div className="rounded-[24px] border border-white/60 bg-white/55 p-6 backdrop-blur-md shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-[#1a2540]">Reviews</h2>
              <span className="text-xs text-[#a0aec0]">Public · no account needed</span>
            </div>
            <div className="rounded-[16px] border border-dashed border-[#6395EE]/20 bg-white/40 p-5 text-center mb-4">
              <MessageSquare className="mx-auto mb-2 h-6 w-6 text-[#90B8D6]" />
              <p className="text-sm text-[#6b7a99]">No reviews yet — be the first to leave one.</p>
            </div>
            {/* Review form */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} className="h-5 w-5 text-[#e2e8f0] hover:fill-[#88CFA8] hover:text-[#88CFA8] cursor-pointer transition-colors" />
                ))}
                <span className="text-xs text-[#a0aec0] ml-1">Select a rating</span>
              </div>
              <input className="w-full rounded-xl border border-[#e8edf8] bg-white/80 px-3 py-2 text-sm text-[#1a2540] placeholder:text-[#a0aec0] outline-none focus:border-[#6395EE]" placeholder="Your name (optional)" />
              <textarea className="w-full rounded-xl border border-[#e8edf8] bg-white/80 px-3 py-2 text-sm text-[#1a2540] placeholder:text-[#a0aec0] outline-none focus:border-[#6395EE] resize-none" rows={2} placeholder="Write your review..." />
              <button className="rounded-xl bg-[#6395EE] px-4 py-2 text-sm font-medium text-white hover:bg-[#5280d4] transition-colors">Submit Review</button>
            </div>
          </div>
        </div>

        {/* Right: sticky booking widget */}
        <div className="sticky top-6">
          <div className="rounded-[28px] border border-white/60 bg-white/70 p-6 backdrop-blur-xl shadow-lg shadow-[#6395EE]/8">
            <h3 className="mb-1 font-bold text-[#1a2540]">Book a Session</h3>
            <p className="mb-5 text-xs text-[#a0aec0]">Pay by M-Pesa, Airtel Money, or card</p>

            {/* Session type selector */}
            <div className="mb-5 flex flex-col gap-2">
              {SESSION_TYPES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSession(s.id)}
                  className={`session-card text-left rounded-[18px] border-2 p-3.5 transition-all duration-200 ${selectedSession === s.id ? "border-[var(--session-color)] bg-white shadow-sm" : "border-transparent bg-white/50 hover:bg-white/70"}`}
                  style={{ "--session-color": s.color } as React.CSSProperties}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="mb-0.5 text-sm font-semibold text-[#1a2540]">{s.label}</div>
                      <div className="text-[11px] text-[#6b7a99] leading-snug">{s.desc}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold text-[#1a2540]">KES {s.price.toLocaleString()}</div>
                      <div className="text-[10px] text-[#a0aec0]">{s.duration}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Growth plan toggle (only visible for growth) */}
            {selectedSession === "growth" && (
              <div className="mb-4 flex rounded-xl bg-[#f0f4ff] p-1 gap-1">
                <button
                  onClick={() => setGrowthPlan("3m")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${growthPlan === "3m" ? "bg-white text-[#1a2540] shadow-sm" : "text-[#6b7a99]"}`}
                >3-Month Plan</button>
                <button
                  onClick={() => setGrowthPlan("6m")}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${growthPlan === "6m" ? "bg-white text-[#1a2540] shadow-sm" : "text-[#6b7a99]"}`}
                >6-Month Plan</button>
              </div>
            )}

            {/* Date/time row */}
            <div className="mb-4 flex gap-2">
              <button className="flex-1 flex items-center gap-2 rounded-xl border border-[#e8edf8] bg-white/80 px-3 py-2.5 text-xs text-[#6b7a99] hover:border-[#6395EE] transition-colors">
                <Calendar className="h-3.5 w-3.5 text-[#6395EE]" /> Select date
              </button>
              <button className="flex-1 flex items-center gap-2 rounded-xl border border-[#e8edf8] bg-white/80 px-3 py-2.5 text-xs text-[#6b7a99] hover:border-[#6395EE] transition-colors">
                <Clock className="h-3.5 w-3.5 text-[#6395EE]" /> Select time
              </button>
            </div>

            {/* Google Meet note */}
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#f0f7ff] px-3 py-2.5">
              <Video className="h-3.5 w-3.5 shrink-0 text-[#6395EE]" />
              <span className="text-[11px] text-[#6b7a99]">Google Meet link sent automatically on booking</span>
            </div>

            {/* Total */}
            <div className="mb-4 flex items-center justify-between border-t border-[#f0f4ff] pt-3">
              <span className="text-sm text-[#6b7a99]">Total</span>
              <span className="text-lg font-bold text-[#1a2540]">
                KES {session.price.toLocaleString()}
              </span>
            </div>

            <button className="book-btn w-full flex items-center justify-center gap-2 rounded-[16px] bg-[#6395EE] py-3.5 font-semibold text-white transition-all duration-200">
              Book Session <ArrowRight className="h-4 w-4" />
            </button>
            <p className="mt-2 text-center text-[10px] text-[#a0aec0]">M-Pesa · Airtel Money · Visa / Mastercard</p>
          </div>
        </div>
      </div>
    </div>
  );
}

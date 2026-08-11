import { useState } from "react";
import { Search, SlidersHorizontal, Star, Clock, MapPin, Filter } from "lucide-react";

const INDUSTRIES = [
  "All Industries", "Tech Startups", "E-commerce & Retail", "Financial Services",
  "Healthcare & Clinics", "Restaurants & Food Business", "Real Estate",
  "Beauty & Salons", "Education & Training", "Hospitality & Tourism",
  "Agriculture & Agribusiness", "Construction & Contracting", "Logistics & Transport",
  "Manufacturing & SMEs"
];

const SESSION_TYPES = ["Any Session", "Business Discovery", "Consultancy", "Growth Strategy"];

const SAMPLE_EXPERTS = [
  { id: 1, name: "Amara Osei", industry: "Tech Startups", title: "Product & Growth Advisor", experience: 12, rating: 4.9, reviews: 0, location: "Nairobi, KE", tags: ["Product Strategy", "Fundraising", "Go-to-Market"], discovery: 8000, consultancy: 12000 },
  { id: 2, name: "Priya Nair", industry: "Financial Services", title: "SME Finance Specialist", experience: 9, rating: 4.8, reviews: 0, location: "Lagos, NG", tags: ["Cash Flow", "Lending", "Investor Relations"], discovery: 6500, consultancy: 10000 },
  { id: 3, name: "David Kimani", industry: "Restaurants & Food Business", title: "F&B Operations Expert", experience: 15, rating: 5.0, reviews: 0, location: "Kampala, UG", tags: ["Menu Engineering", "Cost Control", "Scaling"], discovery: 7000, consultancy: 11000 },
  { id: 4, name: "Sophie Mensah", industry: "E-commerce & Retail", title: "Retail & DTC Growth Coach", experience: 8, rating: 4.7, reviews: 0, location: "Accra, GH", tags: ["DTC Strategy", "Logistics", "Retention"], discovery: 5500, consultancy: 9000 },
];

const COLORS = ["#6395EE", "#85DECB", "#88CFA8", "#90B8D6"];

export function BrowseExperts() {
  const [activeIndustry, setActiveIndustry] = useState("All Industries");
  const [activeSession, setActiveSession] = useState("Any Session");
  const [search, setSearch] = useState("");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f0f4ff] font-['Inter']">

      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 h-[500px] w-[500px] rounded-full bg-[#6395EE] opacity-[0.10] blur-[100px]" />
        <div className="absolute bottom-10 left-0 h-[400px] w-[400px] rounded-full bg-[#85DECB] opacity-[0.12] blur-[90px]" />
        <div className="absolute top-1/2 left-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#88CFA8] opacity-[0.08] blur-[80px]" />
      </div>

      <style>{`
        .expert-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(99, 149, 238, 0.16), 0 4px 16px rgba(99, 149, 238, 0.08);
        }
        .filter-chip:hover { background: #6395EE; color: white; }
        .filter-chip.active { background: #6395EE; color: white; }
        .session-chip:hover { border-color: #6395EE; color: #6395EE; }
        .session-chip.active { background: #6395EE; color: white; border-color: #6395EE; }
      `}</style>

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/40 bg-white/30 backdrop-blur-md">
        <span className="text-lg font-bold tracking-tight text-[#1a2540]">ScaleWise</span>
        <div className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/60 px-4 py-2 backdrop-blur-md max-w-sm flex-1 mx-8">
          <Search className="h-4 w-4 text-[#6395EE] shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm text-[#1a2540] placeholder:text-[#a0aec0] outline-none"
            placeholder="Search by skill, problem, or industry..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm text-[#4a5568]">Login</button>
          <button className="px-5 py-2 rounded-full bg-[#6395EE] text-white text-sm font-medium">Sign Up</button>
        </div>
      </nav>

      <div className="relative z-10 flex gap-0">

        {/* Glassmorphic filter sidebar */}
        <aside className="sticky top-0 h-screen w-64 shrink-0 border-r border-white/40 bg-white/40 p-5 backdrop-blur-xl overflow-y-auto">
          <div className="mb-5 flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#6395EE]" />
            <span className="text-sm font-semibold text-[#1a2540]">Filters</span>
          </div>

          <div className="mb-5">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-[#a0aec0]">Industry</div>
            <div className="flex flex-col gap-1">
              {INDUSTRIES.map(ind => (
                <button
                  key={ind}
                  onClick={() => setActiveIndustry(ind)}
                  className={`filter-chip text-left rounded-lg px-3 py-2 text-xs transition-all duration-150 ${activeIndustry === ind ? "active" : "text-[#4a5568] hover:bg-white/60"}`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-[#a0aec0]">Session Type</div>
            <div className="flex flex-col gap-1">
              {SESSION_TYPES.map(s => (
                <button
                  key={s}
                  onClick={() => setActiveSession(s)}
                  className={`session-chip text-left rounded-lg border px-3 py-2 text-xs transition-all duration-150 ${activeSession === s ? "active" : "border-transparent text-[#4a5568]"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-[#a0aec0]">Min Experience</div>
            <input type="range" min="0" max="20" className="w-full accent-[#6395EE]" />
            <div className="flex justify-between text-xs text-[#a0aec0] mt-1">
              <span>0 yrs</span><span>20 yrs</span>
            </div>
          </div>
        </aside>

        {/* Expert grid */}
        <main className="flex-1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#1a2540]">Browse Experts</h1>
              <p className="text-sm text-[#6b7a99]">Showing all available experts — more joining soon</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#a0aec0]">
              <SlidersHorizontal className="h-4 w-4" />
              Sort: Best Match
            </div>
          </div>

          {/* Expert cards in asymmetric 2-col layout */}
          <div className="grid grid-cols-2 gap-4">
            {SAMPLE_EXPERTS.map((expert, i) => (
              <div
                key={expert.id}
                className="expert-card rounded-[24px] border border-white/60 bg-white/65 p-5 backdrop-blur-md transition-all duration-300 cursor-pointer shadow-sm"
                style={{ gridRow: i === 0 ? "span 1" : undefined }}
              >
                {/* Avatar and name */}
                <div className="mb-3 flex items-start gap-3">
                  <div
                    className="h-11 w-11 rounded-[14px] shrink-0 flex items-center justify-center text-white font-bold text-base"
                    style={{ background: `linear-gradient(135deg, ${COLORS[i % 4]}, ${COLORS[(i + 1) % 4]})` }}
                  >
                    {expert.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[#1a2540] text-sm">{expert.name}</div>
                    <div className="text-xs text-[#6b7a99] truncate">{expert.title}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 rounded-full bg-[#88CFA8]/15 px-2 py-0.5">
                    <Star className="h-3 w-3 fill-[#88CFA8] text-[#88CFA8]" />
                    <span className="text-xs font-medium text-[#2d6a4f]">{expert.rating}</span>
                  </div>
                </div>

                {/* Industry badge */}
                <div className="mb-3 inline-flex items-center rounded-full border border-[#6395EE]/20 bg-[#6395EE]/8 px-2.5 py-0.5 text-[11px] text-[#6395EE]">
                  {expert.industry}
                </div>

                {/* Tags */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {expert.tags.map(tag => (
                    <span key={tag} className="rounded-md bg-white/80 px-2 py-0.5 text-[11px] text-[#4a5568]">{tag}</span>
                  ))}
                </div>

                {/* Meta */}
                <div className="mb-4 flex items-center gap-4 text-[11px] text-[#a0aec0]">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{expert.experience} yrs exp</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{expert.location}</span>
                </div>

                {/* Pricing row */}
                <div className="flex items-center justify-between border-t border-[#e8edf8] pt-3">
                  <div className="text-xs text-[#6b7a99]">
                    From <span className="font-semibold text-[#1a2540]">KES {expert.discovery.toLocaleString()}</span>
                  </div>
                  <button className="rounded-xl bg-[#6395EE] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#5280d4] transition-colors">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Honest empty state hint */}
          <div className="mt-6 rounded-[20px] border border-dashed border-[#6395EE]/25 bg-white/40 p-6 text-center backdrop-blur-sm">
            <div className="mb-2 text-sm font-medium text-[#1a2540]">More experts joining soon</div>
            <p className="text-xs text-[#6b7a99] mb-3">Are you an expert? We review every application personally.</p>
            <button className="rounded-full border border-[#6395EE] px-4 py-1.5 text-xs text-[#6395EE] hover:bg-[#6395EE] hover:text-white transition-all duration-200">
              Apply as Founding Expert
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

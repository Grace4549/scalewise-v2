import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListExperts, useListReviews, useGetMe } from "@workspace/api-client-react";
import { ExpertCard } from "@/components/expert-card";

const INDUSTRIES = [
  "Agriculture & Agribusiness", "Beauty & Salons", "Construction & Contracting",
  "Education & Training", "E-commerce & Retail", "Financial Services",
  "Healthcare & Clinics", "Hospitality & Tourism", "Logistics & Transport",
  "Manufacturing & SMEs", "Real Estate", "Restaurants & Food Business", "Tech Startups",
];

function RoleLoginBanner() {
  const { data: user } = useGetMe();
  const [, navigate] = useLocation();

  if (user) {
    const dashboardPath =
      user.role === "admin" ? "/dashboard/admin" :
      user.role === "expert" ? "/dashboard/expert" :
      "/dashboard/client";

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
    <div className="bg-card border rounded-2xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
      <p className="text-sm text-muted-foreground font-medium">Already have an account? Jump right in:</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/login?role=client">
          <Button size="sm" variant="outline" className="rounded-xl">
            I'm a Business Owner
          </Button>
        </Link>
        <Link href="/login?role=expert">
          <Button size="sm" variant="outline" className="rounded-xl border-primary/30 text-primary hover:bg-primary/5">
            I'm an Expert
          </Button>
        </Link>
        <Link href="/login?role=admin">
          <Button size="sm" variant="ghost" className="rounded-xl text-muted-foreground text-xs">
            Admin Login
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();
  const { data: expertData, isLoading: expertsLoading } = useListExperts({ limit: 3 });
  const { data: reviewsData } = useListReviews();

  const handleSearch = () => {
    if (search.trim()) navigate(`/experts?search=${encodeURIComponent(search.trim())}`);
    else navigate("/experts");
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-primary/15 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob" />
        <div className="absolute top-0 -right-4 w-96 h-96 bg-accent/15 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-60 animate-blob animation-delay-4000" />

        <div className="container relative z-10 mx-auto px-4 md:px-6 pt-8 pb-6">
          <RoleLoginBanner />
        </div>

        <div className="container relative z-10 mx-auto px-4 md:px-6 pt-10 pb-20 sm:pb-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                For Business Owners Who Are Tired of Guessing
              </span>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.05]">
                Finally, Someone<br />Who Gets It
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                Stuck on pricing? Losing staff? Stalled on growth? Talk to someone who has actually fixed this exact problem before — not a textbook, not a guess.
              </p>

              <div className="flex gap-3 p-2 bg-card rounded-2xl shadow-lg border max-w-xl">
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Try 'pricing,' 'staff turnover,' 'growth'..."
                  className="border-0 shadow-none focus-visible:ring-0 text-base h-11"
                />
                <Button size="lg" className="rounded-xl h-11 px-6 whitespace-nowrap shrink-0" onClick={handleSearch}>
                  Find My Expert
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="text-green-500 font-bold">✓</span> Verified practitioners</span>
                <span className="flex items-center gap-1.5"><span className="text-green-500 font-bold">✓</span> 13 industries</span>
                <span className="flex items-center gap-1.5"><span className="text-green-500 font-bold">✓</span> Real results</span>
              </div>
            </div>

            <div className="relative hidden md:block">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-accent/10 rounded-3xl" />
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

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Your Solution Is One Call Away</h2>
            <p className="text-lg text-muted-foreground">
              No long forms. No waiting weeks for a consultant. Real help, fast.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Search your problem", desc: "Browse by industry or type what's keeping you stuck." },
              { step: "02", title: "Pick an expert", desc: "Find someone who has lived your exact situation." },
              { step: "03", title: "Book a session", desc: "Choose Discovery, Consultancy, or Growth Strategy." },
              { step: "04", title: "Get unstuck", desc: "Real conversation. Actionable answers. Guaranteed." },
            ].map((s) => (
              <div key={s.step} className="p-6 rounded-3xl bg-card border shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="text-5xl font-black text-primary/10 mb-4 group-hover:text-primary/20 transition-colors">{s.step}</div>
                <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Session Types */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Three Ways to Get Help</h2>
            <p className="text-lg text-muted-foreground">Pick the format that matches where you are right now.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Business Discovery",
                icon: "🔍",
                desc: "Open conversation about your biggest challenge. No agenda — just honest, expert perspective on what you're facing.",
                duration: "30–60 min",
                best: "Getting unstuck fast",
              },
              {
                name: "Consultancy",
                icon: "🎯",
                desc: "Focused session on a specific problem — pricing, operations, hiring, or growth. Walk away with a clear action plan.",
                duration: "60–90 min",
                best: "Solving a specific problem",
              },
              {
                name: "Growth Strategy",
                icon: "📈",
                desc: "3 or 6 months of guided transformation. Weekly touchpoints, milestone tracking, and accountability all the way.",
                duration: "3 or 6 months",
                best: "Scaling your business",
              },
            ].map((t) => (
              <div key={t.name} className="p-8 rounded-3xl bg-card border shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="text-4xl mb-4">{t.icon}</div>
                <h3 className="text-xl font-bold mb-3">{t.name}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed flex-1">{t.desc}</p>
                <div className="mt-6 pt-5 border-t flex justify-between text-sm">
                  <span className="text-muted-foreground">⏱ {t.duration}</span>
                  <span className="text-primary font-medium">Best for: {t.best}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Whatever Your Business Is, Someone Here Has Lived It</h2>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {INDUSTRIES.map((ind) => (
              <Link key={ind} href={`/experts?industry=${encodeURIComponent(ind)}`}>
                <div className="px-5 py-2.5 rounded-full border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer font-medium text-sm shadow-sm hover:shadow">
                  {ind}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Experts */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <h2 className="text-3xl md:text-4xl font-bold max-w-lg">The People Who've Actually Done It</h2>
            <Link href="/experts">
              <Button variant="outline" className="hidden md:flex rounded-xl">Browse All Experts →</Button>
            </Link>
          </div>

          {expertsLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => <div key={i} className="h-64 rounded-3xl bg-muted animate-pulse" />)}
            </div>
          ) : expertData?.experts?.length ? (
            <>
              <div className="grid md:grid-cols-3 gap-6">
                {expertData.experts.map((expert) => (
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
              <h3 className="text-xl font-semibold mb-4">We're building our founding roster</h3>
              <p className="text-muted-foreground mb-8">
                We're hand-picking our very first experts — people who've genuinely run businesses like yours.
              </p>
              <Link href="/apply-expert">
                <Button>Apply as a Founding Expert</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Reviews */}
      {reviewsData && reviewsData.length > 0 && (
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Business Owners, Telling It Like It Is</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {reviewsData.slice(0, 3).map((review) => (
                <div key={review.id} className="p-6 rounded-3xl bg-card border shadow-sm">
                  <div className="text-yellow-500 text-lg mb-4">{"★".repeat(review.rating)}</div>
                  <p className="italic text-muted-foreground mb-5 leading-relaxed">"{review.body}"</p>
                  <div className="font-semibold">{review.reviewerName}</div>
                  {review.businessName && <div className="text-sm text-muted-foreground">{review.businessName}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Become an Expert CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div className="relative hidden md:block">
              <img
                src="/photos/expert-cta.png"
                alt="Expert advisor ready to help"
                className="w-full rounded-3xl shadow-xl object-cover aspect-[4/3]"
                loading="lazy"
              />
            </div>
            <div className="space-y-6">
              <span className="inline-block rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent-foreground">
                For Industry Practitioners
              </span>
              <h2 className="text-3xl md:text-4xl font-bold">Turn Your Experience Into Income</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                You've spent years building something real. Other business owners need exactly what you know — and they're willing to pay for it. Join ScaleWise as a verified expert and start helping others while earning on your own schedule.
              </p>
              <ul className="space-y-2 text-muted-foreground text-sm">
                {[
                  "Set your own prices and availability",
                  "Get matched with business owners in your industry",
                  "Earn from Discovery, Consultancy, and Growth sessions",
                  "Build your reputation with verified client reviews",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="text-green-500 font-bold shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/apply-expert">
                <Button size="lg" className="rounded-xl h-13 px-8">Apply as an Expert →</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import { usePageTitle } from "@/hooks/use-page-title";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListExperts, useListIndustries } from "@workspace/api-client-react";
import { ExpertCard } from "@/components/expert-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const P = {
  blue:   "#6395EE",
  mblue:  "#90B8D6",
  mgreen: "#88CFA8",
  mint:   "#85DECB",
};

export default function ExpertsList() {
  usePageTitle("Browse Experts — ScaleWise");
  const [searchParams] = useLocation();
  const queryParams = new URLSearchParams(window.location.search);

  const [search, setSearch]     = useState(queryParams.get("search") || "");
  const [industry, setIndustry] = useState(queryParams.get("industry") || "all");

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: industries } = useListIndustries();
  const { data: expertData, isLoading } = useListExperts({
    search:   debouncedSearch || undefined,
    industry: industry !== "all" ? industry : undefined,
  });

  return (
    <div className="min-h-screen">
      {/* ── Hero banner ── */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${P.blue}10, ${P.mint}0C)` }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 h-[340px] w-[340px] rounded-full opacity-[0.12] blur-[100px]" style={{ background: P.blue }} />
          <div className="absolute -bottom-10 right-0 h-[280px] w-[280px] rounded-full opacity-[0.10] blur-[90px]" style={{ background: P.mint }} />
        </div>
        <div className="relative z-10 container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-block rounded-full px-4 py-1.5 text-xs font-semibold mb-4" style={{ background: P.blue + "14", color: P.blue }}>
                Verified Practitioners
              </span>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight mb-4">
                Find Your{" "}
                <span style={{ color: P.blue }}>Expert</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg">
                Every expert on ScaleWise has been vetted by our team. Real practitioners, real industries, real results.
              </p>
              <div className="flex items-center gap-5 mt-6 text-sm text-muted-foreground">
                {[["13", "Industries", P.blue], ["Vetted", "Every Expert", P.mgreen], ["Live", "Google Meet", P.mint]].map(([val, lbl, col]) => (
                  <div key={lbl} className="flex items-center gap-1.5">
                    <span className="font-bold" style={{ color: col as string }}>{val}</span>
                    <span>{lbl}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden md:block relative rounded-3xl overflow-hidden shadow-xl aspect-[16/9]">
              <img
                src="/photos/browse-experts-hero.png"
                alt="Business professionals at a networking event"
                className="w-full h-full object-cover"
                loading="eager"
              />
              <div className="absolute inset-0 rounded-3xl" style={{ background: "linear-gradient(to right, rgba(99,149,238,0.15), transparent)" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters + Listing ── */}
      <div className="bg-muted/10 py-12">
        <div className="container mx-auto px-4 flex flex-col lg:flex-row gap-8">

          {/* Sidebar */}
          <aside className="w-full lg:w-1/4 shrink-0">
            <div className="sticky top-24 bg-card/80 backdrop-blur-md border rounded-3xl p-6 shadow-sm" style={{ borderColor: P.blue + "25" }}>
              <h2 className="text-xl font-bold mb-1" style={{ color: P.blue }}>Filter Experts</h2>
              <p className="text-xs text-muted-foreground mb-6">Narrow down by keywords or industry.</p>

              <div className="space-y-5">
                <div>
                  <label className="text-sm font-semibold mb-2 block text-muted-foreground">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Keywords, skills..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="bg-background pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold mb-2 block text-muted-foreground">Industry</label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="All Industries" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Industries</SelectItem>
                      {industries?.map(ind => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(search || industry !== "all") && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { setSearch(""); setIndustry("all"); }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </aside>

          {/* Main listing */}
          <main className="flex-1">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-1">
                {industry !== "all" ? (
                  <>Experts in <span style={{ color: P.mgreen }}>{industry}</span></>
                ) : (
                  <>All <span style={{ color: P.mgreen }}>Verified Experts</span></>
                )}
              </h2>
              <p className="text-muted-foreground text-sm">
                {expertData ? `Showing ${expertData.total} expert${expertData.total !== 1 ? "s" : ""}` : "Loading experts…"}
              </p>
            </div>

            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-64 rounded-3xl" />)}
              </div>
            ) : expertData?.experts?.length ? (
              <div className="grid md:grid-cols-2 gap-6">
                {expertData.experts.map(expert => (
                  <ExpertCard key={expert.id} expert={expert as any} />
                ))}
              </div>
            ) : (
              <div className="text-center p-12 bg-card rounded-3xl border">
                <h3 className="text-xl font-semibold mb-2">No experts found</h3>
                <p className="text-muted-foreground mb-6">Try adjusting your filters or search terms.</p>
                <Button onClick={() => { setSearch(""); setIndustry("all"); }}>
                  Clear Filters
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

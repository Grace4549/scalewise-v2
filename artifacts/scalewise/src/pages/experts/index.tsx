import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useListExperts, useListIndustries } from "@workspace/api-client-react";
import { ExpertCard } from "@/components/expert-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function ExpertsList() {
  const [searchParams] = useLocation();
  const queryParams = new URLSearchParams(window.location.search);
  
  const [search, setSearch] = useState(queryParams.get("search") || "");
  const [industry, setIndustry] = useState(queryParams.get("industry") || "all");
  
  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: industries } = useListIndustries();
  const { data: expertData, isLoading } = useListExperts({ 
    search: debouncedSearch || undefined, 
    industry: industry !== "all" ? industry : undefined 
  });

  return (
    <div className="bg-muted/10 min-h-screen py-12">
      <div className="container mx-auto px-4 flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar */}
        <aside className="w-full lg:w-1/4 shrink-0">
          <div className="sticky top-24 bg-card/80 backdrop-blur-md border rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-6">Filter Experts</h2>
            
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold mb-2 block text-muted-foreground">Search</label>
                <Input 
                  placeholder="Keywords, skills..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-background"
                />
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

        {/* Main Content */}
        <main className="flex-1">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Find Your Expert</h1>
            <p className="text-muted-foreground">
              {expertData ? `Showing ${expertData.total} experts` : 'Loading experts...'}
            </p>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-64 rounded-3xl" />
              ))}
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
  );
}

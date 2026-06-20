import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useListExperts, useListReviews } from "@workspace/api-client-react";
import { ExpertCard } from "@/components/expert-card";

const INDUSTRIES = [
  "Agriculture & Agribusiness", "Beauty & Salons", "Construction & Contracting", 
  "Education & Training", "E-commerce & Retail", "Financial Services", 
  "Healthcare & Clinics", "Hospitality & Tourism", "Logistics & Transport", 
  "Manufacturing & SMEs", "Real Estate", "Restaurants & Food Business", "Tech Startups"
];

export default function Home() {
  const { data: expertData, isLoading: expertsLoading } = useListExperts({ limit: 3 });
  const { data: reviewsData, isLoading: reviewsLoading } = useListReviews();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background py-24 sm:py-32">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-accent/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-secondary/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
        
        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              For Business Owners Who Are Tired of Guessing
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Finally, Someone <br className="hidden md:block"/> Who Gets It
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Stuck on pricing? Losing staff? Stalled on growth? Talk to someone who has actually fixed this exact problem before — not a textbook, not a guess. Just real answers from people who have built what you're building.
            </p>
            
            <div className="max-w-2xl mx-auto mt-8 relative">
              <div className="flex items-center p-2 bg-card rounded-2xl shadow-lg border relative z-20">
                <Input 
                  type="text" 
                  placeholder="What's keeping you up at night? Try 'pricing,' 'staff turnover,' 'growth'" 
                  className="border-0 shadow-none focus-visible:ring-0 text-base h-12"
                />
                <Link href="/experts">
                  <Button size="lg" className="rounded-xl h-12 px-8 whitespace-nowrap">Find My Person</Button>
                </Link>
              </div>
            </div>

            <div className="pt-8">
              <a href="#how-it-works" className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
                See How It Works ↓
              </a>
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
              No long forms. No waiting weeks for a consultant. Just real help, fast — book a call and start solving it today.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: "01", title: "Search your problem", desc: "Browse by industry or specific challenge." },
              { step: "02", title: "Pick an expert", desc: "Find someone who has lived your exact reality." },
              { step: "03", title: "Book a session", desc: "Choose Discovery, Consultancy, or Growth Strategy." },
              { step: "04", title: "Get unstuck", desc: "Have a real conversation. Get actionable answers." }
            ].map((s) => (
              <div key={s.step} className="p-6 rounded-3xl bg-card border shadow-sm relative overflow-hidden group">
                <div className="text-5xl font-black text-primary/10 mb-4 group-hover:text-primary/20 transition-colors">{s.step}</div>
                <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                <p className="text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Whatever Your Business Is, Someone Here Has Lived It</h2>
          <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
            {INDUSTRIES.map(ind => (
              <Link key={ind} href={`/experts?industry=${encodeURIComponent(ind)}`}>
                <div className="px-6 py-3 rounded-full border bg-card hover:bg-primary/5 hover:border-primary/30 transition-all cursor-pointer font-medium text-sm shadow-sm hover:shadow">
                  {ind}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Experts */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">The People Who've Actually Done It</h2>
          
          {expertsLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1,2,3].map(i => <div key={i} className="h-64 rounded-3xl bg-muted animate-pulse"></div>)}
            </div>
          ) : expertData?.experts?.length ? (
            <div className="grid md:grid-cols-3 gap-6">
              {expertData.experts.map(expert => (
                <ExpertCard key={expert.id} expert={expert as any} />
              ))}
            </div>
          ) : (
            <div className="text-center p-12 bg-card rounded-3xl border max-w-2xl mx-auto">
              <h3 className="text-xl font-semibold mb-4">We're building our founding roster</h3>
              <p className="text-muted-foreground mb-8">
                We're hand-picking our very first experts right now — people who've genuinely run businesses like yours. Thank you for your patience as we bring them on board.
              </p>
              <Link href="/apply-expert">
                <Button>Apply as a Founding Expert</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Reviews */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Business Owners Just Like You, Telling It Like It Is</h2>
          
          {reviewsLoading ? (
            <div className="text-center">Loading reviews...</div>
          ) : reviewsData?.length ? (
            <div className="grid md:grid-cols-3 gap-6">
              {reviewsData.slice(0, 3).map(review => (
                <div key={review.id} className="p-6 rounded-3xl bg-card border">
                  <div className="flex text-yellow-500 mb-4">{"★".repeat(review.rating)}</div>
                  <p className="italic text-muted-foreground mb-4">"{review.body}"</p>
                  <div className="font-semibold">{review.reviewerName}</div>
                  {review.businessName && <div className="text-sm text-muted-foreground">{review.businessName}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-12 bg-card rounded-3xl border max-w-2xl mx-auto">
              <p className="text-muted-foreground mb-8">Be the first to tell your story.</p>
              <Button variant="outline">Leave a Review</Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

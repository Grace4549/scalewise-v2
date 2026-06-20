import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetExpert, useCreateBooking } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const bookingSchema = z.object({
  sessionType: z.enum(["discovery", "consultancy", "growth_3mo", "growth_6mo"]),
  scheduledTime: z.string().min(1, "Please select a date/time"),
  notes: z.string().optional(),
});

type ReviewData = {
  id: number;
  reviewerName: string;
  businessName?: string | null;
  rating: number;
  body: string;
  reviewType: string;
  createdAt: string;
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= rating ? "text-yellow-500" : "text-muted-foreground/30"}>★</span>
      ))}
    </div>
  );
}

function ReviewCard({ review }: { review: ReviewData }) {
  return (
    <div className="border-b last:border-0 pb-5 last:pb-0">
      <div className="flex items-center gap-3 mb-2">
        <StarRating rating={review.rating} />
        {review.reviewType === "verified" && (
          <Badge className="text-xs bg-green-100 text-green-700 border-green-200 font-semibold">✓ Verified Booking</Badge>
        )}
      </div>
      <p className="text-muted-foreground leading-relaxed mb-2">"{review.body}"</p>
      <div className="text-sm font-semibold text-foreground">{review.reviewerName}</div>
    </div>
  );
}

export default function ExpertProfile() {
  const { id } = useParams();
  const expertId = parseInt(id!);
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeReviewTab, setActiveReviewTab] = useState<"all" | "verified">("all");
  const createBooking = useCreateBooking();

  const { data: expert, isLoading } = useGetExpert(expertId);

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { sessionType: "discovery", scheduledTime: "", notes: "" },
  });

  const sessionType = form.watch("sessionType");

  const getPrice = (type: string) => {
    if (!expert) return null;
    switch (type) {
      case "discovery": return expert.discoveryPrice;
      case "consultancy": return expert.consultancyPrice;
      case "growth_3mo": return expert.growthPrice3mo;
      case "growth_6mo": return expert.growthPrice6mo;
      default: return null;
    }
  };

  const getDuration = (type: string) => {
    if (type === "discovery") return 30;
    return 60;
  };

  const onSubmit = (data: z.infer<typeof bookingSchema>) => {
    if (!user) {
      toast({ title: "Please login to book", variant: "destructive" });
      return;
    }
    createBooking.mutate({
      data: {
        expertId,
        sessionType: data.sessionType as any,
        scheduledTime: new Date(data.scheduledTime).toISOString(),
        durationMinutes: getDuration(data.sessionType),
        notes: data.notes,
      },
    }, {
      onSuccess: () => {
        toast({ title: "Booking request sent!", description: "You'll receive a Google Meet link once confirmed." });
        form.reset();
      },
      onError: (err: any) => {
        toast({ title: "Failed to book", description: err.message, variant: "destructive" });
      },
    });
  };

  if (isLoading) {
    return <div className="container mx-auto p-8"><Skeleton className="h-[60vh] w-full rounded-3xl" /></div>;
  }

  if (!expert) {
    return <div className="container mx-auto p-8 text-center">Expert not found</div>;
  }

  const selectedPrice = getPrice(sessionType);
  const allReviews: ReviewData[] = [
    ...(expert.verifiedReviews ?? []),
    ...(expert.reviews ?? []),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const verifiedReviews: ReviewData[] = expert.verifiedReviews ?? [];
  const displayedReviews = activeReviewTab === "verified" ? verifiedReviews : allReviews;

  return (
    <div className="bg-muted/10 min-h-screen py-12">
      <div className="container mx-auto px-4 flex flex-col lg:flex-row gap-8">

        {/* Main Content */}
        <div className="flex-1 space-y-8">
          {/* Expert Header */}
          <div className="bg-card border p-8 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-r from-primary/20 to-accent/20"></div>
            <div className="relative pt-14 flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="w-24 h-24 border-4 border-card bg-muted shadow-md">
                <AvatarImage src={expert.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl font-bold">{expert.name.charAt(0)}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">{expert.name}</h1>
                    <p className="text-lg text-primary font-medium mt-1">{expert.headline}</p>
                  </div>
                  <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded-full font-bold">
                    <span className="text-lg">★</span>
                    <span>{expert.rating.toFixed(1)}</span>
                    {verifiedReviews.length > 0 && (
                      <span className="text-xs font-normal text-yellow-600 ml-1">({verifiedReviews.length} verified)</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-secondary/20 px-3 py-1 text-sm font-semibold">
                    {expert.industry}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                    {expert.yearsExperience} Years Experience
                  </span>
                  <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                    {expert.totalSessions} Sessions
                  </span>
                </div>
              </div>
            </div>

            {expert.bio && (
              <div className="mt-8 pt-8 border-t">
                <h2 className="text-xl font-bold mb-3">About</h2>
                <div className="prose max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {expert.bio}
                </div>
              </div>
            )}

            {expert.skills && expert.skills.length > 0 && (
              <div className="mt-8 pt-8 border-t">
                <h2 className="text-xl font-bold mb-4">Expertise</h2>
                <div className="flex flex-wrap gap-2">
                  {expert.skills.map((skill) => (
                    <span key={skill} className="px-3 py-1.5 bg-muted rounded-xl text-sm font-medium">{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reviews Section */}
          <div className="bg-card border p-8 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Client Reviews</h2>
              {verifiedReviews.length > 0 && (
                <div className="flex rounded-xl bg-muted overflow-hidden text-sm">
                  <button
                    onClick={() => setActiveReviewTab("all")}
                    className={`px-4 py-2 font-medium transition-colors ${activeReviewTab === "all" ? "bg-card shadow" : "text-muted-foreground"}`}
                  >
                    All ({allReviews.length})
                  </button>
                  <button
                    onClick={() => setActiveReviewTab("verified")}
                    className={`px-4 py-2 font-medium transition-colors ${activeReviewTab === "verified" ? "bg-card shadow text-green-700" : "text-muted-foreground"}`}
                  >
                    ✓ Verified ({verifiedReviews.length})
                  </button>
                </div>
              )}
            </div>

            {displayedReviews.length ? (
              <div className="space-y-6">
                {displayedReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-3xl mb-2">⭐</div>
                <p className="font-medium">No reviews yet.</p>
                <p className="text-sm mt-1">Be the first to book a session with this expert.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Booking Widget */}
        <aside className="w-full lg:w-[390px] shrink-0">
          <div className="sticky top-24 bg-card/90 backdrop-blur-md border rounded-3xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-2">Book a Session</h3>
            <p className="text-sm text-muted-foreground mb-6">Choose your session type and preferred time.</p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField control={form.control} name="sessionType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 bg-background">
                          <SelectValue placeholder="Select session type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expert.discoveryPrice != null && <SelectItem value="discovery">Business Discovery — 30 min</SelectItem>}
                        {expert.consultancyPrice != null && <SelectItem value="consultancy">Consultancy — 60 min</SelectItem>}
                        {expert.growthPrice3mo != null && <SelectItem value="growth_3mo">Growth Strategy (3 months)</SelectItem>}
                        {expert.growthPrice6mo != null && <SelectItem value="growth_6mo">Growth Strategy (6 months)</SelectItem>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex justify-between items-center">
                  <span className="font-semibold text-foreground">Price</span>
                  <span className="text-xl font-bold text-primary">
                    {selectedPrice != null ? `KES ${selectedPrice.toLocaleString()}` : "Select a type"}
                  </span>
                </div>

                <FormField control={form.control} name="scheduledTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" className="bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>What do you want to discuss?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share some context before the call..."
                        className="bg-background resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {user ? (
                  <Button type="submit" size="lg" className="w-full text-lg h-14 rounded-xl" disabled={createBooking.isPending || selectedPrice == null}>
                    {createBooking.isPending ? "Requesting..." : "Request Booking"}
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button variant="outline" size="lg" className="w-full text-lg h-14 rounded-xl">
                      Login to Book
                    </Button>
                  </Link>
                )}

                <p className="text-xs text-center text-muted-foreground">
                  You'll receive a Google Meet link upon confirmation.
                </p>
              </form>
            </Form>
          </div>
        </aside>
      </div>
    </div>
  );
}

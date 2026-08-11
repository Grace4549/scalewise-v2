import { usePageTitle } from "@/hooks/use-page-title";
import { useState, useMemo } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  useGetExpert, useCreateVerifiedReview, useListMyBookings,
  useGetExpertAvailability, useCreateBooking, customFetch,
} from "@workspace/api-client-react";
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
import { AnnouncementBanner } from "@/components/announcement-banner";

const bookingSchema = z.object({
  sessionType: z.enum(["discovery", "consultancy", "growth_3mo", "growth_6mo"]),
  scheduledTime: z.string().min(1, "Please select an available time slot"),
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
      <div className="text-sm font-semibold text-foreground">
        {review.reviewerName}{review.businessName ? `, ${review.businessName}` : ""}
      </div>
    </div>
  );
}

const P_MGREEN = "#88CFA8";
const P_BLUE   = "#6395EE";

function ClientReviewForm({ expertId }: { expertId: number }) {
  const { data: myBookings } = useListMyBookings();
  const createVerifiedReview = useCreateVerifiedReview();
  const { toast } = useToast();

  const completedBookings = myBookings?.filter(
    (b) => b.expertId === expertId && b.status === "completed"
  ) ?? [];

  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [done, setDone] = useState(false);

  const bookingId = selectedBookingId ?? (completedBookings.length === 1 ? completedBookings[0].id : null);

  if (completedBookings.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-3">🎓</div>
        <p className="font-semibold">No completed sessions yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Only clients who have completed a session with this expert can leave a review.
        </p>
        <Link href="/experts">
          <Button variant="outline" className="mt-4">Browse Experts</Button>
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-3">🙏</div>
        <p className="font-semibold text-lg" style={{ color: P_MGREEN }}>Thank you for your review!</p>
        <p className="text-sm text-muted-foreground mt-1">Your verified review helps other business owners.</p>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId || !body.trim()) return;
    createVerifiedReview.mutate(
      { data: { expertId, bookingId, rating, body: body.trim(), businessName: businessName.trim() || undefined } },
      {
        onSuccess: () => setDone(true),
        onError: (err: any) => toast({ title: "Review failed", description: err.message, variant: "destructive" }),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {completedBookings.length > 1 && (
        <div>
          <label className="block text-sm font-medium mb-1.5">Which session are you reviewing?</label>
          <select
            className="w-full h-10 px-3 rounded-lg border bg-background text-sm"
            value={bookingId ?? ""}
            onChange={(e) => setSelectedBookingId(Number(e.target.value) || null)}
            required
          >
            <option value="">Select a session…</option>
            {completedBookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.sessionType.replace(/_/g, " ")} — {new Date(b.scheduledTime).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">
          Your business or role <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
          placeholder="e.g. Salon owner, Westlands or Restaurant founder, Nairobi." />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Rating</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <button key={s} type="button" onClick={() => setRating(s)}
              className="text-3xl transition-transform hover:scale-110 focus:outline-none">
              <span style={{ color: s <= rating ? P_MGREEN : "#d1d5db" }}>★</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Your Review <span className="text-red-500">*</span></label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Share what you found most valuable about working with this expert…"
          rows={4} required />
      </div>

      <Button type="submit" className="w-full"
        disabled={createVerifiedReview.isPending || !body.trim() || !bookingId}
        style={{ background: P_MGREEN, color: "#083d2e" }}>
        {createVerifiedReview.isPending ? "Submitting…" : "Submit Verified Review"}
      </Button>
    </form>
  );
}

function GatedReviewSection({ expertId, user }: { expertId: number; user: any | null }) {
  if (!user) {
    return (
      <div className="bg-card border p-8 rounded-3xl shadow-sm text-center">
        <h2 className="text-2xl font-bold mb-2">Leave a Review</h2>
        <p className="text-muted-foreground text-sm mb-5">
          Only clients with a completed session can review this expert.
        </p>
        <Link href="/login">
          <Button style={{ background: P_BLUE }}>Log in to Review</Button>
        </Link>
      </div>
    );
  }

  if (user.role === "expert" || user.role === "admin") return null;

  return (
    <div className="bg-card border p-8 rounded-3xl shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold">Leave a Review</h2>
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
          style={{ backgroundColor: P_MGREEN + "20", color: "#1a5730" }}>
          ✓ Verified sessions only
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Your review is linked to a real session and shown as verified.
      </p>
      <ClientReviewForm expertId={expertId} />
    </div>
  );
}

// ── Slot picker ──────────────────────────────────────────────────────────────

type Slot = { id: number; expertId: number; startTime: string; createdAt: string };

function SlotPicker({
  slots,
  selected,
  onSelect,
}: {
  slots: Slot[];
  selected: string;
  onSelect: (iso: string) => void;
}) {
  // Group slots by calendar date label
  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const d = new Date(s.startTime);
      const key = d.toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [slots]);

  const dates = Array.from(grouped.keys());
  const [activeDate, setActiveDate] = useState<string>(() => dates[0] ?? "");

  // If no slots at all
  if (slots.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        <div className="text-2xl mb-1">📅</div>
        <p className="font-medium">No available slots yet</p>
        <p className="mt-0.5">This expert hasn't published their availability calendar yet.</p>
      </div>
    );
  }

  const daySlots = grouped.get(activeDate) ?? [];

  return (
    <div className="space-y-3">
      {/* Date tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {dates.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => { setActiveDate(d); onSelect(""); }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            style={activeDate === d
              ? { backgroundColor: P_BLUE, color: "white", borderColor: P_BLUE }
              : { borderColor: "#e5e7eb", color: "#374151" }}>
            {d}
          </button>
        ))}
      </div>

      {/* Time slots for selected date */}
      <div className="flex flex-wrap gap-2">
        {daySlots.map((s) => {
          const iso = s.startTime;
          const label = new Date(s.startTime).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", hour12: true });
          const isSelected = selected === iso;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(isSelected ? "" : iso)}
              className="px-3 py-2 rounded-lg text-sm font-semibold border transition-all"
              style={isSelected
                ? { backgroundColor: P_BLUE, color: "white", borderColor: P_BLUE }
                : { borderColor: "#d1d5db", color: "#111827", backgroundColor: "white" }}>
              {label}
            </button>
          );
        })}
      </div>

      {selected && (
        <p className="text-xs font-medium" style={{ color: P_BLUE }}>
          ✓ Selected: {new Date(selected).toLocaleString("en-KE", {
            weekday: "short", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true,
          })}
        </p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ExpertProfile() {
  usePageTitle("Expert Profile — ScaleWise");
  const { id } = useParams();
  const expertId = parseInt(id!);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [activeReviewTab, setActiveReviewTab] = useState<"all" | "verified">("all");
  const [bookingAttempted, setBookingAttempted] = useState(false);

  const { data: expert, isLoading } = useGetExpert(expertId);
  const { data: availabilitySlots = [] } = useGetExpertAvailability(expertId);

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: () => customFetch<{ testMode: boolean }>("/api/config"),
  });
  const testMode = config?.testMode ?? false;

  const createBookingMutation = useCreateBooking();

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { sessionType: "discovery", scheduledTime: "", notes: "" },
  });

  const sessionType = form.watch("sessionType");
  const selectedTime = form.watch("scheduledTime");

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

  const onSubmit = (values: z.infer<typeof bookingSchema>) => {
    if (testMode) {
      createBookingMutation.mutate(
        { data: { expertId, sessionType: values.sessionType, scheduledTime: values.scheduledTime, notes: values.notes || undefined, isTestBooking: true } },
        {
          onSuccess: () => {
            toast({ title: "Test booking created!", description: "Your test booking has been placed without payment." });
            navigate("/dashboard/client");
          },
          onError: (err: any) => {
            toast({ title: "Booking failed", description: err?.message ?? "Something went wrong", variant: "destructive" });
          },
        }
      );
    } else {
      setBookingAttempted(true);
    }
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
                <p className="text-sm mt-1">Be the first to share your experience.</p>
              </div>
            )}
          </div>

          {/* Leave a Review — gated to clients with completed sessions */}
          <GatedReviewSection expertId={expertId} user={user} />
        </div>

        {/* Sticky Booking Widget */}
        <aside className="w-full lg:w-[390px] shrink-0">
          <div className="sticky top-24 bg-card/90 backdrop-blur-md border rounded-3xl p-6 shadow-lg">

            {bookingAttempted ? (
              /* ── Payment unavailable screen ── */
              <div className="text-center py-2">
                <div className="text-4xl mb-4">🚧</div>
                <h3 className="text-lg font-bold mb-3 text-foreground">
                  This service is currently unavailable
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  We're still working on our platform. Please bear with us while we get ready to launch.
                </p>

                <div className="bg-muted/40 rounded-2xl p-4 mb-5 text-left">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Get notified when we launch
                  </p>
                  <AnnouncementBanner inline />
                </div>

                <button
                  onClick={() => setBookingAttempted(false)}
                  className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                >
                  ← Back to session details
                </button>
              </div>
            ) : (
              /* ── Normal booking form ── */
              <>
                <h3 className="text-xl font-bold mb-2">Book a Session</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Choose a session type and select one of this expert's available time slots.
                </p>

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

                    {/* Available slot picker */}
                    <FormField control={form.control} name="scheduledTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Time Slots</FormLabel>
                        <FormControl>
                          <SlotPicker
                            slots={availabilitySlots}
                            selected={field.value}
                            onSelect={(iso) => field.onChange(iso)}
                          />
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
                      <Button type="submit" size="lg" className="w-full text-lg h-14 rounded-xl"
                        disabled={selectedPrice == null || !selectedTime || createBookingMutation.isPending}
                        style={{ background: testMode ? "#f59e0b" : P_BLUE, color: "white" }}>
                        {testMode ? "Complete Test Booking (No Payment)" : "Request Booking"}
                      </Button>
                    ) : (
                      <Link href="/login">
                        <Button variant="outline" size="lg" className="w-full text-lg h-14 rounded-xl">
                          Login to Book
                        </Button>
                      </Link>
                    )}

                    <p className="text-xs text-center text-muted-foreground">
                      {testMode
                        ? "🧪 Test mode — no payment is processed."
                        : "Payment is required to confirm your session."}
                    </p>
                  </form>
                </Form>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

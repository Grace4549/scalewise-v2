import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetExpert, useListReviews, useCreateBooking } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
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

export default function ExpertProfile() {
  const { id } = useParams();
  const expertId = parseInt(id!);
  const { user } = useAuth();
  const { toast } = useToast();
  const createBooking = useCreateBooking();
  
  const { data: expert, isLoading } = useGetExpert(expertId);
  const { data: reviews, isLoading: reviewsLoading } = useListReviews({ expertId });

  const form = useForm<z.infer<typeof bookingSchema>>({
    resolver: zodResolver(bookingSchema),
    defaultValues: { sessionType: "discovery", scheduledTime: "", notes: "" },
  });

  const sessionType = form.watch("sessionType");

  const getPrice = (type: string) => {
    if (!expert) return null;
    switch (type) {
      case 'discovery': return expert.discoveryPrice;
      case 'consultancy': return expert.consultancyPrice;
      case 'growth_3mo': return expert.growthPrice3mo;
      case 'growth_6mo': return expert.growthPrice6mo;
      default: return null;
    }
  };

  const getDuration = (type: string) => {
    if (type === 'discovery') return 30;
    if (type === 'consultancy') return 60;
    return 60; // default session time for growth plans
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
        notes: data.notes
      }
    }, {
      onSuccess: () => {
        toast({ title: "Booking request sent successfully!" });
        form.reset();
      },
      onError: (err: any) => {
        toast({ title: "Failed to book", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return <div className="container mx-auto p-8"><Skeleton className="h-[60vh] w-full rounded-3xl" /></div>;
  }

  if (!expert) {
    return <div className="container mx-auto p-8 text-center">Expert not found</div>;
  }

  const selectedPrice = getPrice(sessionType);

  return (
    <div className="bg-muted/10 min-h-screen py-12">
      <div className="container mx-auto px-4 flex flex-col lg:flex-row gap-8">
        
        {/* Main Content */}
        <div className="flex-1 space-y-8">
          <div className="bg-card border p-8 rounded-3xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary/20 to-accent/20"></div>
            <div className="relative pt-16 flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="w-24 h-24 border-4 border-card bg-muted">
                <AvatarImage src={expert.avatarUrl || undefined} />
                <AvatarFallback className="text-2xl">{expert.name.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">{expert.name}</h1>
                    <p className="text-xl text-primary font-medium mt-1">{expert.headline}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-700 px-3 py-1.5 rounded-full font-bold">
                    <span>★</span>
                    <span>{expert.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground font-normal ml-1">({expert.totalSessions} sessions)</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-secondary/20 px-3 py-1 text-sm font-semibold text-secondary-foreground">
                    {expert.industry}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
                    {expert.yearsExperience} Years Experience
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t">
              <h2 className="text-2xl font-bold mb-4">About Me</h2>
              <div className="prose max-w-none text-muted-foreground whitespace-pre-wrap">
                {expert.bio || "No bio provided."}
              </div>
            </div>

            {expert.skills && expert.skills.length > 0 && (
              <div className="mt-8 pt-8 border-t">
                <h2 className="text-xl font-bold mb-4">Expertise</h2>
                <div className="flex flex-wrap gap-2">
                  {expert.skills.map(skill => (
                    <span key={skill} className="px-3 py-1.5 bg-muted rounded-lg text-sm font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reviews */}
          <div className="bg-card border p-8 rounded-3xl shadow-sm">
            <h2 className="text-2xl font-bold mb-6">Client Reviews</h2>
            {reviewsLoading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : reviews?.length ? (
              <div className="space-y-6">
                {reviews.map(review => (
                  <div key={review.id} className="border-b last:border-0 pb-6 last:pb-0">
                    <div className="flex text-yellow-500 mb-2">{"★".repeat(review.rating)}</div>
                    <p className="text-muted-foreground mb-3">{review.body}</p>
                    <div className="text-sm font-semibold">{review.reviewerName}</div>
                    {review.businessName && <div className="text-xs text-muted-foreground">{review.businessName}</div>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground italic">No reviews yet.</p>
            )}
          </div>
        </div>

        {/* Sticky Booking Widget */}
        <aside className="w-full lg:w-[400px] shrink-0">
          <div className="sticky top-24 bg-card/90 backdrop-blur-md border rounded-3xl p-6 shadow-lg">
            <h3 className="text-xl font-bold mb-6">Book a Session</h3>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        {expert.discoveryPrice && <SelectItem value="discovery">Business Discovery</SelectItem>}
                        {expert.consultancyPrice && <SelectItem value="consultancy">Consultancy</SelectItem>}
                        {expert.growthPrice3mo && <SelectItem value="growth_3mo">Growth Strategy (3mo)</SelectItem>}
                        {expert.growthPrice6mo && <SelectItem value="growth_6mo">Growth Strategy (6mo)</SelectItem>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="p-4 bg-muted rounded-xl flex justify-between items-center">
                  <span className="font-semibold">Price</span>
                  <span className="text-xl font-bold text-primary">
                    {selectedPrice ? `KES ${selectedPrice.toLocaleString()}` : 'Select a type'}
                  </span>
                </div>

                <FormField control={form.control} name="scheduledTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Date & Time</FormLabel>
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
                      <Textarea placeholder="Share some context before the call..." className="bg-background resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {user ? (
                  <Button type="submit" size="lg" className="w-full text-lg h-14 rounded-xl" disabled={createBooking.isPending || !selectedPrice}>
                    {createBooking.isPending ? "Requesting..." : "Request Booking"}
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button variant="outline" size="lg" className="w-full text-lg h-14 rounded-xl">
                      Login to Book
                    </Button>
                  </Link>
                )}
              </form>
            </Form>
          </div>
        </aside>

      </div>
    </div>
  );
}

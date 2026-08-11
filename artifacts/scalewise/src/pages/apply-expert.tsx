import { usePageTitle } from "@/hooks/use-page-title";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useApplyAsExpert, useListIndustries } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const P = {
  blue:   "#6395EE",
  mgreen: "#88CFA8",
  mint:   "#85DECB",
};

// Normalise a URL entered by the user — prepend https:// if no protocol is present
function normaliseUrl(val: string): string {
  const trimmed = val.trim();
  if (!trimmed) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

const urlFieldSchema = z
  .string()
  .transform(normaliseUrl)
  .pipe(z.string().url("Enter a valid URL (e.g. linkedin.com/in/yourname)").or(z.literal("")))
  .optional();

const applySchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  companyName: z.string().optional(),
  industry: z.string().min(1, "Industry is required"),
  yearsExperience: z.coerce.number().min(1, "Must have at least 1 year of experience"),
  headline: z.string().min(10, "Headline is required (min 10 chars)"),
  bio: z.string().min(50, "Bio must be at least 50 characters"),
  skills: z.string().transform(val => val.split(',').map(s => s.trim()).filter(Boolean)),
  linkedinUrl: urlFieldSchema,
  socialMediaUrl: urlFieldSchema,
  discoveryPrice: z.coerce.number().optional(),
  consultancyPrice: z.coerce.number().optional(),
  growthPrice3mo: z.coerce.number().optional(),
  growthPrice6mo: z.coerce.number().optional(),
}).refine(
  (d) => (d.linkedinUrl && d.linkedinUrl.length > 0) || (d.socialMediaUrl && d.socialMediaUrl.length > 0),
  { message: "Please provide at least one link (LinkedIn or social media) so we can verify your background.", path: ["_urlRequired"] }
);

export default function ApplyExpert() {
  usePageTitle("Become an Expert — GrowPia");
  const [submitted, setSubmitted] = useState(false);
  const applyAsExpert = useApplyAsExpert();
  const { data: industries } = useListIndustries();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof applySchema>>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      name: "",
      email: "",
      companyName: "",
      industry: "",
      yearsExperience: 5,
      headline: "",
      bio: "",
      skills: "" as any,
      linkedinUrl: "",
      socialMediaUrl: "",
    },
  });

  const onSubmit = (data: z.infer<typeof applySchema>) => {
    applyAsExpert.mutate({ data: {
      name: data.name,
      email: data.email,
      companyName: data.companyName || undefined,
      industry: data.industry,
      yearsExperience: data.yearsExperience,
      headline: data.headline,
      bio: data.bio,
      skills: data.skills,
      linkedinUrl: data.linkedinUrl || undefined,
      socialMediaUrl: data.socialMediaUrl || undefined,
      discoveryPrice: data.discoveryPrice,
      consultancyPrice: data.consultancyPrice,
      growthPrice3mo: data.growthPrice3mo,
      growthPrice6mo: data.growthPrice6mo,
    }}, {
      onSuccess: () => setSubmitted(true),
      onError: (err: any) => {
        toast({
          title: "Application failed",
          description: err?.message || "Please check your inputs and try again.",
          variant: "destructive"
        });
      }
    });
  };

  if (submitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="text-center max-w-lg p-10 rounded-3xl bg-card border shadow-lg">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl text-white"
            style={{ background: P.mgreen }}
          >
            ✓
          </div>
          <h1 className="text-3xl font-bold mb-4">Application Received!</h1>
          <p className="text-muted-foreground mb-3">
            Thank you for applying to be a Founding Expert on GrowPia. Our team will carefully review your application.
          </p>
          <p className="text-muted-foreground mb-8">
            <span className="font-semibold" style={{ color: P.blue }}>If approved</span>, we will send you an email with the next steps to complete your profile and start accepting bookings.
          </p>
          <Link href="/">
            <Button className="rounded-xl px-8" style={{ background: P.blue }}>Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-14 container mx-auto px-4 max-w-3xl">
      <div className="text-center mb-7">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Apply as a Founding Expert</h1>
        <p className="text-xl text-muted-foreground">Share your hard-earned experience with business owners who need it.</p>
      </div>

      <div className="p-8 rounded-3xl bg-card border shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold border-b pb-2">Personal Details</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Company / Business Name <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <FormDescription>The business or organisation you currently operate or have built.</FormDescription>
                  <FormControl><Input {...field} placeholder="e.g., Acme Ltd, Freelance" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-semibold border-b pb-2">Professional Experience</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="industry" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {industries?.map(ind => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="yearsExperience" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Years of Experience</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="headline" render={({ field }) => (
                <FormItem>
                  <FormLabel>Professional Headline</FormLabel>
                  <FormDescription>e.g., Ex-COO of TechCorp | Scaling B2B SaaS</FormDescription>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormDescription>Tell us about the businesses you've built and the challenges you've solved.</FormDescription>
                  <FormControl><Textarea rows={5} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="skills" render={({ field }) => (
                <FormItem>
                  <FormLabel>Skills & Expertise (comma separated)</FormLabel>
                  <FormDescription>e.g., Pricing Strategy, Hiring, Cash Flow Management</FormDescription>
                  <FormControl><Input {...field} placeholder="Pricing, Hiring, Strategy..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold border-b pb-2 mb-1">Online Presence</h2>
                <p className="text-sm text-muted-foreground mt-2">
                  These links help us verify your professional background.{" "}
                  <span className="font-semibold text-foreground">Please provide at least one.</span>
                  {" "}You can enter the URL with or without <code>https://</code>.
                </p>
              </div>
              {/* Cross-field URL error shown prominently */}
              {(form.formState.errors as any)._urlRequired && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 flex items-start gap-2">
                  <span className="mt-0.5">⚠️</span>
                  <span>{(form.formState.errors as any)._urlRequired.message}</span>
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="linkedinUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn Profile</FormLabel>
                    <FormControl><Input {...field} placeholder="linkedin.com/in/yourname" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="socialMediaUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Social Media Page <span className="text-muted-foreground font-normal">(Facebook, Instagram or TikTok)</span></FormLabel>
                    <FormControl><Input {...field} placeholder="instagram.com/yourbusiness" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="space-y-6">
              <h2 className="text-2xl font-semibold border-b pb-2">Set Your Session Prices</h2>
              <p className="text-sm text-muted-foreground mb-4">Set the prices you want to charge clients per session type. You can leave fields blank if you don't wish to offer that session type.</p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="discoveryPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Discovery (30 mins)</FormLabel>
                    <FormControl><Input type="number" placeholder="KES" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="consultancyPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consultancy (60 mins)</FormLabel>
                    <FormControl><Input type="number" placeholder="KES" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="growthPrice3mo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Growth Strategy (3 Months)</FormLabel>
                    <FormControl><Input type="number" placeholder="KES" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="growthPrice6mo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Growth Strategy (6 Months)</FormLabel>
                    <FormControl><Input type="number" placeholder="KES" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {Object.keys(form.formState.errors).length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                ⚠️ Please fix the highlighted errors above before submitting.
              </div>
            )}

            <Button type="submit" size="lg" className="w-full text-lg" disabled={applyAsExpert.isPending}
              style={{ background: P.blue }}>
              {applyAsExpert.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

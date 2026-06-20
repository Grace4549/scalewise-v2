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

const applySchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  industry: z.string().min(1, "Industry is required"),
  yearsExperience: z.coerce.number().min(1, "Must have at least 1 year of experience"),
  headline: z.string().min(10, "Headline is required (min 10 chars)"),
  bio: z.string().min(50, "Bio must be at least 50 characters"),
  skills: z.string().transform(val => val.split(',').map(s => s.trim()).filter(Boolean)),
  discoveryPrice: z.coerce.number().optional(),
  consultancyPrice: z.coerce.number().optional(),
  growthPrice3mo: z.coerce.number().optional(),
  growthPrice6mo: z.coerce.number().optional(),
});

export default function ApplyExpert() {
  const [submitted, setSubmitted] = useState(false);
  const applyAsExpert = useApplyAsExpert();
  const { data: industries } = useListIndustries();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof applySchema>>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      name: "",
      email: "",
      industry: "",
      yearsExperience: 5,
      headline: "",
      bio: "",
      skills: "" as any,
    },
  });

  const onSubmit = (data: z.infer<typeof applySchema>) => {
    applyAsExpert.mutate({ data }, {
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
        <div className="text-center max-w-md p-8 rounded-3xl bg-card border shadow-lg">
          <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">✓</div>
          <h1 className="text-3xl font-bold mb-4">Application Received</h1>
          <p className="text-muted-foreground mb-8">
            Thank you for applying to be a Founding Expert on ScaleWise. Our team will review your application and get back to you shortly.
          </p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 md:py-24 container mx-auto px-4 max-w-3xl">
      <div className="text-center mb-12">
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

            <Button type="submit" size="lg" className="w-full text-lg" disabled={applyAsExpert.isPending}>
              {applyAsExpert.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

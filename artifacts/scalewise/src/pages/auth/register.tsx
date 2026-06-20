import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const P = { blue: "#6395EE", mgreen: "#88CFA8" };

const registerSchema = z.object({
  name:     z.string().min(2, "Name is required"),
  email:    z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role:     z.enum(["client", "expert"]),
});

type RegisterData = z.infer<typeof registerSchema>;

export default function Register() {
  const registerMutation = useRegister();
  const { refetch }      = useAuth();
  const [, setLocation]  = useLocation();
  const { toast }        = useToast();
  const queryClient      = useQueryClient();

  const params      = new URLSearchParams(window.location.search);
  const roleParam   = params.get("role");
  const emailParam  = params.get("email") ?? "";
  const tokenParam  = params.get("token") ?? "";
  const role: "client" | "expert" =
    roleParam === "expert" ? "expert" : "client";

  const form = useForm<RegisterData>({
    resolver:      zodResolver(registerSchema),
    defaultValues: { name: "", email: emailParam, password: "", role },
  });

  const onSubmit = (data: RegisterData) => {
    const payload: any = { ...data };
    if (role === "expert" && tokenParam) payload.inviteToken = tokenParam;
    registerMutation.mutate({ data: payload }, {
      onSuccess: (res) => {
        queryClient.setQueryData(getGetMeQueryKey(), (res as any).user ?? null);
        refetch();
        if (data.role === "expert") {
          setLocation("/expert/dashboard");
        } else {
          setLocation("/");
        }
      },
      onError: (err: any) => {
        toast({
          title:       "Registration failed",
          description: err?.message || "An error occurred during registration",
          variant:     "destructive",
        });
      },
    });
  };

  if (role === "expert") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-card border shadow-lg text-center space-y-5">
          <div
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{ background: P.mgreen + "14", color: P.mgreen }}
          >
            Expert Account
          </div>
          <h1 className="text-2xl font-bold">Creating Your Expert Account</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Expert accounts are created only after admin approval of your application.
            If your application has been approved, enter the email you applied with below.
          </p>
          <div className="text-left">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <input type="hidden" {...form.register("role")} value="expert" />
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (same as your application)</FormLabel>
                    <FormControl><Input placeholder="name@company.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Choose a Password</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={registerMutation.isPending}
                  style={{ background: P.mgreen, color: "#083d2e" }}
                >
                  {registerMutation.isPending ? "Verifying…" : "Create My Account"}
                </Button>
              </form>
            </Form>
          </div>
          <p className="text-sm text-muted-foreground">
            Have not applied yet?{" "}
            <Link href="/apply-expert" className="font-semibold underline" style={{ color: P.mgreen }}>
              Submit your application →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-card border shadow-lg relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-accent/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-4"
              style={{ background: P.blue + "14", color: P.blue }}
            >
              Business Owner
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Create Your Business Account</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Get access to verified experts across 13 industries.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <input type="hidden" {...form.register("role")} value="client" />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input placeholder="name@company.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={registerMutation.isPending}
                style={{ background: P.blue }}>
                {registerMutation.isPending ? "Creating account…" : "Sign Up"}
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link href="/login" className="font-semibold text-primary hover:underline">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

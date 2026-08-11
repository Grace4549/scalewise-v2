import { usePageTitle } from "@/hooks/use-page-title";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister, useResendVerification } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MailOpen, Loader2 } from "lucide-react";

const P = { blue: "#6395EE", mgreen: "#88CFA8", mint: "#85DECB" };

const registerSchema = z.object({
  name:     z.string().min(2, "Name is required"),
  email:    z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role:     z.enum(["client", "expert"]),
});

type RegisterData = z.infer<typeof registerSchema>;

function CheckInboxScreen({ email, role }: { email: string; role: "client" | "expert" }) {
  const resendMutation = useResendVerification();
  const [resent, setResent] = useState(false);

  const handleResend = () => {
    resendMutation.mutate(
      { data: { email } },
      { onSuccess: () => setResent(true) }
    );
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-card border shadow-lg text-center space-y-5">
        <MailOpen className="mx-auto w-14 h-14" style={{ color: role === "expert" ? P.mgreen : P.blue }} />
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
          style={
            role === "expert"
              ? { background: P.mgreen + "18", color: P.mgreen }
              : { background: P.blue + "18", color: P.blue }
          }
        >
          Check Your Inbox
        </div>
        <h1 className="text-2xl font-bold">One more step — verify your email</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We sent a verification link to <strong>{email}</strong>.
          Click the link in the email to activate your account.
          {role === "expert" && " You'll then have full access to your expert dashboard."}
        </p>
        <p className="text-xs text-muted-foreground">
          The link expires in 24 hours. Check your spam folder if you don't see it.
        </p>

        {resent ? (
          <p className="text-sm font-medium" style={{ color: P.mgreen }}>
            ✓ New verification email sent!
          </p>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            disabled={resendMutation.isPending}
            onClick={handleResend}
          >
            {resendMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
            ) : (
              "Resend verification email"
            )}
          </Button>
        )}

        <p className="text-sm text-muted-foreground">
          Already verified?{" "}
          <Link href="/login" className="font-semibold underline" style={{ color: role === "expert" ? P.mgreen : P.blue }}>
            Log in →
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function Register() {
  usePageTitle("Sign Up — GrowPia");
  const registerMutation = useRegister();
  const { toast }        = useToast();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

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

  if (pendingEmail) {
    return <CheckInboxScreen email={pendingEmail} role={role} />;
  }

  const onSubmit = (data: RegisterData) => {
    const payload: any = { ...data };
    if (role === "expert" && tokenParam) payload.inviteToken = tokenParam;
    registerMutation.mutate({ data: payload }, {
      onSuccess: (res) => {
        const pending = res as any;
        setPendingEmail(pending?.email ?? data.email);
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
                  {registerMutation.isPending ? "Creating account…" : "Create My Account"}
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

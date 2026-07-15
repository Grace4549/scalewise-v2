import { usePageTitle } from "@/hooks/use-page-title";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin, useResendVerification } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useSearch, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { MailOpen, Loader2 } from "lucide-react";

const P = { blue: "#6395EE", mgreen: "#88CFA8", mint: "#85DECB" };

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1, "Password is required"),
});

function UnverifiedEmailBanner({ email }: { email: string }) {
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
        <MailOpen className="mx-auto w-14 h-14" style={{ color: P.blue }} />
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
          style={{ background: P.blue + "18", color: P.blue }}
        >
          Email Not Verified
        </div>
        <h1 className="text-2xl font-bold">Please verify your email</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your account email <strong>{email}</strong> has not been verified yet.
          Check your inbox for the verification link we sent when you registered.
        </p>
        <p className="text-xs text-muted-foreground">
          Can't find it? Check your spam folder, or request a new link below.
        </p>

        {resent ? (
          <p className="text-sm font-medium" style={{ color: P.mgreen }}>
            ✓ Verification email re-sent — check your inbox!
          </p>
        ) : (
          <Button
            className="w-full"
            style={{ background: P.blue }}
            disabled={resendMutation.isPending}
            onClick={handleResend}
          >
            {resendMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
            ) : (
              "Resend Verification Email"
            )}
          </Button>
        )}

        <Button variant="outline" className="w-full" asChild>
          <Link href="/login">← Back to Login</Link>
        </Button>
      </div>
    </div>
  );
}

export default function Login() {
  usePageTitle("Log In — ScaleWise");
  const login           = useLogin();
  const { refetch }     = useAuth();
  const [, setLocation] = useLocation();
  const { toast }       = useToast();
  const queryClient     = useQueryClient();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

  const search    = useSearch();
  const params    = new URLSearchParams(search);
  const isExpert  = params.get("role") === "expert";
  const redirect  = params.get("redirect");

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver:      zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (unverifiedEmail) {
    return <UnverifiedEmailBanner email={unverifiedEmail} />;
  }

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    login.mutate({ data }, {
      onSuccess: (res) => {
        const role = (res as any)?.user?.role;
        queryClient.clear();
        queryClient.setQueryData(getGetMeQueryKey(), (res as any)?.user ?? null);
        refetch();
        if (redirect)                setLocation(redirect);
        else if (role === "admin")   setLocation("/admin");
        else if (role === "expert")  setLocation("/expert/dashboard");
        else                         setLocation("/dashboard");
      },
      onError: (err: any) => {
        const body = err?.data ?? err?.body ?? err?.response?.data ?? {};
        if (body?.error === "EMAIL_NOT_VERIFIED" && body?.email) {
          setUnverifiedEmail(body.email);
          return;
        }
        toast({
          title:       "Login failed",
          description: err?.message || "Invalid credentials",
          variant:     "destructive",
        });
      },
    });
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-card border shadow-lg relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/10 rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-4"
              style={
                isExpert
                  ? { background: P.mgreen + "18", color: P.mgreen }
                  : { background: P.blue + "18", color: P.blue }
              }
            >
              {isExpert ? "Expert Login" : "Business Owner Login"}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {isExpert
                ? "Log in to manage your sessions and clients."
                : "Log in to your account and find the right expert."}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <Button
                type="submit"
                className="w-full"
                disabled={login.isPending}
                style={
                  isExpert
                    ? { background: P.mgreen, color: "#083d2e" }
                    : { background: P.blue }
                }
              >
                {login.isPending ? "Logging in…" : "Log In"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <Link href="/forgot-password"
              className="text-sm hover:underline"
              style={{ color: isExpert ? P.mgreen : P.blue }}>
              Forgot your password?
            </Link>
          </div>

          <div className="mt-4 text-center text-sm">
            {isExpert ? (
              <>
                <span className="text-muted-foreground">Not an expert yet? </span>
                <Link
                  href="/apply-expert"
                  className="font-semibold hover:underline"
                  style={{ color: P.mgreen }}
                >
                  Apply to be an Expert →
                </Link>
              </>
            ) : (
              <>
                <span className="text-muted-foreground">Don't have an account? </span>
                <Link href="/register?role=client" className="font-semibold text-primary hover:underline">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

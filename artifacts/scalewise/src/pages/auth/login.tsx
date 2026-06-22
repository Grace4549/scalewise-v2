import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const P = { blue: "#6395EE", mgreen: "#88CFA8" };

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const login        = useLogin();
  const { refetch }  = useAuth();
  const [, setLocation] = useLocation();
  const { toast }    = useToast();
  const queryClient  = useQueryClient();

  const params      = new URLSearchParams(window.location.search);
  const isExpert    = params.get("role") === "expert";

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver:      zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    login.mutate({ data }, {
      onSuccess: (res) => {
        const role = (res as any)?.user?.role;
        // Clear the entire cache before setting the new identity so no
        // previously-cached authenticated data (bookings, inbox, dashboard)
        // leaks to the newly-signed-in account.
        queryClient.clear();
        queryClient.setQueryData(getGetMeQueryKey(), (res as any)?.user ?? null);
        refetch();
        if (role === "admin")  setLocation("/admin");
        else if (role === "expert") setLocation("/expert/dashboard");
        else setLocation("/");
      },
      onError: (err: any) => {
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

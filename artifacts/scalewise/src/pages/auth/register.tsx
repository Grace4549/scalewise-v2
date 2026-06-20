import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
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

const ROLE_META: Record<"client" | "expert", { label: string; subLabel: string; color: string; heading: string; sub: string }> = {
  client: {
    label:    "Business Owner",
    subLabel: "Looking to book an expert session",
    color:    P.blue,
    heading:  "Create Your Business Account",
    sub:      "Get access to verified experts across 13 industries.",
  },
  expert: {
    label:    "Expert",
    subLabel: "Sharing expertise with business owners",
    color:    P.mgreen,
    heading:  "Create Your Expert Account",
    sub:      "Next you will complete your expert profile and application.",
  },
};

export default function Register() {
  const registerMutation = useRegister();
  const { refetch }      = useAuth();
  const [, setLocation]  = useLocation();
  const { toast }        = useToast();

  const params    = new URLSearchParams(window.location.search);
  const roleParam = params.get("role");
  const presetRole: "client" | "expert" | null =
    roleParam === "client" || roleParam === "expert" ? roleParam : null;

  const form = useForm<RegisterData>({
    resolver:      zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", role: presetRole ?? "client" },
  });

  const onSubmit = (data: RegisterData) => {
    registerMutation.mutate({ data }, {
      onSuccess: () => {
        refetch();
        if (data.role === "expert") {
          setLocation("/apply-expert");
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

  const meta = presetRole ? ROLE_META[presetRole] : null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-card border shadow-lg relative overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-accent/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl" />

        <div className="relative z-10">
          <div className="text-center mb-8">
            {meta ? (
              <>
                {/* Role badge */}
                <div
                  className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-4"
                  style={{ background: meta.color + "14", color: meta.color }}
                >
                  {meta.label}
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{meta.heading}</h1>
                <p className="text-muted-foreground mt-2 text-sm">{meta.sub}</p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tight">Create an Account</h1>
                <p className="text-muted-foreground mt-2">Join ScaleWise and get unstuck.</p>
              </>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Hidden role field when pre-set */}
              <input type="hidden" {...form.register("role")} />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Only show role picker if no role was pre-selected from URL */}
              {!presetRole && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">What brings you here?</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(["client", "expert"] as const).map((r) => {
                      const m   = ROLE_META[r];
                      const sel = form.watch("role") === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => form.setValue("role", r)}
                          className="rounded-xl border p-4 text-left transition-all"
                          style={{
                            borderColor: sel ? m.color : undefined,
                            background:  sel ? m.color + "0C" : undefined,
                          }}
                        >
                          <p className="font-semibold text-sm" style={{ color: sel ? m.color : undefined }}>{m.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{m.subLabel}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
                style={presetRole ? { background: meta!.color, color: presetRole === "expert" ? "#083d2e" : undefined } : undefined}
              >
                {registerMutation.isPending
                  ? "Creating account…"
                  : presetRole === "expert"
                    ? "Create Account & Continue to Application →"
                    : "Sign Up"}
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

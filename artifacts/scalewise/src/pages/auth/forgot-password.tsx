import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const P = { blue: "#6395EE", mgreen: "#88CFA8" };

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }
      setSent(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-card border shadow-lg relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/10 rounded-full blur-2xl" />

        <div className="relative z-10">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📬</div>
              <h1 className="text-2xl font-bold mb-2">Check your inbox</h1>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                If <strong>{email}</strong> is registered with ScaleWise, we've sent a password reset link. It expires in 1 hour.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Didn't receive it? Check your spam folder, or try again with the correct email address.
              </p>
              <div className="flex flex-col gap-3">
                <Button variant="outline" onClick={() => { setSent(false); setEmail(""); }}>
                  Try a different email
                </Button>
                <Link href="/login">
                  <Button className="w-full" style={{ background: P.blue }}>Back to Login</Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold mb-4"
                  style={{ background: P.blue + "18", color: P.blue }}>
                  Reset Password
                </div>
                <h1 className="text-3xl font-bold tracking-tight">Forgot your password?</h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  Enter your email and we'll send you a link to reset it.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Email address</label>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading || !email.trim()} style={{ background: P.blue }}>
                  {loading ? "Sending…" : "Send Reset Link"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Remembered it? </span>
                <Link href="/login" className="font-semibold hover:underline" style={{ color: P.blue }}>
                  Back to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

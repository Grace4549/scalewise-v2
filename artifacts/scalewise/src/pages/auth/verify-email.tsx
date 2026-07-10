import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useVerifyEmail, useResendVerification, getGetMeQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, MailOpen } from "lucide-react";

const P = { blue: "#6395EE", green: "#88CFA8", mint: "#85DECB" };

type State =
  | { status: "verifying" }
  | { status: "success"; role: string }
  | { status: "expired"; email: string }
  | { status: "invalid" }
  | { status: "resent" };

function SuccessRedirect({
  role,
  redirectDashboard,
}: {
  role: string;
  redirectDashboard: (role: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => redirectDashboard(role), 1500);
    return () => clearTimeout(timer);
  }, [role, redirectDashboard]);

  return (
    <>
      <CheckCircle2 className="mx-auto w-12 h-12" style={{ color: "#88CFA8" }} />
      <h1 className="text-2xl font-bold">Email verified!</h1>
      <p className="text-muted-foreground text-sm">
        Your account is now active. Redirecting you to your dashboard…
      </p>
      <Button
        className="w-full"
        style={{ background: "#88CFA8", color: "#083d2e" }}
        onClick={() => redirectDashboard(role)}
      >
        Go to Dashboard
      </Button>
    </>
  );
}

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { refetch } = useAuth();
  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendVerification();

  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [state, setState] = useState<State>(
    token ? { status: "verifying" } : { status: "invalid" }
  );
  const [resentEmail, setResentEmail] = useState<string>("");

  useEffect(() => {
    if (!token) return;

    verifyMutation.mutate(
      { data: { token } },
      {
        onSuccess: (res) => {
          const user = (res as any)?.user;
          queryClient.clear();
          queryClient.setQueryData(getGetMeQueryKey(), user ?? null);
          refetch();
          setState({ status: "success", role: user?.role ?? "client" });
        },
        onError: (err: any) => {
          const body = err?.body ?? err?.response?.data ?? {};
          if (body?.error === "EXPIRED" && body?.email) {
            setState({ status: "expired", email: body.email });
          } else {
            setState({ status: "invalid" });
          }
        },
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleResend(email: string) {
    resendMutation.mutate(
      { data: { email } },
      {
        onSuccess: () => {
          setResentEmail(email);
          setState({ status: "resent" });
        },
      }
    );
  }

  function redirectDashboard(role: string) {
    if (role === "admin") setLocation("/admin");
    else if (role === "expert") setLocation("/expert/dashboard");
    else setLocation("/");
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-3xl bg-card border shadow-lg text-center space-y-6">

        {state.status === "verifying" && (
          <>
            <Loader2 className="mx-auto w-12 h-12 animate-spin" style={{ color: P.blue }} />
            <h1 className="text-2xl font-bold">Verifying your email…</h1>
            <p className="text-muted-foreground text-sm">Just a moment while we confirm your address.</p>
          </>
        )}

        {state.status === "success" && (
          <SuccessRedirect role={state.role} redirectDashboard={redirectDashboard} />
        )}

        {state.status === "expired" && (
          <>
            <MailOpen className="mx-auto w-12 h-12 text-muted-foreground" />
            <h1 className="text-2xl font-bold">Link expired</h1>
            <p className="text-muted-foreground text-sm">
              This verification link has expired (links are valid for 24 hours).
              We can send you a fresh one.
            </p>
            <Button
              className="w-full"
              style={{ background: P.blue }}
              disabled={resendMutation.isPending}
              onClick={() => handleResend(state.email)}
            >
              {resendMutation.isPending ? "Sending…" : "Send a New Link"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Sending to <strong>{state.email}</strong>
            </p>
          </>
        )}

        {state.status === "invalid" && (
          <>
            <XCircle className="mx-auto w-12 h-12 text-destructive" />
            <h1 className="text-2xl font-bold">Invalid link</h1>
            <p className="text-muted-foreground text-sm">
              This verification link is invalid or has already been used.
              If you registered recently, try logging in. If you need a new link,
              go back to the login page and use the "Resend verification" option.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">Back to Login</Link>
            </Button>
          </>
        )}

        {state.status === "resent" && (
          <>
            <MailOpen className="mx-auto w-12 h-12" style={{ color: P.mint }} />
            <h1 className="text-2xl font-bold">New link sent!</h1>
            <p className="text-muted-foreground text-sm">
              We've sent a fresh verification link to <strong>{resentEmail}</strong>.
              Check your inbox (and spam folder) and click the link to activate your account.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">Back to Login</Link>
            </Button>
          </>
        )}

      </div>
    </div>
  );
}

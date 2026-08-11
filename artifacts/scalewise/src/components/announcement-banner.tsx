import { useState } from "react";
import { useSubscribeLaunchNotification } from "@workspace/api-client-react";

function EmailCaptureForm({ compact }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const subscribe = useSubscribeLaunchNotification();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    subscribe.mutate(
      { data: { email } },
      {
        onSuccess: () => setSubmitted(true),
        onError: (err: any) => {
          if (err?.response?.status === 409) {
            setSubmitted(true);
          } else {
            setError("Something went wrong. Please try again.");
          }
        },
      }
    );
  };

  if (submitted) {
    return (
      <p className="text-sm font-semibold" style={{ color: compact ? "#1a5730" : "#0f3d25" }}>
        ✓ Thanks! We'll let you know when we launch.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`flex-1 px-3 rounded-lg text-sm border outline-none focus:ring-2 bg-white ${compact ? "h-9 border-border" : "h-7 border-0"}`}
          style={{ color: "#111" }}
        />
        <button
          type="submit"
          disabled={subscribe.isPending}
          className="h-9 px-4 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 flex-shrink-0"
          style={compact
            ? { backgroundColor: "#88CFA8", color: "#0f3d25" }
            : { backgroundColor: "#0f3d25", color: "#88CFA8" }}
        >
          {subscribe.isPending ? "..." : "Notify Me"}
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}

/** Full-width sticky banner shown above the navbar on every page. */
export function AnnouncementBanner({ inline }: { inline?: boolean } = {}) {
  const [dismissed, setDismissed] = useState(false);

  if (inline) {
    return <EmailCaptureForm compact />;
  }

  if (dismissed) return null;

  return (
    <div
      className="w-full py-2 px-4 flex items-center gap-3 flex-wrap justify-between text-sm"
      style={{ backgroundColor: "#88CFA8", color: "#0f3d25" }}
    >
      <p className="font-medium leading-tight flex-1 min-w-[200px]" style={{ color: "#0f3d25" }}>
        🚀 GrowPia is launching soon — be first in line to connect with Africa's most trusted business experts.
      </p>

      <div className="flex items-center gap-2 flex-shrink-0">
        <EmailCaptureForm />

        <button
          onClick={() => setDismissed(true)}
          className="ml-1 flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss"
          style={{ color: "#0f3d25" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

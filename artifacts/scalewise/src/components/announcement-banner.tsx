import { useState } from "react";
import { useSubscribeLaunchNotification } from "@workspace/api-client-react";

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const subscribe = useSubscribeLaunchNotification();

  if (dismissed) return null;

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

  return (
    <div
      className="w-full py-2 px-4 flex items-center gap-3 flex-wrap justify-between text-sm"
      style={{ backgroundColor: "#88CFA8", color: "#0f3d25" }}
    >
      <p className="font-medium leading-tight flex-1 min-w-[200px]" style={{ color: "#0f3d25" }}>
        🚧 ScaleWise is still being built. If something looks unfinished, that's because it is — we're working on it.
      </p>

      <div className="flex items-center gap-2 flex-shrink-0">
        {submitted ? (
          <span className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ backgroundColor: "#0f3d2520", color: "#0f3d25" }}>
            Thanks! We'll let you know when we launch.
          </span>
        ) : (
          <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-7 px-2.5 rounded-lg text-xs border-0 outline-none focus:ring-2 bg-white"
                  style={{ color: "#0f3d25", minWidth: "160px" }}
                />
                <button
                  type="submit"
                  disabled={subscribe.isPending}
                  className="h-7 px-3 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 flex-shrink-0"
                  style={{ backgroundColor: "#0f3d25", color: "#88CFA8" }}
                >
                  {subscribe.isPending ? "..." : "Notify Me"}
                </button>
              </div>
              {error && (
                <span className="text-xs mt-0.5" style={{ color: "#7f1d1d" }}>{error}</span>
              )}
            </div>
          </form>
        )}

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

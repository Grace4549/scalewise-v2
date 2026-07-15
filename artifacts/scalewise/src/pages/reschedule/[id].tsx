import { usePageTitle } from "@/hooks/use-page-title";
import { useState, useMemo } from "react";
import { useParams, useLocation, useSearch, Link } from "wouter";
import {
  useGetBooking, useGetExpertAvailability,
  useRescheduleBooking, useKeepOriginalTime, useUpdateBookingStatus,
  getListMyBookingsQueryKey, getListNotificationsQueryKey,
  getGetBookingQueryKey, getGetExpertAvailabilityQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const C = { blue: "#6395EE", green: "#16a34a", red: "#dc2626" };

type Slot = { id: number; expertId: number; startTime: string; createdAt: string };

function SlotPicker({
  slots,
  selected,
  onSelect,
}: {
  slots: Slot[];
  selected: string;
  onSelect: (iso: string) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const key = new Date(s.startTime).toLocaleDateString("en-KE", {
        weekday: "short", month: "short", day: "numeric",
      });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, [slots]);

  const dates = Array.from(grouped.keys());
  const [activeDate, setActiveDate] = useState<string>(() => dates[0] ?? "");
  const daySlots = grouped.get(activeDate) ?? [];

  if (slots.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        <div className="text-2xl mb-1">📅</div>
        <p className="font-medium">No available slots</p>
        <p className="mt-0.5">The expert hasn't published any upcoming availability yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {dates.map((d) => (
          <button key={d} type="button"
            onClick={() => { setActiveDate(d); onSelect(""); }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
            style={activeDate === d
              ? { backgroundColor: C.blue, color: "white", borderColor: C.blue }
              : { borderColor: "#e5e7eb", color: "#374151" }}>
            {d}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {daySlots.map((s) => {
          const iso = s.startTime;
          const label = new Date(s.startTime).toLocaleTimeString("en-KE", {
            hour: "2-digit", minute: "2-digit", hour12: true,
          });
          const isSelected = selected === iso;
          return (
            <button key={s.id} type="button"
              onClick={() => onSelect(isSelected ? "" : iso)}
              className="px-3 py-2 rounded-lg text-sm font-semibold border transition-all"
              style={isSelected
                ? { backgroundColor: C.blue, color: "white", borderColor: C.blue }
                : { borderColor: "#d1d5db", color: "#111827", backgroundColor: "white" }}>
              {label}
            </button>
          );
        })}
      </div>
      {selected && (
        <p className="text-xs font-medium" style={{ color: C.blue }}>
          ✓ Selected:{" "}
          {new Date(selected).toLocaleString("en-KE", {
            weekday: "short", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true,
          })}
        </p>
      )}
    </div>
  );
}

type Section = "pick" | "keep" | "cancel";

export default function ReschedulePage() {
  usePageTitle("Respond to Reschedule Request — ScaleWise");
  const { id } = useParams();
  const bookingId = parseInt(id!, 10);
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const actionParam = new URLSearchParams(search).get("action");
  const [section, setSection] = useState<Section>(
    actionParam === "keep" ? "keep" : actionParam === "cancel" ? "cancel" : "pick"
  );
  const [selectedSlot, setSelectedSlot] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const isClient = !!user && user.role === "client";

  const { data: booking, isLoading: bookingLoading, isError } = useGetBooking(bookingId, {
    query: { queryKey: getGetBookingQueryKey(bookingId), enabled: isClient && !isNaN(bookingId) },
  });

  const expertId = booking?.expertId ?? 0;
  const { data: slots = [] } = useGetExpertAvailability(expertId, {
    query: { queryKey: getGetExpertAvailabilityQueryKey(expertId), enabled: !!booking?.expertId },
  });

  const reschedule    = useRescheduleBooking();
  const keepOriginal  = useKeepOriginalTime();
  const cancelBooking = useUpdateBookingStatus();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl border shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Sign in to continue</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Please sign in to your ScaleWise account to respond to this reschedule request.
          </p>
          <Link href={`/login?redirect=/reschedule/${bookingId}`}>
            <Button style={{ backgroundColor: C.blue, color: "white" }} className="w-full hover:opacity-90">
              Sign In
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-4">
            Don't have an account?{" "}
            <Link href="/register" className="underline">Register</Link>
          </p>
        </div>
      </div>
    );
  }

  if (user.role !== "client") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl border shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-4xl mb-3">🚫</div>
          <h1 className="text-xl font-bold mb-2">Clients only</h1>
          <p className="text-sm text-muted-foreground">
            This page is for clients. Please sign in with your client account.
          </p>
        </div>
      </div>
    );
  }

  if (bookingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Skeleton className="h-64 w-full max-w-2xl" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl border shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-4xl mb-3">❌</div>
          <h1 className="text-xl font-bold mb-2">Booking not found</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This booking doesn't exist or you don't have access to it.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isTerminal = ["completed", "cancelled", "no-show"].includes(booking.status);
  if (isTerminal) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl border shadow-lg max-w-md w-full p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h1 className="text-xl font-bold mb-2 capitalize">Booking {booking.status}</h1>
          <p className="text-sm text-muted-foreground mb-4">
            This booking has already been {booking.status} and can no longer be modified.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleString("en-KE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi",
    });

  const sessionLabel = (booking.sessionType ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const handleReschedule = () => {
    if (!selectedSlot) return;
    reschedule.mutate(
      { id: bookingId, data: { newTime: selectedSlot, rescheduledBy: "client" } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Session rescheduled successfully." });
          navigate("/dashboard");
        },
        onError: (err: any) =>
          toast({ title: "Could not reschedule", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleKeepOriginal = () => {
    keepOriginal.mutate(
      { id: bookingId },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Expert notified — your original session time is confirmed." });
          navigate("/dashboard");
        },
        onError: (err: any) =>
          toast({ title: "Could not send response", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleCancel = () => {
    cancelBooking.mutate(
      { id: bookingId, data: { status: "cancelled", reason: cancelReason || undefined } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Session cancelled. Refund will be processed per our policy." });
          navigate("/dashboard");
        },
        onError: (err: any) =>
          toast({ title: "Failed to cancel", description: err.message, variant: "destructive" }),
      }
    );
  };

  const anchorTime = booking.rescheduledFromTime
    ? new Date(Math.min(
        new Date(booking.scheduledTime).getTime(),
        new Date(booking.rescheduledFromTime).getTime()
      ))
    : new Date(booking.scheduledTime);
  const hoursUntil = (anchorTime.getTime() - Date.now()) / 3600000;
  const refundPct  = hoursUntil >= 24 ? 100 : hoursUntil >= 0 ? 75 : 0;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-3">🔄</div>
          <h1 className="text-2xl font-bold mb-1">Reschedule Request</h1>
          <p className="text-muted-foreground text-sm">
            <strong>{booking.expertName}</strong> has requested to reschedule your{" "}
            <strong>{sessionLabel}</strong> session.
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground">
            📅 Originally scheduled: {fmtDate(booking.scheduledTime)}
          </div>
        </div>

        <p className="text-sm text-center text-muted-foreground mb-6">
          Choose how you'd like to respond:
        </p>

        <div className="space-y-4">
          {/* Option 1 — Pick a New Time */}
          <div
            className={`rounded-2xl border-2 transition-all ${
              section === "pick" ? "shadow-md" : "hover:border-muted-foreground/30"
            }`}
            style={{ borderColor: section === "pick" ? C.blue : undefined }}>
            <button
              type="button"
              className="w-full text-left p-5"
              onClick={() => setSection("pick")}>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: section === "pick" ? C.blue : "#9CA3AF" }}>
                  1
                </div>
                <div>
                  <p className="font-semibold">Pick a New Time</p>
                  <p className="text-sm text-muted-foreground">
                    Choose a different slot from the expert's live availability calendar.
                  </p>
                </div>
              </div>
            </button>
            {section === "pick" && (
              <div className="px-5 pb-5 pt-0">
                <div className="border-t pt-4">
                  <SlotPicker
                    slots={slots as Slot[]}
                    selected={selectedSlot}
                    onSelect={setSelectedSlot}
                  />
                  <div className="mt-4 flex gap-2">
                    <Button
                      disabled={!selectedSlot || reschedule.isPending}
                      style={{ backgroundColor: C.blue, color: "white" }}
                      className="hover:opacity-90"
                      onClick={handleReschedule}>
                      {reschedule.isPending ? "Confirming…" : "Confirm New Time"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Option 2 — Keep Original Time */}
          <div
            className={`rounded-2xl border-2 transition-all ${
              section === "keep" ? "shadow-md" : "hover:border-muted-foreground/30"
            }`}
            style={{ borderColor: section === "keep" ? C.green : undefined }}>
            <button
              type="button"
              className="w-full text-left p-5"
              onClick={() => setSection("keep")}>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: section === "keep" ? C.green : "#9CA3AF" }}>
                  2
                </div>
                <div>
                  <p className="font-semibold">Keep Original Time</p>
                  <p className="text-sm text-muted-foreground">
                    Proceed at <strong>{fmtDate(booking.scheduledTime)}</strong>. The expert will be notified.
                  </p>
                </div>
              </div>
            </button>
            {section === "keep" && (
              <div className="px-5 pb-5 pt-0">
                <div className="border-t pt-4 space-y-3">
                  <div
                    className="rounded-xl p-4 text-sm"
                    style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <p className="font-semibold mb-1" style={{ color: "#14532d" }}>What happens next</p>
                    <p className="text-xs leading-relaxed" style={{ color: "#15803d" }}>
                      The expert will be notified that you expect the session to proceed at the original
                      time. If the expert cannot attend, they must formally cancel — which triggers a{" "}
                      <strong>full refund</strong> to you per our policy.
                    </p>
                  </div>
                  <Button
                    disabled={keepOriginal.isPending}
                    style={{ backgroundColor: C.green, color: "white" }}
                    className="hover:opacity-90"
                    onClick={handleKeepOriginal}>
                    {keepOriginal.isPending ? "Sending…" : "✓ Keep Original Time"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Option 3 — Cancel */}
          <div
            className={`rounded-2xl border-2 transition-all ${
              section === "cancel" ? "shadow-md" : "hover:border-muted-foreground/30"
            }`}
            style={{ borderColor: section === "cancel" ? "#fca5a5" : undefined }}>
            <button
              type="button"
              className="w-full text-left p-5"
              onClick={() => setSection("cancel")}>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: section === "cancel" ? C.red : "#9CA3AF" }}>
                  3
                </div>
                <div>
                  <p className="font-semibold">Cancel This Booking</p>
                  <p className="text-sm text-muted-foreground">
                    Cancel and receive a refund based on our cancellation policy.
                  </p>
                </div>
              </div>
            </button>
            {section === "cancel" && (
              <div className="px-5 pb-5 pt-0">
                <div className="border-t pt-4 space-y-3">
                  <div
                    className="rounded-xl p-4 text-sm"
                    style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a" }}>
                    <p className="font-semibold mb-1" style={{ color: "#92400e" }}>Estimated Refund</p>
                    <p style={{ color: "#78350f" }}>
                      Based on your session time, you would receive an estimated{" "}
                      <strong className={refundPct === 100 ? "text-green-700" : "text-amber-700"}>
                        {refundPct}% refund
                      </strong>{" "}
                      if you cancel now.
                    </p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      Refunds are anchored to whichever session time came first (original or rescheduled).
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Reason for cancelling (optional)
                    </label>
                    <Input
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="e.g. Schedule conflict, no longer needed, etc."
                    />
                  </div>
                  <Button
                    variant="destructive"
                    disabled={cancelBooking.isPending}
                    onClick={handleCancel}>
                    {cancelBooking.isPending ? "Cancelling…" : "Confirm Cancellation"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

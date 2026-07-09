import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  useGetExpertDashboard, useUpdateBookingStatus,
  useExpertCancelBooking, useRequestReschedule,
  useGetInbox, useListMessages, useSendMessage,
  useListAdminMessages, useSendAdminMessage,
  useListNotifications, useMarkNotificationSeen,
  useListMyAvailability, useAddAvailabilitySlot, useDeleteAvailabilitySlot,
  useGetExpertSettings, useUpdateExpertSettings,
  useListExpertReceipts,
  getGetExpertPayoutReceiptQueryOptions,
  getListMessagesQueryKey, getGetInboxQueryKey,
  getListAdminMessagesQueryKey, getGetExpertDashboardQueryKey,
  getListNotificationsQueryKey, getListMyAvailabilityQueryKey,
  getGetExpertSettingsQueryKey,
} from "@workspace/api-client-react";
import { ReceiptModal } from "@/components/receipt-viewer";
import { useAuth } from "@/hooks/use-auth";
import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const C = { blue: "#6395EE", mblue: "#90B8D6", green: "#88CFA8", mint: "#85DECB" };

// ── Availability Calendar ─────────────────────────────────────────────────────

const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayOfWeek(d: Date): Date {
  const day = new Date(d);
  const dow = day.getDay(); // 0=Sun … 6=Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  day.setDate(day.getDate() + diff);
  day.setHours(0, 0, 0, 0);
  return day;
}

// ── Availability Settings ─────────────────────────────────────────────────────

function AvailabilitySettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings, isLoading } = useGetExpertSettings();
  const updateSettings = useUpdateExpertSettings();

  const handleAcceptingBookings = (checked: boolean) => {
    updateSettings.mutate({ data: { acceptingBookings: checked } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetExpertSettingsQueryKey() });
        toast({
          title: checked ? "Now accepting bookings" : "Bookings paused",
          description: checked
            ? "Your profile is visible in search results and clients can book you."
            : "Your profile is hidden from search and clients cannot book you until you turn this back on.",
        });
      },
      onError: () => toast({ title: "Failed to update setting", variant: "destructive" }),
    });
  };

  const handleAvailabilityMode = (mode: "week_by_week" | "recurring") => {
    updateSettings.mutate({ data: { availabilityMode: mode } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetExpertSettingsQueryKey() });
        toast({
          title: mode === "week_by_week" ? "Switched to week-by-week" : "Switched to recurring",
          description: mode === "week_by_week"
            ? "You'll be reminded to submit your availability each week."
            : "Your calendar slots repeat on a long-term basis with no weekly reminders.",
        });
      },
      onError: () => toast({ title: "Failed to update setting", variant: "destructive" }),
    });
  };

  if (isLoading) {
    return <div className="bg-card rounded-3xl border shadow-sm p-6 mb-4"><div className="h-16 animate-pulse bg-muted rounded-xl" /></div>;
  }

  const accepting = settings?.acceptingBookings ?? true;
  const mode = settings?.availabilityMode ?? "week_by_week";

  return (
    <div className="bg-card rounded-3xl border shadow-sm overflow-hidden mb-4">
      <div className="p-5 border-b bg-muted/30">
        <h2 className="text-base font-semibold">Booking Settings</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Control your availability and how clients can find and book you.</p>
      </div>
      <div className="divide-y">
        {/* Accepting bookings toggle */}
        <div className="flex items-start justify-between gap-4 px-5 py-4">
          <div>
            <Label htmlFor="accepting-bookings" className="text-sm font-medium leading-none">
              Available for new bookings
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              When off, your profile is hidden from search and no one can book you —
              regardless of your calendar slots.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <span className={`text-xs font-medium ${accepting ? "text-emerald-600" : "text-muted-foreground"}`}>
              {accepting ? "On" : "Off"}
            </span>
            <Switch
              id="accepting-bookings"
              checked={accepting}
              disabled={updateSettings.isPending}
              onCheckedChange={handleAcceptingBookings}
            />
          </div>
        </div>

        {/* Availability mode */}
        <div className="px-5 py-4">
          <Label className="text-sm font-medium">Availability mode</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-3">
            Choose how you manage your calendar. Week-by-week means you set
            availability each week and receive reminders on Fri/Sat/Sun if you haven't.
            Recurring means your slots are set on a long-term basis with no weekly reminders.
          </p>
          <div className="flex gap-2">
            {(["week_by_week", "recurring"] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={updateSettings.isPending}
                onClick={() => { if (mode !== m) handleAvailabilityMode(m); }}
                className="flex-1 rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all"
                style={mode === m
                  ? { borderColor: C.blue, backgroundColor: C.blue + "12", color: C.blue }
                  : { borderColor: "#e5e7eb", backgroundColor: "transparent", color: "#6b7280" }
                }
              >
                {m === "week_by_week" ? "📅 Week by week" : "🔁 Long-term recurring"}
              </button>
            ))}
          </div>
          {mode === "week_by_week" && (
            <p className="text-xs mt-2" style={{ color: C.mblue }}>
              You'll receive email reminders on the Friday, Saturday, and Sunday before each upcoming week if you haven't set your slots yet. Reminders stop as soon as you submit availability for that week.
            </p>
          )}
          {mode === "recurring" && (
            <p className="text-xs mt-2 text-muted-foreground">
              Your calendar is managed on a long-term basis. No weekly reminders will be sent.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AvailabilityCalendar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: slots = [], isLoading } = useListMyAvailability();
  const addSlot = useAddAvailabilitySlot();
  const deleteSlot = useDeleteAvailabilitySlot();

  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const [pending, setPending] = useState<string | null>(null);

  const now = new Date();

  // Build a set of existing slot ISO strings for fast lookup
  const slotSet = useMemo(() => {
    const s = new Map<string, number>();
    for (const slot of slots) {
      const key = new Date(slot.startTime).toISOString();
      s.set(key, slot.id);
    }
    return s;
  }, [slots]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const handleToggle = useCallback(async (day: Date, hour: number) => {
    const cellDate = new Date(day);
    cellDate.setHours(hour, 0, 0, 0);
    if (cellDate <= now) return; // past — ignore
    const iso = cellDate.toISOString();
    if (pending) return; // debounce

    const existingId = slotSet.get(iso);
    setPending(iso);

    if (existingId !== undefined) {
      deleteSlot.mutate({ id: existingId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMyAvailabilityQueryKey() });
          setPending(null);
        },
        onError: (err: any) => {
          toast({ title: "Failed to remove slot", description: err.message, variant: "destructive" });
          setPending(null);
        },
      });
    } else {
      addSlot.mutate({ data: { startTime: iso } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMyAvailabilityQueryKey() });
          setPending(null);
        },
        onError: (err: any) => {
          toast({ title: "Failed to add slot", description: err.message, variant: "destructive" });
          setPending(null);
        },
      });
    }
  }, [slotSet, pending, addSlot, deleteSlot, queryClient, toast, now]);

  const weekLabel = `Week of ${weekStart.toLocaleDateString("en-KE", { month: "long", day: "numeric", year: "numeric" })}`;

  return (
    <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b bg-muted/30">
        <h2 className="text-xl font-semibold mb-0.5">Availability Calendar</h2>
        <p className="text-sm text-muted-foreground">
          Click a cell to mark yourself available for that 1-hour slot. Click again to remove it.
          Clients will see these slots on your profile when booking.
        </p>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/10">
        <Button variant="ghost" size="sm" onClick={prevWeek} className="h-8 px-3">‹ Prev</Button>
        <span className="text-sm font-semibold">{weekLabel}</span>
        <Button variant="ghost" size="sm" onClick={nextWeek} className="h-8 px-3">Next ›</Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-6 py-2 border-b text-xs text-muted-foreground bg-muted/5">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-sm inline-block" style={{ backgroundColor: C.green + "60", border: `1px solid ${C.green}` }} />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-sm inline-block bg-muted border" />
          Not set
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-sm inline-block bg-muted/40 border border-dashed" />
          Past (locked)
        </span>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted-foreground">Loading your calendar…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                <th className="w-16 px-2 py-2 text-muted-foreground font-medium text-right border-b border-r bg-muted/10">Time</th>
                {weekDays.map((day, i) => {
                  const isToday = day.toDateString() === new Date().toDateString();
                  return (
                    <th key={i} className="py-2 px-1 border-b font-medium text-center"
                      style={isToday ? { color: C.blue, backgroundColor: C.blue + "08" } : {}}>
                      <div>{DAY_LABELS[i]}</div>
                      <div className={`text-[11px] font-normal ${isToday ? "" : "text-muted-foreground"}`}>
                        {day.toLocaleDateString("en-KE", { month: "short", day: "numeric" })}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour} className="border-b last:border-0">
                  <td className="text-right pr-3 py-0.5 text-muted-foreground border-r bg-muted/5 font-mono text-[10px]">
                    {String(hour).padStart(2, "0")}:00
                  </td>
                  {weekDays.map((day, di) => {
                    const cellDate = new Date(day);
                    cellDate.setHours(hour, 0, 0, 0);
                    const iso = cellDate.toISOString();
                    const isPast = cellDate <= now;
                    const isAvailable = slotSet.has(iso);
                    const isPending = pending === iso;

                    return (
                      <td key={di} className="p-0.5">
                        <button
                          type="button"
                          disabled={isPast || !!pending}
                          onClick={() => handleToggle(day, hour)}
                          title={isPast ? "Past slot" : isAvailable ? "Click to remove slot" : "Click to add slot"}
                          className="w-full h-7 rounded transition-all text-[10px] font-semibold"
                          style={
                            isPast
                              ? { backgroundColor: "#f3f4f6", color: "#d1d5db", cursor: "not-allowed", border: "1px dashed #e5e7eb" }
                              : isPending
                              ? { backgroundColor: "#e5e7eb", cursor: "wait", border: "1px solid #d1d5db" }
                              : isAvailable
                              ? { backgroundColor: C.green + "50", color: "#1a5730", border: `1px solid ${C.green}`, cursor: "pointer" }
                              : { backgroundColor: "white", color: "#9ca3af", border: "1px solid #e5e7eb", cursor: "pointer" }
                          }
                        >
                          {isAvailable && !isPast ? "✓" : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      <div className="px-6 py-4 border-t bg-muted/10">
        <p className="text-xs text-muted-foreground">
          <strong>{slots.length}</strong> upcoming slot{slots.length !== 1 ? "s" : ""} published on your profile.
          {" "}Slots are shown to clients for the next 60 days.
        </p>
      </div>
    </div>
  );
}

type SelectedThread =
  | { type: "booking"; bookingId: number }
  | { type: "admin"; expertId: number }
  | null;

const NOTIF_ICON: Record<string, string> = {
  "48hr_reminder": "🔔",
  "24hr_reminder": "🔔",
  "1hr_reminder":  "🔔",
  "client_cancelled":   "❌",
  "client_rescheduled": "🔄",
  "expert_cancelled":          "📋",
  "expert_reschedule_requested": "📋",
};

function BookingThreadPanel({ bookingId, userId }: { bookingId: number; userId: number }) {
  const { data: messages, isLoading } = useListMessages(bookingId);
  const sendMsg = useSendMessage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = () => {
    if (!body.trim()) return;
    sendMsg.mutate({ bookingId, data: { body: body.trim() } }, {
      onSuccess: () => {
        setBody("");
        queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(bookingId) });
        queryClient.invalidateQueries({ queryKey: getGetInboxQueryKey() });
      },
      onError: () => toast({ title: "Failed to send", variant: "destructive" }),
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[420px]">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : !messages?.length ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No messages yet.</div>
        ) : messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === userId ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[70%] rounded-2xl px-4 py-2.5 text-sm"
              style={m.senderId === userId
                ? { backgroundColor: C.green, color: "#1a5730" }
                : { backgroundColor: "#f3f4f6" }}>
              <div className="text-xs mb-0.5 opacity-70 font-medium">{m.senderName}</div>
              <p className="leading-snug">{m.body}</p>
              <div className="text-[10px] mt-1 opacity-50 text-right">
                {new Date(m.createdAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Reply…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
        <Button onClick={handleSend} disabled={sendMsg.isPending || !body.trim()}
          style={{ backgroundColor: C.green, color: "#1a5730" }} className="hover:opacity-90 shrink-0">
          Send
        </Button>
      </div>
    </div>
  );
}

function AdminThreadPanel({ expertId, userId }: { expertId: number; userId: number }) {
  const { data: messages, isLoading } = useListAdminMessages(expertId);
  const sendMsg = useSendAdminMessage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = () => {
    if (!body.trim()) return;
    sendMsg.mutate({ expertId, data: { body: body.trim() } }, {
      onSuccess: () => {
        setBody("");
        queryClient.invalidateQueries({ queryKey: getListAdminMessagesQueryKey(expertId) });
        queryClient.invalidateQueries({ queryKey: getGetInboxQueryKey() });
      },
      onError: () => toast({ title: "Failed to send", variant: "destructive" }),
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[420px]">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : !messages?.length ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No messages from admin yet.</div>
        ) : messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderId === userId ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[70%] rounded-2xl px-4 py-2.5 text-sm"
              style={m.senderId === userId
                ? { backgroundColor: C.blue, color: "white" }
                : { backgroundColor: "#f3f4f6" }}>
              <div className="text-xs mb-0.5 opacity-70 font-medium">{m.senderName}</div>
              <p className="leading-snug">{m.body}</p>
              <div className="text-[10px] mt-1 opacity-50 text-right">
                {new Date(m.createdAt).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Reply to ScaleWise Admin…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
        <Button onClick={handleSend} disabled={sendMsg.isPending || !body.trim()}
          style={{ backgroundColor: C.blue, color: "white" }} className="hover:opacity-90 shrink-0">
          Send
        </Button>
      </div>
    </div>
  );
}

function ExpertReceiptsTab() {
  const { data: receipts, isLoading } = useListExpertReceipts();
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const { data: receiptData } = useQuery({
    ...getGetExpertPayoutReceiptQueryOptions(selectedBatchId ?? 0),
    enabled: selectedBatchId !== null,
  });

  return (
    <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-muted/30">
        <h2 className="text-xl font-semibold">🧾 My Payout Receipts</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Official receipts for all your payouts from ScaleWise</p>
      </div>
      {isLoading ? (
        <div className="p-8"><Skeleton className="h-48 w-full" /></div>
      ) : !receipts?.length ? (
        <div className="p-12 text-center text-muted-foreground">
          <div className="text-4xl mb-3">🧾</div>
          <p className="font-medium">No payout receipts yet</p>
          <p className="text-sm mt-1">Receipts will appear here once ScaleWise processes your first payout.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Receipt #</th>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-left">Paid On</th>
                <th className="px-4 py-3 text-right">Sessions</th>
                <th className="px-4 py-3 text-right">Cancellations</th>
                <th className="px-4 py-3 text-right">VAT (16%)</th>
                <th className="px-4 py-3 text-right font-bold">Total Paid</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {receipts.map((r) => (
                <tr key={r.id} className="hover:bg-muted/10">
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: C.blue }}>{r.receiptNumber}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.periodStart).toLocaleDateString("en-KE")} — {new Date(r.periodEnd).toLocaleDateString("en-KE")}
                  </td>
                  <td className="px-4 py-3 text-xs">{new Date(r.paidAt).toLocaleString("en-KE")}</td>
                  <td className="px-4 py-3 text-right">KES {r.sessionAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right" style={{ color: "#b45309" }}>
                    {r.cancellationAmount > 0 ? `KES ${r.cancellationAmount.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-600">KES {r.vatAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: C.blue }}>
                    KES {r.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button size="sm" variant="outline" className="text-xs h-7"
                      style={{ borderColor: C.blue + "60", color: C.blue }}
                      onClick={() => setSelectedBatchId(r.id)}>
                      View Receipt
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedBatchId !== null && receiptData && (
        <ReceiptModal data={receiptData} onClose={() => setSelectedBatchId(null)} />
      )}
    </div>
  );
}

export default function ExpertDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: dashboard, isLoading: dashLoading } = useGetExpertDashboard();
  const { data: threads, isLoading: threadsLoading } = useGetInbox();
  const { data: notifications } = useListNotifications();

  const updateStatus = useUpdateBookingStatus();
  const expertCancel = useExpertCancelBooking();
  const requestReschedule = useRequestReschedule();
  const markNoShow = useMutation({
    mutationFn: async (bookingId: number) => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/bookings/${bookingId}/mark-no-show`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to mark as no-show");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getGetExpertDashboardQueryKey() });
      toast({ title: "Session marked as no-show. Client will be notified and refunded per policy." });
    },
    onError: (err: Error) => toast({ title: "Failed to mark as no-show", description: err.message, variant: "destructive" }),
  });
  const markSeen = useMarkNotificationSeen();

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState<SelectedThread>(null);
  const [activeTab, setActiveTab] = useState("sessions");

  // Expert cancel dialog
  const [cancelBookingId, setCancelBookingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Request reschedule dialog
  const [rescheduleReqBookingId, setRescheduleReqBookingId] = useState<number | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState("");

  if (authLoading || dashLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-6xl space-y-8">
        <Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!user || user.role !== "expert") return <Redirect to="/login" />;
  if (!dashboard) return <div className="p-8 text-center">Failed to load dashboard.</div>;

  const expert = dashboard.expert;
  const unseenCount = notifications?.filter((n) => !n.seen).length ?? 0;

  const handleMarkSeen = (id: number) => {
    markSeen.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
    });
  };

  const handleMarkAllSeen = () => {
    notifications?.filter((n) => !n.seen).forEach((n) => handleMarkSeen(n.id));
  };

  const handleStatusUpdate = (bookingId: number, status: "completed" | "no-show") => {
    updateStatus.mutate({ id: bookingId, data: { status } }, {
      onSuccess: () => {
        toast({ title: `Session marked as ${status}` });
        queryClient.invalidateQueries({ queryKey: getGetExpertDashboardQueryKey() });
      },
      onError: (err: any) => toast({ title: "Failed to update", description: err.message, variant: "destructive" }),
    });
  };

  const handleConfirmCancel = () => {
    if (cancelBookingId === null) return;
    expertCancel.mutate({ id: cancelBookingId, data: { reason: cancelReason || undefined } }, {
      onSuccess: () => {
        setCancelBookingId(null);
        setCancelReason("");
        queryClient.invalidateQueries({ queryKey: getGetExpertDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        toast({ title: "Session cancelled. Client will receive a full refund." });
      },
      onError: (err: any) => toast({ title: "Failed to cancel", description: err.message, variant: "destructive" }),
    });
  };

  const handleConfirmRescheduleReq = () => {
    if (rescheduleReqBookingId === null) return;
    requestReschedule.mutate({ id: rescheduleReqBookingId, data: { reason: rescheduleReason || undefined } }, {
      onSuccess: () => {
        setRescheduleReqBookingId(null);
        setRescheduleReason("");
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        toast({ title: "Reschedule request sent. The client will be notified to choose a new time." });
      },
      onError: (err: any) => toast({ title: "Failed to send request", description: err.message, variant: "destructive" }),
    });
  };

  const inboxCount = threads?.length ?? 0;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      {/* Back link */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group">
        <span className="w-7 h-7 rounded-full border flex items-center justify-center group-hover:border-foreground/40 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1L3 6l5 5"/>
          </svg>
        </span>
        Back to Home
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            <span style={{ color: C.green }}>Expert</span>{" "}
            <span style={{ color: C.mblue }}>Dashboard</span>
          </h1>
          <p className="text-muted-foreground mt-0.5">Welcome back, {expert.name}</p>
        </div>
        <Badge variant={expert.status === "approved" ? "default" : "secondary"} className="text-sm py-1.5 px-3">
          {expert.status === "approved" ? "✓ Approved Expert" : expert.status}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 h-auto bg-muted/40 p-1.5 rounded-xl inline-flex gap-1 border">
          <TabsTrigger value="sessions" className="rounded-lg font-medium px-5">Sessions & Earnings</TabsTrigger>
          <TabsTrigger value="availability" className="rounded-lg font-medium px-5">📅 Availability</TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg font-medium px-5">
            🔔 Notifications
            {unseenCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>{unseenCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="inbox" className="rounded-lg font-medium px-5">
            Inbox
            {inboxCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: C.mint + "40", color: "#0f7a6a" }}>{inboxCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="receipts" className="rounded-lg font-medium px-5">🧾 Receipts</TabsTrigger>
        </TabsList>

        {/* ── SESSIONS TAB ── */}
        <TabsContent value="sessions" className="space-y-8">
          {/* Earnings Overview */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Session Revenue</div>
              <div className="text-2xl font-bold">KES {dashboard.totalEarnings.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">{dashboard.completedBookings.length} completed sessions</div>
            </div>
            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Platform Fee</div>
              <div className="text-2xl font-bold text-destructive">KES {dashboard.commissionPaid.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Discovery/Consultancy 20% · Growth 15%</div>
            </div>
            {(dashboard.cancellationEarnings ?? 0) > 0 && (
              <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: "#f59e0b15", borderColor: "#f59e0b50" }}>
                <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#b45309" }}>Cancellation Earnings</div>
                <div className="text-2xl font-bold" style={{ color: "#b45309" }}>KES {(dashboard.cancellationEarnings ?? 0).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">Earned when clients cancel</div>
              </div>
            )}
            <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: C.green + "20", borderColor: C.green + "50" }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#1a5730" }}>Net Earnings</div>
              <div className="text-2xl font-bold" style={{ color: "#1a5730" }}>KES {dashboard.netEarnings.toLocaleString()}</div>
              <div className="text-xs mt-1" style={{ color: "#1a5730" }}>Sessions + cancellation earnings</div>
            </div>
            <div className={`p-5 rounded-2xl border shadow-sm ${dashboard.pendingPayout > 0 ? "bg-yellow-50 border-yellow-200" : "bg-card"}`}>
              <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${dashboard.pendingPayout > 0 ? "text-yellow-700" : "text-muted-foreground"}`}>
                Pending Payout
              </div>
              <div className={`text-2xl font-bold ${dashboard.pendingPayout > 0 ? "text-yellow-700" : "text-foreground"}`}>
                KES {dashboard.pendingPayout.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Awaiting M-Pesa from ScaleWise</div>
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-muted/30">
              <h2 className="text-xl font-semibold">Upcoming Sessions ({dashboard.upcomingBookings.length})</h2>
            </div>
            {dashboard.upcomingBookings.length ? (
              <div className="divide-y">
                {dashboard.upcomingBookings.map((booking) => (
                  <div key={booking.id} className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:bg-muted/10 transition-colors">
                    <div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{booking.clientName}</h3>
                        <Badge variant="secondary" className="capitalize">{booking.sessionType.replace(/_/g, " ")}</Badge>
                        {booking.amount && <span className="text-sm font-semibold" style={{ color: C.green }}>KES {booking.amount.toLocaleString()}</span>}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>📅 {new Date(booking.scheduledTime).toLocaleString()}</p>
                        <p>⏱ {booking.durationMinutes} minutes</p>
                        {booking.meetLink && (
                          <p className="mt-1" style={{ color: C.blue }}>
                            🔗 <a href={booking.meetLink} target="_blank" rel="noreferrer" className="hover:underline font-medium">Join Meeting</a>
                          </p>
                        )}
                        {booking.notes && <p className="italic mt-1 text-xs">"{booking.notes}"</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline"
                        onClick={() => { setSelectedThread({ type: "booking", bookingId: booking.id }); setActiveTab("inbox"); }}>
                        💬 Message Client
                      </Button>
                      <Button size="sm" className="hover:opacity-90"
                        style={{ backgroundColor: C.green, color: "#1a5730" }}
                        onClick={() => handleStatusUpdate(booking.id, "completed")}>Mark Completed</Button>
                      {(() => {
                        const minutesSinceStart = (Date.now() - new Date(booking.scheduledTime).getTime()) / 60_000;
                        const minutesRemaining = Math.ceil(15 - minutesSinceStart);
                        if (minutesSinceStart >= 15) {
                          return (
                            <Button size="sm" variant="ghost" className="text-orange-600 hover:bg-orange-50"
                              disabled={markNoShow.isPending}
                              onClick={() => markNoShow.mutate(booking.id)}>
                              Mark No-Show
                            </Button>
                          );
                        }
                        if (minutesSinceStart > 0 && minutesSinceStart < 15) {
                          return (
                            <Button size="sm" variant="ghost" disabled className="opacity-50 text-orange-600"
                              title={`Available in ${minutesRemaining} min`}>
                              No-Show (in {minutesRemaining}m)
                            </Button>
                          );
                        }
                        return null;
                      })()}
                      <Button size="sm" variant="outline"
                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                        onClick={() => { setRescheduleReqBookingId(booking.id); setRescheduleReason(""); }}>
                        Request Reschedule
                      </Button>
                      <Button size="sm" variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                        onClick={() => { setCancelBookingId(booking.id); setCancelReason(""); }}>
                        Cancel Session
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <div className="text-4xl mb-3">📅</div>
                <p className="font-medium">No upcoming sessions.</p>
                <p className="text-sm mt-1">When clients book sessions with you, they'll appear here.</p>
              </div>
            )}
          </div>

          {/* Completed Sessions */}
          <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-muted/30">
              <h2 className="text-xl font-semibold">Completed Sessions ({dashboard.completedBookings.length})</h2>
            </div>
            {dashboard.completedBookings.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-6 py-3">Client</th>
                      <th className="px-6 py-3">Session Type</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Amount</th>
                      <th className="px-6 py-3">Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {dashboard.completedBookings.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/10">
                        <td className="px-6 py-3 font-medium">{b.clientName}</td>
                        <td className="px-6 py-3 capitalize">{b.sessionType.replace(/_/g, " ")}</td>
                        <td className="px-6 py-3">{new Date(b.scheduledTime).toLocaleDateString()}</td>
                        <td className="px-6 py-3">{b.amount ? `KES ${b.amount.toLocaleString()}` : "—"}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${(b as any).payoutStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {(b as any).payoutStatus === "paid" ? "✓ Paid" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <div className="text-4xl mb-3">✅</div>
                <p className="font-medium">No completed sessions yet.</p>
              </div>
            )}
          </div>

          {/* Cancellation Earnings */}
          {(dashboard.cancelledWithEarnings ?? []).length > 0 && (
            <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
              <div className="p-6 border-b" style={{ backgroundColor: "#f59e0b10" }}>
                <h2 className="text-xl font-semibold" style={{ color: "#b45309" }}>
                  Client Compensation Earnings ({(dashboard.cancelledWithEarnings ?? []).length})
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Sessions cancelled by clients or marked as no-show — you keep a portion per our policy. ScaleWise will send these via M-Pesa.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-6 py-3">Client</th>
                      <th className="px-6 py-3">Session Type</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Session Amount</th>
                      <th className="px-6 py-3">Client Refund</th>
                      <th className="px-6 py-3">Your Compensation</th>
                      <th className="px-6 py-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(dashboard.cancelledWithEarnings ?? []).map((b: any) => {
                      const isNoShow = b.status === "no-show" || b.cancelledBy === "no-show";
                      return (
                        <tr key={b.id} className="hover:bg-muted/10">
                          <td className="px-6 py-3 font-medium">{b.clientName ?? "—"}</td>
                          <td className="px-6 py-3 capitalize">{b.sessionType.replace(/_/g, " ")}</td>
                          <td className="px-6 py-3">{new Date(b.scheduledTime).toLocaleDateString()}</td>
                          <td className="px-6 py-3">{b.amount ? `KES ${b.amount.toLocaleString()}` : "—"}</td>
                          <td className="px-6 py-3 text-muted-foreground">
                            {b.refundAmount != null ? `KES ${b.refundAmount.toFixed(0)} (${b.refundPercent}%)` : "—"}
                          </td>
                          <td className="px-6 py-3 font-semibold" style={{ color: "#b45309" }}>
                            KES {b.expertCancellationEarning?.toFixed(0) ?? "—"}
                          </td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 ${isNoShow ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>
                              {isNoShow ? "No-Show Compensation" : "Cancellation Compensation"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── AVAILABILITY TAB ── */}
        <TabsContent value="availability">
          <AvailabilitySettings />
          <AvailabilityCalendar />
        </TabsContent>

        {/* ── NOTIFICATIONS TAB ── */}
        <TabsContent value="notifications">
          <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-muted/30 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Notifications</h2>
                {unseenCount > 0 && (
                  <p className="text-sm text-muted-foreground mt-0.5">{unseenCount} unread</p>
                )}
              </div>
              {unseenCount > 0 && (
                <Button variant="ghost" size="sm" onClick={handleMarkAllSeen} className="text-xs">
                  Mark all as read
                </Button>
              )}
            </div>
            {!notifications?.length ? (
              <div className="p-12 text-center text-muted-foreground">
                <div className="text-4xl mb-3">🔔</div>
                <p className="font-medium">No notifications yet.</p>
                <p className="text-sm mt-1">Session reminders and booking updates from clients will appear here.</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notif) => {
                  const p = notif.payload as any;
                  const isReminder = ["48hr_reminder", "24hr_reminder", "1hr_reminder"].includes(notif.notificationType);
                  return (
                    <div key={notif.id} className={`p-5 transition-colors ${!notif.seen ? "bg-amber-50/40" : "hover:bg-muted/10"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-base">{NOTIF_ICON[notif.notificationType] ?? "📋"}</span>
                            <span className={`font-semibold text-sm ${!notif.seen ? "" : "text-muted-foreground"}`}>
                              {p.title}
                            </span>
                            {!notif.seen && (
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#d97706" }} />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground ml-6 leading-relaxed">{p.body}</p>
                          {p.sessionStart && (
                            <p className="text-xs text-muted-foreground ml-6 mt-0.5">
                              📅 {new Date(p.sessionStart).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}
                            </p>
                          )}
                          {/* Actions on reminder notifications */}
                          {isReminder && (() => {
                            const activeBooking = dashboard.upcomingBookings.find((b) => b.id === notif.bookingId);
                            if (!activeBooking) return null;
                            return (
                              <div className="ml-6 mt-3 flex gap-2 flex-wrap">
                                <Button size="sm" variant="outline"
                                  className="border-amber-200 text-amber-700 hover:bg-amber-50 text-xs h-8"
                                  onClick={() => { setRescheduleReqBookingId(notif.bookingId); setRescheduleReason(""); handleMarkSeen(notif.id); }}>
                                  Request to Reschedule
                                </Button>
                                <Button size="sm" variant="outline"
                                  className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-8"
                                  onClick={() => { setCancelBookingId(notif.bookingId); setCancelReason(""); handleMarkSeen(notif.id); }}>
                                  Cancel Session
                                </Button>
                              </div>
                            );
                          })()}
                          <p className="text-[10px] text-muted-foreground ml-6 mt-2">
                            {new Date(notif.createdAt).toLocaleString("en-KE")}
                          </p>
                        </div>
                        {!notif.seen && (
                          <Button size="sm" variant="ghost" className="text-xs shrink-0 h-7"
                            onClick={() => handleMarkSeen(notif.id)}>
                            Mark read
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── INBOX TAB ── */}
        <TabsContent value="inbox">
          <div className="grid md:grid-cols-3 gap-6" style={{ minHeight: 480 }}>
            {/* Thread list */}
            <div className="bg-card rounded-2xl border overflow-hidden">
              <div className="p-4 border-b" style={{ backgroundColor: C.mint + "25" }}>
                <h3 className="font-semibold text-sm" style={{ color: "#0f7a6a" }}>Conversations</h3>
              </div>
              {threadsLoading ? (
                <div className="p-4 space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
              ) : !threads?.length ? (
                <div className="p-6 text-center text-sm text-muted-foreground leading-relaxed">
                  No conversations yet.<br />Admin messages and client session threads will appear here.
                </div>
              ) : (
                <div className="divide-y">
                  {threads.map((t) => {
                    const key = t.threadType === "admin" ? `admin-${t.expertId}` : `booking-${t.bookingId}`;
                    const isSelected = selectedThread
                      ? t.threadType === "admin"
                        ? selectedThread.type === "admin"
                        : selectedThread.type === "booking" && selectedThread.bookingId === t.bookingId
                      : false;
                    return (
                      <button key={key}
                        onClick={() => {
                          if (t.threadType === "admin" && t.expertId) {
                            setSelectedThread({ type: "admin", expertId: t.expertId });
                          } else if (t.bookingId) {
                            setSelectedThread({ type: "booking", bookingId: t.bookingId });
                          }
                        }}
                        className="w-full text-left px-4 py-3.5 hover:bg-muted/30 transition-colors"
                        style={isSelected ? { backgroundColor: C.mint + "20" } : {}}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm truncate">{t.otherPartyName}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize shrink-0 font-medium"
                            style={t.otherPartyRole === "admin"
                              ? { backgroundColor: C.blue + "22", color: C.blue }
                              : { backgroundColor: C.mint + "40", color: "#0f7a6a" }}>
                            {t.otherPartyRole}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{t.lastMessage}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleDateString() : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chat panel */}
            <div className="md:col-span-2 bg-card rounded-2xl border flex flex-col overflow-hidden">
              {!selectedThread ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center gap-3">
                  <div className="text-4xl">💬</div>
                  <p className="font-medium">Select a conversation</p>
                  <p className="text-sm">View messages from clients or ScaleWise admin.</p>
                </div>
              ) : selectedThread.type === "admin" ? (
                <>
                  <div className="p-4 border-b" style={{ backgroundColor: C.blue + "15" }}>
                    <h3 className="font-semibold text-sm" style={{ color: C.blue }}>ScaleWise Admin</h3>
                    <p className="text-xs text-muted-foreground">Private admin channel</p>
                  </div>
                  <AdminThreadPanel expertId={selectedThread.expertId} userId={user.id} />
                </>
              ) : (
                <>
                  <div className="p-4 border-b" style={{ backgroundColor: C.mint + "20" }}>
                    <h3 className="font-semibold text-sm" style={{ color: "#0f7a6a" }}>
                      {threads?.find((t) => t.bookingId === selectedThread.bookingId)?.otherPartyName ?? "Client"}
                    </h3>
                    <p className="text-xs text-muted-foreground">Booking #{selectedThread.bookingId}</p>
                  </div>
                  <BookingThreadPanel bookingId={selectedThread.bookingId} userId={user.id} />
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── RECEIPTS TAB ── */}
        <TabsContent value="receipts">
          <ExpertReceiptsTab />
        </TabsContent>
      </Tabs>

      {/* ── EXPERT CANCEL DIALOG ── */}
      {cancelBookingId !== null && (() => {
        const b = dashboard.upcomingBookings.find((b) => b.id === cancelBookingId);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border shadow-2xl max-w-md w-full p-6">
              <h3 className="font-bold text-lg mb-1">Cancel This Session?</h3>
              {b && (
                <p className="text-sm text-muted-foreground mb-4">
                  {b.sessionType.replace(/_/g, " ")} with {b.clientName} — {new Date(b.scheduledTime).toLocaleString()}
                </p>
              )}
              <div className="rounded-xl border p-4 mb-4 text-sm"
                style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
                <p className="font-semibold text-red-800 mb-1">Important: Expert Cancellation Policy</p>
                <p className="text-red-700">
                  Expert cancellations always result in a <strong>full 100% refund</strong> to the client, per ScaleWise policy.
                  The client will be notified immediately.
                </p>
              </div>
              <div className="mb-4">
                <label className="text-sm font-medium mb-1 block">Reason for cancelling (optional)</label>
                <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Unavailable, emergency, etc." />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="destructive" disabled={expertCancel.isPending}
                  onClick={handleConfirmCancel}>
                  {expertCancel.isPending ? "Cancelling…" : "Confirm Cancellation"}
                </Button>
                <Button variant="outline"
                  onClick={() => { setCancelBookingId(null); setRescheduleReqBookingId(cancelBookingId); setRescheduleReason(""); }}>
                  Request Reschedule Instead
                </Button>
                <Button variant="ghost" onClick={() => setCancelBookingId(null)}>
                  Keep Session
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── REQUEST RESCHEDULE DIALOG ── */}
      {rescheduleReqBookingId !== null && (() => {
        const b = dashboard.upcomingBookings.find((b) => b.id === rescheduleReqBookingId);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border shadow-2xl max-w-md w-full p-6">
              <h3 className="font-bold text-lg mb-1">Request to Reschedule?</h3>
              {b && (
                <p className="text-sm text-muted-foreground mb-4">
                  {b.sessionType.replace(/_/g, " ")} with {b.clientName} — {new Date(b.scheduledTime).toLocaleString()}
                </p>
              )}
              <div className="rounded-xl border p-4 mb-4 text-sm"
                style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a" }}>
                <p className="font-semibold text-amber-800 mb-1">How this works</p>
                <p className="text-amber-700">
                  This sends a notification to the client asking them to choose a new time.
                  The session is <strong>not cancelled</strong> and <strong>no refund is issued</strong>.
                  The client will select a new slot from your available calendar.
                </p>
              </div>
              <div className="mb-4">
                <label className="text-sm font-medium mb-1 block">Reason for requesting reschedule (optional)</label>
                <Input value={rescheduleReason} onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Conflict arose, need to adjust timing, etc." />
              </div>
              <div className="flex gap-2">
                <Button disabled={requestReschedule.isPending}
                  style={{ backgroundColor: C.mint, color: "#0f7a6a" }}
                  className="hover:opacity-90"
                  onClick={handleConfirmRescheduleReq}>
                  {requestReschedule.isPending ? "Sending…" : "Send Reschedule Request"}
                </Button>
                <Button variant="ghost" onClick={() => setRescheduleReqBookingId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

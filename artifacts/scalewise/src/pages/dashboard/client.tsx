import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useListMyBookings, useGetInbox, useListMessages, useSendMessage,
  useUpdateBookingStatus, useRescheduleBooking,
  useListNotifications, useMarkNotificationSeen,
  useListClientReceipts,
  getGetClientBookingReceiptQueryOptions, getGetClientRefundReceiptQueryOptions,
  getListMessagesQueryKey, getGetInboxQueryKey,
  getListMyBookingsQueryKey, getListNotificationsQueryKey,
} from "@workspace/api-client-react";
import { ReceiptModal } from "@/components/receipt-viewer";
import { useAuth } from "@/hooks/use-auth";
import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const C = { blue: "#6395EE", mblue: "#90B8D6", green: "#88CFA8", mint: "#85DECB" };

function BookingThreadPanel({ bookingId, userId }: { bookingId: number; userId: number }) {
  const { data: messages, isLoading } = useListMessages(bookingId);
  const sendMsg = useSendMessage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          <div className="p-8 text-center text-muted-foreground text-sm">Loading messages…</div>
        ) : !messages?.length ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No messages yet. Start the conversation below.
          </div>
        ) : (
          messages.map((m) => (
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
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t flex gap-2">
        <Input value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
        <Button onClick={handleSend} disabled={sendMsg.isPending || !body.trim()}
          style={{ backgroundColor: C.blue, color: "white" }} className="hover:opacity-90 shrink-0">
          Send
        </Button>
      </div>
    </div>
  );
}

function ClientReceiptsTab() {
  const { data: receipts, isLoading } = useListClientReceipts();
  const [selectedReceipt, setSelectedReceipt] = useState<{ type: "booking" | "refund"; bookingId: number } | null>(null);
  const { data: bookingReceiptData } = useQuery({
    ...getGetClientBookingReceiptQueryOptions(selectedReceipt?.bookingId ?? 0),
    enabled: selectedReceipt?.type === "booking",
  });
  const { data: refundReceiptData } = useQuery({
    ...getGetClientRefundReceiptQueryOptions(selectedReceipt?.bookingId ?? 0),
    enabled: selectedReceipt?.type === "refund",
  });
  const activeReceiptData = selectedReceipt?.type === "booking" ? bookingReceiptData : refundReceiptData;

  return (
    <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
      <div className="p-6 border-b bg-muted/30">
        <h2 className="text-xl font-semibold">🧾 My Receipts</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Check and download your receipts from here.</p>
      </div>
      {isLoading ? (
        <div className="p-8"><Skeleton className="h-48 w-full" /></div>
      ) : !receipts?.length ? (
        <div className="p-12 text-center text-muted-foreground">
          <div className="text-4xl mb-3">🧾</div>
          <p className="font-medium">No receipts yet</p>
          <p className="text-sm mt-1">Receipts appear here once you make a booking payment or receive a refund.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Receipt #</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Scheduled For</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {receipts.map((r) => (
                <tr key={`${r.type}-${r.bookingId}`} className="hover:bg-muted/10">
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      r.type === "booking"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}>
                      {r.type === "booking" ? "Payment" : "Refund"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: C.blue }}>{r.receiptNumber}</td>
                  <td className="px-4 py-3 text-sm max-w-[220px] truncate">{r.description}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.scheduledTime).toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.date).toLocaleString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <span style={{ color: r.type === "refund" ? "#15803d" : C.blue }}>
                      KES {r.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button size="sm" variant="outline" className="text-xs h-7"
                      style={{ borderColor: C.blue + "60", color: C.blue }}
                      onClick={() => setSelectedReceipt({ type: r.type as "booking" | "refund", bookingId: r.bookingId })}>
                      View Receipt
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedReceipt && activeReceiptData && (
        <ReceiptModal data={activeReceiptData} onClose={() => setSelectedReceipt(null)} />
      )}
    </div>
  );
}

const NOTIF_ICON: Record<string, string> = {
  "48hr_reminder":   "🔔",
  "24hr_reminder":   "🔔",
  "1hr_reminder":    "🔔",
  "booking_confirmed":         "✅",
  "expert_cancelled":          "❌",
  "expert_reschedule_requested": "🔄",
  "client_cancelled":          "📋",
  "client_rescheduled":        "📋",
  "client_no_show":            "⚠️",
  "refund_processed":          "💸",
  "new_message":               "💬",
};

export default function ClientDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isClient = !authLoading && !!user && user.role === "client";
  const { data: rawBookings, isLoading: bookingsLoading } = useListMyBookings({
    query: { queryKey: getListMyBookingsQueryKey(), enabled: isClient },
  });
  const bookings = rawBookings?.filter((b) => b.status !== "pending_payment");
  const { data: threads, isLoading: threadsLoading } = useGetInbox({
    query: { queryKey: getGetInboxQueryKey(), enabled: isClient },
  });
  const { data: notifications } = useListNotifications({
    query: { queryKey: getListNotificationsQueryKey(), enabled: isClient },
  });

  const cancelBooking = useUpdateBookingStatus();
  const rescheduleBooking = useRescheduleBooking();
  const markSeen = useMarkNotificationSeen();

  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("bookings");

  // Cancel dialog state
  const [cancelBookingId, setCancelBookingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Reschedule dialog state
  const [rescheduleBookingId, setRescheduleBookingId] = useState<number | null>(null);
  const [newTime, setNewTime] = useState("");

  if (authLoading) return <div className="p-8"><Skeleton className="h-[400px]" /></div>;
  if (!user || user.role !== "client") return <Redirect to="/login" />;

  const unseenCount = notifications?.filter((n) => !n.seen).length ?? 0;

  const getStatusStyle = (status: string) => {
    if (status === "upcoming")  return { backgroundColor: C.blue + "22", color: C.blue };
    if (status === "completed") return { backgroundColor: C.green + "33", color: "#1a5730" };
    if (status === "cancelled") return { backgroundColor: "#fecaca", color: "#b91c1c" };
    return {};
  };

  const getStatusLabel = (status: string) => status.replace(/_/g, " ");

  const handleMarkSeen = (id: number) => {
    markSeen.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
    });
  };

  const handleMarkAllSeen = () => {
    notifications?.filter((n) => !n.seen).forEach((n) => handleMarkSeen(n.id));
  };

  const openCancelDialog = (bookingId: number, notifId?: number) => {
    setCancelBookingId(bookingId);
    setCancelReason("");
    if (notifId) handleMarkSeen(notifId);
  };

  const openRescheduleDialog = (bookingId: number, notifId?: number) => {
    setRescheduleBookingId(bookingId);
    setNewTime("");
    if (notifId) handleMarkSeen(notifId);
  };

  const handleConfirmCancel = () => {
    if (cancelBookingId === null) return;
    cancelBooking.mutate({ id: cancelBookingId, data: { status: "cancelled", reason: cancelReason || undefined } }, {
      onSuccess: () => {
        setCancelBookingId(null);
        setCancelReason("");
        queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        toast({ title: "Session cancelled. Refund will be processed per our policy." });
      },
      onError: (err: any) => toast({ title: "Failed to cancel", description: err.message, variant: "destructive" }),
    });
  };

  const handleConfirmReschedule = () => {
    if (rescheduleBookingId === null || !newTime) return;
    rescheduleBooking.mutate({ id: rescheduleBookingId, data: { newTime, rescheduledBy: "client" } }, {
      onSuccess: () => {
        setRescheduleBookingId(null);
        setNewTime("");
        queryClient.invalidateQueries({ queryKey: getListMyBookingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        toast({ title: "Session rescheduled successfully." });
      },
      onError: (err: any) => toast({ title: "Could not reschedule", description: err.message, variant: "destructive" }),
    });
  };

  // Compute refund % for cancel dialog
  const cancelBookingObj = bookings?.find((b) => b.id === cancelBookingId);
  const hoursUntil = cancelBookingObj
    ? (new Date(cancelBookingObj.scheduledTime).getTime() - Date.now()) / 3600000
    : 999;
  const estimatedRefundPct = hoursUntil > 24 ? 100 : 75;

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* Back link */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group">
        <span className="w-7 h-7 rounded-full border flex items-center justify-center group-hover:border-foreground/40 transition-colors">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 1L3 6l5 5"/>
          </svg>
        </span>
        Back to Home
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          <span style={{ color: C.blue }}>My</span>{" "}
          <span style={{ color: C.mblue }}>Dashboard</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Welcome back, {user.name}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 h-auto bg-muted/40 p-1.5 rounded-xl inline-flex gap-1 border">
          <TabsTrigger value="bookings" className="rounded-lg font-medium px-5">
            My Sessions
            {(bookings?.length ?? 0) > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: C.blue + "22", color: C.blue }}>{bookings!.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg font-medium px-5">
            🔔 Notifications
            {unseenCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: "#fef3c7", color: "#b45309" }}>{unseenCount}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="inbox" className="rounded-lg font-medium px-5">
            Inbox
            {(threads?.length ?? 0) > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: C.mint + "40", color: "#0f7a6a" }}>{threads!.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="receipts" className="rounded-lg font-medium px-5">🧾 Receipts</TabsTrigger>
        </TabsList>

        {/* ── BOOKINGS TAB ── */}
        <TabsContent value="bookings">
          <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b bg-muted/30">
              <h2 className="text-xl font-semibold">My Expert Sessions</h2>
            </div>
            {bookingsLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" />
              </div>
            ) : bookings?.length ? (
              <div className="divide-y">
                {bookings.map((booking) => (
                  <div key={booking.id} className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:bg-muted/10 transition-colors">
                    <div>
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-semibold text-lg">{booking.expertName}</h3>
                        <Badge variant="secondary" className="capitalize">{booking.sessionType.replace(/_/g, " ")}</Badge>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                          style={getStatusStyle(booking.status)}>{getStatusLabel(booking.status)}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>📅 {new Date(booking.scheduledTime).toLocaleString()}</p>
                        <p>⏱ {booking.durationMinutes} minutes</p>
                        {booking.meetLink && booking.status === "upcoming" && (
                          <p className="mt-2" style={{ color: C.blue }}>
                            🔗 <a href={booking.meetLink} target="_blank" rel="noreferrer" className="hover:underline font-medium">Join Meeting</a>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm"
                        onClick={() => { setSelectedBookingId(booking.id); setActiveTab("inbox"); }}>
                        💬 Message Expert
                      </Button>
                      <Link href={`/experts/${booking.expertId}`}>
                        <Button variant="secondary" size="sm">View Profile</Button>
                      </Link>
                      {(booking.status === "upcoming" || booking.status === "pending_payment") && (
                        <>
                          <Button variant="outline" size="sm"
                            onClick={() => openCancelDialog(booking.id)}
                            className="border-red-200 text-red-600 hover:bg-red-50">
                            Cancel
                          </Button>
                          <Button variant="outline" size="sm"
                            onClick={() => openRescheduleDialog(booking.id)}>
                            Reschedule
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">📅</div>
                <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
                <p className="text-muted-foreground mb-6">You haven't booked any expert sessions yet.</p>
                <Link href="/experts"><Button>Browse Experts</Button></Link>
              </div>
            )}
          </div>
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
                <p className="text-sm mt-1">Session reminders and booking updates will appear here.</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notif) => {
                  const p = notif.payload as any;
                  const isReminder = ["48hr_reminder", "24hr_reminder", "1hr_reminder"].includes(notif.notificationType);
                  const isExpertCancelled = notif.notificationType === "expert_cancelled";
                  const isRescheduleReq = notif.notificationType === "expert_reschedule_requested";
                  return (
                    <div key={notif.id} className={`p-5 transition-colors ${!notif.seen ? "bg-blue-50/40" : "hover:bg-muted/10"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-base">{NOTIF_ICON[notif.notificationType] ?? "📋"}</span>
                            <span className={`font-semibold text-sm ${!notif.seen ? "" : "text-muted-foreground"}`}>
                              {p.title}
                            </span>
                            {!notif.seen && (
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: C.blue }} />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground ml-6 leading-relaxed">{p.body}</p>
                          {p.sessionStart && (
                            <p className="text-xs text-muted-foreground ml-6 mt-0.5">
                              📅 {new Date(p.sessionStart).toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })}
                            </p>
                          )}
                          {isExpertCancelled && p.refundAmount > 0 && (
                            <div className="ml-6 mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                              style={{ backgroundColor: C.green + "30", color: "#1a5730" }}>
                              ✓ Full refund of KES {p.refundAmount?.toLocaleString()} will be processed
                            </div>
                          )}
                          {/* Action buttons */}
                          {(isReminder || isRescheduleReq) && (() => {
                            const activeBooking = bookings?.find((b) => b.id === notif.bookingId && (b.status === "upcoming" || b.status === "pending_payment"));
                            if (!activeBooking) return null;
                            return (
                              <div className="ml-6 mt-3 flex gap-2 flex-wrap">
                                {isReminder && (
                                  <Button size="sm" variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-8"
                                    onClick={() => openCancelDialog(notif.bookingId, notif.id)}>
                                    Cancel Session
                                  </Button>
                                )}
                                <Button size="sm" variant="outline"
                                  className="text-xs h-8"
                                  style={{ borderColor: C.blue + "60", color: C.blue }}
                                  onClick={() => openRescheduleDialog(notif.bookingId, notif.id)}>
                                  {isRescheduleReq ? "Choose New Time" : "Reschedule"}
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
              <div className="p-4 border-b" style={{ backgroundColor: C.blue + "15" }}>
                <h3 className="font-semibold text-sm" style={{ color: C.blue }}>Conversations</h3>
              </div>
              {threadsLoading ? (
                <div className="p-4 space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
              ) : !threads?.length ? (
                <div className="p-6 text-center text-sm text-muted-foreground leading-relaxed">
                  No conversations yet.<br />Book a session to start messaging your expert.
                </div>
              ) : (
                <div className="divide-y">
                  {threads.map((t) => (
                    <button key={t.bookingId ?? t.expertId}
                      onClick={() => setSelectedBookingId(t.bookingId ?? null)}
                      className="w-full text-left px-4 py-3.5 hover:bg-muted/30 transition-colors"
                      style={selectedBookingId === (t.bookingId ?? null) ? { backgroundColor: C.blue + "12" } : {}}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm truncate">{t.otherPartyName}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize shrink-0 font-medium"
                          style={{ backgroundColor: C.mint + "40", color: "#0f7a6a" }}>{t.otherPartyRole}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{t.lastMessage}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleDateString() : ""}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Chat panel */}
            <div className="md:col-span-2 bg-card rounded-2xl border flex flex-col overflow-hidden">
              {selectedBookingId === null ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center gap-3">
                  <div className="text-4xl">💬</div>
                  <p className="font-medium">Select a conversation</p>
                  <p className="text-sm">Choose a session thread on the left to view and reply to messages.</p>
                </div>
              ) : (
                <>
                  <div className="p-4 border-b" style={{ backgroundColor: C.blue + "15" }}>
                    <h3 className="font-semibold text-sm" style={{ color: C.blue }}>
                      {threads?.find((t) => t.bookingId === selectedBookingId)?.otherPartyName
                        ?? bookings?.find((b) => b.id === selectedBookingId)?.expertName
                        ?? "Session Thread"}
                    </h3>
                    <p className="text-xs text-muted-foreground">Booking #{selectedBookingId}</p>
                  </div>
                  <BookingThreadPanel bookingId={selectedBookingId} userId={user.id} />
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── RECEIPTS TAB ── */}
        <TabsContent value="receipts">
          <ClientReceiptsTab />
        </TabsContent>
      </Tabs>

      {/* ── CANCEL DIALOG ── */}
      {cancelBookingId !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border shadow-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-lg mb-1">Cancel Your Session?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {cancelBookingObj
                ? `${cancelBookingObj.sessionType.replace(/_/g, " ")} with ${cancelBookingObj.expertName}`
                : ""}
            </p>

            {/* Refund policy summary */}
            <div className="rounded-xl border p-4 mb-4 text-sm space-y-2"
              style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a" }}>
              <p className="font-semibold" style={{ color: "#92400e" }}>Cancellation & Refund Policy</p>
              <p style={{ color: "#78350f" }}>• Cancel <strong>&gt; 24 hours</strong> before: <span className="font-semibold text-green-700">Full refund</span></p>
              <p style={{ color: "#78350f" }}>• Cancel <strong>&lt; 24 hours</strong> before: <span className="font-semibold text-amber-700">75% refund</span> — OR reschedule (not both)</p>
              <p style={{ color: "#78350f" }}>• No-show (missed session): <span className="font-semibold text-amber-700">50% refund</span></p>
              <Link href="/terms" className="text-xs hover:underline" style={{ color: C.blue }}>
                View full Cancellation & Refund Policy →
              </Link>
            </div>

            {cancelBookingObj && (
              <div className="text-sm text-muted-foreground mb-4 px-1">
                Based on your session time, you would receive an estimated{" "}
                <strong className={estimatedRefundPct === 100 ? "text-green-700" : "text-amber-700"}>
                  {estimatedRefundPct}% refund
                </strong>{" "}
                if you cancel now.
              </div>
            )}

            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">Reason for cancelling (optional)</label>
              <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule conflict, emergency, etc." />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="destructive" disabled={cancelBooking.isPending}
                onClick={handleConfirmCancel}>
                {cancelBooking.isPending ? "Cancelling…" : "Confirm Cancellation"}
              </Button>
              <Button variant="outline"
                onClick={() => { setCancelBookingId(null); openRescheduleDialog(cancelBookingId); }}>
                Reschedule Instead
              </Button>
              <Button variant="ghost" onClick={() => setCancelBookingId(null)}>
                Keep My Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESCHEDULE DIALOG ── */}
      {rescheduleBookingId !== null && (() => {
        const rb = bookings?.find((b) => b.id === rescheduleBookingId);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border shadow-2xl max-w-md w-full p-6">
              <h3 className="font-bold text-lg mb-1">Reschedule Your Session</h3>
              {rb && (
                <p className="text-sm text-muted-foreground mb-4">
                  {rb.sessionType.replace(/_/g, " ")} with {rb.expertName} — currently{" "}
                  {new Date(rb.scheduledTime).toLocaleString()}
                </p>
              )}
              <div className="mb-4">
                <label className="text-sm font-medium mb-1 block">New date & time</label>
                <input type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ focusRingColor: C.blue } as any}
                  min={new Date().toISOString().slice(0, 16)} />
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Note: the expert must be available at the new time. If there's a conflict you'll see an error.
                Reschedules and cancellations are mutually exclusive — choosing to reschedule forfeits a refund.
              </p>
              <div className="flex gap-2">
                <Button disabled={!newTime || rescheduleBooking.isPending}
                  style={{ backgroundColor: C.blue, color: "white" }}
                  className="hover:opacity-90"
                  onClick={handleConfirmReschedule}>
                  {rescheduleBooking.isPending ? "Rescheduling…" : "Confirm Reschedule"}
                </Button>
                <Button variant="ghost" onClick={() => setRescheduleBookingId(null)}>
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

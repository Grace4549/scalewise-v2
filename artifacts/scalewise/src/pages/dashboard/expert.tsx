import { useState, useRef, useEffect } from "react";
import {
  useGetExpertDashboard, useUpdateBookingStatus,
  useGetInbox, useListMessages, useSendMessage,
  useListAdminMessages, useSendAdminMessage,
  getListMessagesQueryKey, getGetInboxQueryKey,
  getListAdminMessagesQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const C = { blue: "#6395EE", mblue: "#90B8D6", green: "#88CFA8", mint: "#85DECB" };

type SelectedThread =
  | { type: "booking"; bookingId: number }
  | { type: "admin"; expertId: number }
  | null;

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

export default function ExpertDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: dashboard, isLoading: dashLoading } = useGetExpertDashboard();
  const { data: threads, isLoading: threadsLoading } = useGetInbox();
  const updateStatus = useUpdateBookingStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedThread, setSelectedThread] = useState<SelectedThread>(null);
  const [activeTab, setActiveTab] = useState("sessions");

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

  const handleStatusUpdate = (bookingId: number, status: "completed" | "cancelled" | "no-show") => {
    updateStatus.mutate({ id: bookingId, data: { status } }, {
      onSuccess: () => {
        toast({ title: `Session marked as ${status}` });
        queryClient.invalidateQueries({ queryKey: ["getExpertDashboard"] });
      },
      onError: (err: any) => toast({ title: "Failed to update", description: err.message, variant: "destructive" }),
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
          <TabsTrigger value="inbox" className="rounded-lg font-medium px-5">
            Inbox
            {inboxCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: C.mint + "40", color: "#0f7a6a" }}>{inboxCount}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── SESSIONS TAB ── */}
        <TabsContent value="sessions" className="space-y-8">
          {/* Earnings Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Total Revenue</div>
              <div className="text-2xl font-bold">KES {dashboard.totalEarnings.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">{dashboard.completedBookings.length} completed sessions</div>
            </div>
            <div className="bg-card p-5 rounded-2xl border shadow-sm">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Platform Fee</div>
              <div className="text-2xl font-bold text-destructive">KES {dashboard.commissionPaid.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Discovery/Consultancy 20% · Growth 15%</div>
            </div>
            <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: C.green + "20", borderColor: C.green + "50" }}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#1a5730" }}>Net Earnings</div>
              <div className="text-2xl font-bold" style={{ color: "#1a5730" }}>KES {dashboard.netEarnings.toLocaleString()}</div>
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
                      <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(booking.id, "cancelled")}>Cancel</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleStatusUpdate(booking.id, "no-show")}>No-show</Button>
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
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${b.payoutStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {b.payoutStatus === "paid" ? "✓ Paid" : "Pending"}
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
      </Tabs>
    </div>
  );
}

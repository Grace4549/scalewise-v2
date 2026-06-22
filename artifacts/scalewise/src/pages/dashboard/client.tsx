import { useState, useRef, useEffect } from "react";
import {
  useListMyBookings, useGetInbox, useListMessages, useSendMessage,
  getListMessagesQueryKey, getGetInboxQueryKey,
} from "@workspace/api-client-react";
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

export default function ClientDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: bookings, isLoading: bookingsLoading } = useListMyBookings();
  const { data: threads, isLoading: threadsLoading } = useGetInbox();
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("bookings");

  if (authLoading) return <div className="p-8"><Skeleton className="h-[400px]" /></div>;
  if (!user || user.role !== "client") return <Redirect to="/login" />;

  const getStatusStyle = (status: string) => {
    if (status === "pending_payment") return { backgroundColor: "#fef9c3", color: "#854d0e" };
    if (status === "upcoming")  return { backgroundColor: C.blue + "22", color: C.blue };
    if (status === "completed") return { backgroundColor: C.green + "33", color: "#1a5730" };
    if (status === "cancelled") return { backgroundColor: "#fecaca", color: "#b91c1c" };
    return {};
  };

  const getStatusLabel = (status: string) => {
    if (status === "pending_payment") return "Awaiting Payment";
    return status.replace(/_/g, " ");
  };

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
          <TabsTrigger value="inbox" className="rounded-lg font-medium px-5">
            Inbox
            {(threads?.length ?? 0) > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: C.mint + "40", color: "#0f7a6a" }}>{threads!.length}</span>
            )}
          </TabsTrigger>
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
      </Tabs>
    </div>
  );
}

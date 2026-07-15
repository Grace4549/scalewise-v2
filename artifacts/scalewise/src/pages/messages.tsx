import { usePageTitle } from "@/hooks/use-page-title";
import { useState, useEffect, useRef } from "react";
import { useParams, Link, Redirect } from "wouter";
import {
  useListMessages, useSendMessage, useGetBooking,
  getGetBookingQueryKey, getListMessagesQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function Messages() {
  usePageTitle("Messages — ScaleWise");
  const { bookingId: bookingIdStr } = useParams();
  const bookingId = parseInt(bookingIdStr!);
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Queries are gated behind confirmed auth so they never consume cached data
  // from a prior user's session before identity has been verified for this tab.
  const authenticated = !authLoading && !!user;
  const { data: booking, isLoading: bookingLoading } = useGetBooking(bookingId, {
    query: { queryKey: getGetBookingQueryKey(bookingId), enabled: authenticated },
  });
  const { data: messages, isLoading: messagesLoading, refetch } = useListMessages(bookingId, {
    query: { queryKey: getListMessagesQueryKey(bookingId), enabled: authenticated },
  });
  const sendMessage = useSendMessage();
  
  const [text, setText] = useState("");
  const [pendingMsgs, setPendingMsgs] = useState<Array<{ id: number; senderId: number; body: string; createdAt: string }>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll for new messages
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const msgBody = text.trim();
    if (!msgBody) return;

    const tempId = -Date.now();
    setText("");
    setPendingMsgs((prev) => [...prev, { id: tempId, senderId: user?.id ?? 0, body: msgBody, createdAt: new Date().toISOString() }]);

    sendMessage.mutate({ bookingId, data: { body: msgBody } }, {
      onSuccess: () => {
        setPendingMsgs((prev) => prev.filter((m) => m.id !== tempId));
        refetch();
      },
      onError: (err: any) => {
        setPendingMsgs((prev) => prev.filter((m) => m.id !== tempId));
        const errBody = err?.body ?? err?.response?.data ?? {};
        if (errBody?.error === "EMAIL_NOT_VERIFIED") {
          toast({
            title: "Email not verified",
            description: "Please verify your email address before sending messages.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Failed to send message", description: err?.message ?? "Please try again.", variant: "destructive" });
        }
      },
    });
  };

  if (authLoading || bookingLoading || messagesLoading) {
    return <div className="p-8 max-w-3xl mx-auto"><Skeleton className="h-[600px] rounded-3xl" /></div>;
  }

  if (!user) return <Redirect to="/login" />;

  if (!booking) return <div className="p-8 text-center">Booking not found</div>;

  const otherPersonName = user?.role === 'client' ? booking.expertName : booking.clientName;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl h-[calc(100vh-5rem)] flex flex-col">
      <div className="bg-card border rounded-t-3xl p-6 shadow-sm flex items-center justify-between z-10 relative">
        <div>
          <h1 className="text-xl font-bold">Chat with {otherPersonName}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {booking.sessionType.replace('_', ' ')} Session • {new Date(booking.scheduledTime).toLocaleDateString()}
          </p>
        </div>
        <Link href={user?.role === 'client' ? '/dashboard' : '/expert/dashboard'}>
          <Button variant="outline" size="sm">Back to Dashboard</Button>
        </Link>
      </div>

      <div className="flex-1 bg-muted/10 border-x overflow-y-auto p-6 space-y-6">
        {messages?.length === 0 && pendingMsgs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-center">
            <div>
              <div className="text-4xl mb-4 opacity-50">👋</div>
              <p>No messages yet. Send a message to start the conversation.</p>
            </div>
          </div>
        ) : (
          <>
            {messages?.map((msg) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-medium">{isMe ? 'You' : msg.senderName}</span>
                    <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`px-4 py-3 rounded-2xl max-w-[80%] ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-card border rounded-tl-sm'}`}>
                    {msg.body}
                  </div>
                </div>
              );
            })}
            {pendingMsgs.map((msg) => (
              <div key={msg.id} className="flex flex-col items-end">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium">You</span>
                  <span className="text-xs text-muted-foreground">Sending…</span>
                </div>
                <div className="px-4 py-3 rounded-2xl max-w-[80%] bg-primary text-primary-foreground rounded-tr-sm opacity-60">
                  {msg.body}
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-card border rounded-b-3xl p-4 shadow-sm z-10 relative">
        <form onSubmit={handleSend} className="flex gap-4">
          <Input 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your message..."
            className="h-12 bg-background rounded-xl"
          />
          <Button type="submit" size="lg" className="h-12 px-8 rounded-xl" disabled={!text.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}

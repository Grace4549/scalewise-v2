import { useListMyBookings } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function ClientDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: bookings, isLoading } = useListMyBookings();

  if (authLoading) return <div className="p-8"><Skeleton className="h-[400px]" /></div>;
  if (!user || user.role !== 'client') return <Redirect to="/login" />;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/10 text-blue-700';
      case 'completed': return 'bg-blue-500/10 text-blue-700';
      case 'cancelled': return 'bg-red-500/10 text-red-700';
      default: return 'bg-gray-500/10 text-gray-700';
    }
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
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground">Manage your expert sessions.</p>
      </div>

      <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <h2 className="text-xl font-semibold">My Bookings</h2>
        </div>
        
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : bookings?.length ? (
          <div className="divide-y">
            {bookings.map(booking => (
              <div key={booking.id} className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:bg-muted/10 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{booking.expertName}</h3>
                    <Badge variant="secondary" className="capitalize">{booking.sessionType.replace('_', ' ')}</Badge>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)} capitalize`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>📅 {new Date(booking.scheduledTime).toLocaleString()}</p>
                    <p>⏱ {booking.durationMinutes} minutes</p>
                    {booking.meetLink && booking.status === 'upcoming' && (
                      <p className="text-primary mt-2">
                        🔗 <a href={booking.meetLink} target="_blank" rel="noreferrer" className="hover:underline">Join Meeting</a>
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                  <Link href={`/messages/${booking.id}`}>
                    <Button variant="outline" className="w-full md:w-auto">Messages</Button>
                  </Link>
                  <Link href={`/experts/${booking.expertId}`}>
                    <Button variant="secondary" className="w-full md:w-auto">View Profile</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-2xl text-muted-foreground">📅</div>
            <h3 className="text-xl font-semibold mb-2">No bookings yet</h3>
            <p className="text-muted-foreground mb-6">You haven't booked any expert sessions yet.</p>
            <Link href="/experts">
              <Button>Browse Experts</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

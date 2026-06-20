import { useGetExpertDashboard, useUpdateBookingStatus } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Link, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getGetExpertDashboardQueryKey } from "@workspace/api-client-react";

export default function ExpertDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: dashboard, isLoading } = useGetExpertDashboard();
  const updateStatus = useUpdateBookingStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (authLoading) return <div className="p-8"><Skeleton className="h-[400px]" /></div>;
  if (!user || user.role !== 'expert') return <Redirect to="/login" />;

  const handleStatusUpdate = (bookingId: number, status: 'approved' | 'cancelled') => {
    updateStatus.mutate({ bookingId, data: { status } }, {
      onSuccess: () => {
        toast({ title: `Booking ${status}` });
        queryClient.invalidateQueries({ queryKey: getGetExpertDashboardQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to update", description: err.message, variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-6xl space-y-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!dashboard) return <div className="p-8 text-center">Failed to load dashboard</div>;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Expert Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {dashboard.expert.name}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={dashboard.expert.status === 'approved' ? 'default' : 'secondary'} className="text-sm py-1">
            Status: {dashboard.expert.status}
          </Badge>
        </div>
      </div>

      {/* Earnings Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-3xl border shadow-sm">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Total Earnings</h3>
          <p className="text-3xl font-bold">KES {dashboard.totalEarnings.toLocaleString()}</p>
        </div>
        <div className="bg-card p-6 rounded-3xl border shadow-sm">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Platform Commission</h3>
          <p className="text-3xl font-bold text-destructive">KES {dashboard.commissionPaid.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-2">Discovery/Consultancy 20%, Growth 15%</p>
        </div>
        <div className="bg-primary/10 p-6 rounded-3xl border border-primary/20 shadow-sm">
          <h3 className="text-sm font-semibold text-primary mb-2">Net Earnings</h3>
          <p className="text-3xl font-bold text-primary">KES {dashboard.netEarnings.toLocaleString()}</p>
        </div>
      </div>

      {/* Pending Requests */}
      {dashboard.pendingRequests.length > 0 && (
        <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-yellow-500/5">
            <h2 className="text-xl font-semibold text-yellow-700">Pending Requests ({dashboard.pendingRequests.length})</h2>
          </div>
          <div className="divide-y">
            {dashboard.pendingRequests.map(booking => (
              <div key={booking.id} className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{booking.clientName}</h3>
                    <Badge variant="secondary" className="capitalize">{booking.sessionType.replace('_', ' ')}</Badge>
                    <span className="font-medium text-primary">KES {booking.amount?.toLocaleString()}</span>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>📅 {new Date(booking.scheduledTime).toLocaleString()}</p>
                    <p>⏱ {booking.durationMinutes} minutes</p>
                    {booking.notes && <p className="italic mt-2">"{booking.notes}"</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate(booking.id, 'approved')}>
                    Accept
                  </Button>
                  <Button variant="destructive" onClick={() => handleStatusUpdate(booking.id, 'cancelled')}>
                    Decline
                  </Button>
                  <Link href={`/messages/${booking.id}`}>
                    <Button variant="outline">Message</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Sessions */}
      <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30">
          <h2 className="text-xl font-semibold">Upcoming Sessions</h2>
        </div>
        {dashboard.upcomingBookings.length ? (
          <div className="divide-y">
            {dashboard.upcomingBookings.map(booking => (
              <div key={booking.id} className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:bg-muted/10 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{booking.clientName}</h3>
                    <Badge variant="secondary" className="capitalize">{booking.sessionType.replace('_', ' ')}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>📅 {new Date(booking.scheduledTime).toLocaleString()}</p>
                    <p>⏱ {booking.durationMinutes} minutes</p>
                    {booking.meetLink && (
                      <p className="text-primary mt-2">
                        🔗 <a href={booking.meetLink} target="_blank" rel="noreferrer" className="hover:underline font-medium">Join Meeting</a>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link href={`/messages/${booking.id}`}>
                    <Button variant="outline">Messages</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground">
            No upcoming sessions.
          </div>
        )}
      </div>
    </div>
  );
}

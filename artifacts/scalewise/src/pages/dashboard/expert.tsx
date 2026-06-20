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
  if (!user || user.role !== "expert") return <Redirect to="/login" />;

  const handleStatusUpdate = (bookingId: number, status: "completed" | "cancelled" | "no-show") => {
    updateStatus.mutate({ id: bookingId, data: { status } }, {
      onSuccess: () => {
        toast({ title: `Session marked as ${status}` });
        queryClient.invalidateQueries({ queryKey: getGetExpertDashboardQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to update", description: err.message, variant: "destructive" });
      },
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

  if (!dashboard) return <div className="p-8 text-center">Failed to load dashboard.</div>;

  const expert = dashboard.expert;

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Expert Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {expert.name}</p>
        </div>
        <Badge variant={expert.status === "approved" ? "default" : "secondary"} className="text-sm py-1.5 px-3">
          {expert.status === "approved" ? "✓ Approved Expert" : expert.status}
        </Badge>
      </div>

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
        <div className="bg-primary/10 p-5 rounded-2xl border border-primary/20 shadow-sm">
          <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-1">Net Earnings</div>
          <div className="text-2xl font-bold text-primary">KES {dashboard.netEarnings.toLocaleString()}</div>
        </div>
        <div className={`p-5 rounded-2xl border shadow-sm ${dashboard.pendingPayout > 0 ? "bg-yellow-50 border-yellow-200" : "bg-card"}`}>
          <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${dashboard.pendingPayout > 0 ? "text-yellow-700" : "text-muted-foreground"}`}>
            Pending Payout
          </div>
          <div className={`text-2xl font-bold ${dashboard.pendingPayout > 0 ? "text-yellow-700" : "text-foreground"}`}>
            KES {dashboard.pendingPayout.toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Awaiting payment from ScaleWise</div>
        </div>
      </div>

      {/* Upcoming Sessions */}
      <div className="bg-card rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/30 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Upcoming Sessions ({dashboard.upcomingBookings.length})</h2>
        </div>
        {dashboard.upcomingBookings.length ? (
          <div className="divide-y">
            {dashboard.upcomingBookings.map((booking) => (
              <div key={booking.id} className="p-6 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center hover:bg-muted/10 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-lg">{booking.clientName}</h3>
                    <Badge variant="secondary" className="capitalize">{booking.sessionType.replace(/_/g, " ")}</Badge>
                    {booking.amount && <span className="text-sm font-semibold text-primary">KES {booking.amount.toLocaleString()}</span>}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>📅 {new Date(booking.scheduledTime).toLocaleString()}</p>
                    <p>⏱ {booking.durationMinutes} minutes</p>
                    {booking.meetLink && (
                      <p className="text-primary mt-1">
                        🔗 <a href={booking.meetLink} target="_blank" rel="noreferrer" className="hover:underline font-medium">Join Meeting</a>
                      </p>
                    )}
                    {booking.notes && <p className="italic mt-1 text-xs">"{booking.notes}"</p>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleStatusUpdate(booking.id, "completed")}>
                    Mark Completed
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(booking.id, "cancelled")}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleStatusUpdate(booking.id, "no-show")}>
                    No-show
                  </Button>
                  <Link href={`/messages/${booking.id}`}>
                    <Button size="sm" variant="outline">💬 Messages</Button>
                  </Link>
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
          <div className="p-10 text-center text-muted-foreground">
            <p>No completed sessions yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

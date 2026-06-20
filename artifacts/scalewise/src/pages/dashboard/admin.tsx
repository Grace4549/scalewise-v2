import { useGetAdminStats, useListApplications, useListAllBookings, useListReviews, useApproveApplication, useRejectApplication, useDeleteReview } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListApplicationsQueryKey, getListAllBookingsQueryKey, getGetAdminStatsQueryKey, getListReviewsQueryKey } from "@workspace/api-client-react";

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: apps, isLoading: appsLoading } = useListApplications();
  const { data: bookings, isLoading: bookingsLoading } = useListAllBookings();
  const { data: reviews, isLoading: reviewsLoading } = useListReviews();

  const approveApp = useApproveApplication();
  const rejectApp = useRejectApplication();
  const deleteReview = useDeleteReview();

  if (authLoading) return <div className="p-8"><Skeleton className="h-[400px]" /></div>;
  if (!user || user.role !== 'admin') return <Redirect to="/" />;

  const handleApprove = (id: number) => {
    approveApp.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Application approved" });
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      }
    });
  };

  const handleReject = (id: number) => {
    rejectApp.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Application rejected" });
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      }
    });
  };

  const handleDeleteReview = (id: number) => {
    deleteReview.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Review deleted" });
        queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
      }
    });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Console</h1>
        <p className="text-muted-foreground">Manage platform operations.</p>
      </div>

      {statsLoading ? (
        <Skeleton className="h-32 w-full mb-8" />
      ) : stats ? (
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <div className="bg-card p-4 rounded-2xl border">
            <div className="text-sm text-muted-foreground">Total Experts</div>
            <div className="text-2xl font-bold">{stats.totalExperts}</div>
          </div>
          <div className="bg-card p-4 rounded-2xl border">
            <div className="text-sm text-muted-foreground">Pending Apps</div>
            <div className="text-2xl font-bold">{stats.pendingApplications}</div>
          </div>
          <div className="bg-card p-4 rounded-2xl border">
            <div className="text-sm text-muted-foreground">Total Bookings</div>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
          </div>
          <div className="bg-card p-4 rounded-2xl border">
            <div className="text-sm text-muted-foreground">Gross Volume</div>
            <div className="text-2xl font-bold">KES {stats.totalRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-primary/10 p-4 rounded-2xl border border-primary/20">
            <div className="text-sm text-primary font-medium">Platform Revenue</div>
            <div className="text-2xl font-bold text-primary">KES {stats.totalCommission.toLocaleString()}</div>
          </div>
        </div>
      ) : null}

      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="mb-6 w-full justify-start h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="applications" className="rounded-lg">Applications {apps && apps.filter(a => a.status === 'pending').length > 0 && <span className="ml-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">{apps.filter(a => a.status === 'pending').length}</span>}</TabsTrigger>
          <TabsTrigger value="bookings" className="rounded-lg">All Bookings</TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-lg">Manage Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <div className="bg-card rounded-2xl border overflow-hidden">
            {appsLoading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : apps?.length ? (
              <div className="divide-y">
                {apps.map(app => (
                  <div key={app.id} className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold flex items-center gap-3">
                          {app.name}
                          <Badge variant={app.status === 'pending' ? 'secondary' : app.status === 'approved' ? 'default' : 'destructive'}>
                            {app.status}
                          </Badge>
                        </h3>
                        <p className="text-muted-foreground">{app.email} • {app.industry} • {app.yearsExperience} years exp</p>
                      </div>
                      {app.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(app.id)}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(app.id)}>Reject</Button>
                        </div>
                      )}
                    </div>
                    
                    <div className="bg-muted/30 p-4 rounded-xl text-sm space-y-2 mb-4">
                      <p><strong>Headline:</strong> {app.headline}</p>
                      <p><strong>Bio:</strong> {app.bio}</p>
                      <p><strong>Skills:</strong> {app.skills?.join(', ')}</p>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm font-medium">
                      {app.discoveryPrice && <div>Discovery: KES {app.discoveryPrice}</div>}
                      {app.consultancyPrice && <div>Consultancy: KES {app.consultancyPrice}</div>}
                      {app.growthPrice3mo && <div>3mo Growth: KES {app.growthPrice3mo}</div>}
                      {app.growthPrice6mo && <div>6mo Growth: KES {app.growthPrice6mo}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">No applications found.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bookings">
          <div className="bg-card rounded-2xl border overflow-hidden">
            {bookingsLoading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : bookings?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-6 py-4 font-medium">ID</th>
                      <th className="px-6 py-4 font-medium">Expert</th>
                      <th className="px-6 py-4 font-medium">Client</th>
                      <th className="px-6 py-4 font-medium">Type</th>
                      <th className="px-6 py-4 font-medium">Date</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                      <th className="px-6 py-4 font-medium">Amount</th>
                      <th className="px-6 py-4 font-medium text-primary">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bookings.map(booking => (
                      <tr key={booking.id} className="hover:bg-muted/10">
                        <td className="px-6 py-4">#{booking.id}</td>
                        <td className="px-6 py-4 font-medium">{booking.expertName}</td>
                        <td className="px-6 py-4">{booking.clientName}</td>
                        <td className="px-6 py-4 capitalize">{booking.sessionType.replace('_', ' ')}</td>
                        <td className="px-6 py-4">{new Date(booking.scheduledTime).toLocaleDateString()}</td>
                        <td className="px-6 py-4"><Badge variant="outline">{booking.status}</Badge></td>
                        <td className="px-6 py-4">{booking.amount ? `KES ${booking.amount}` : '-'}</td>
                        <td className="px-6 py-4 font-medium text-primary">
                          {booking.commission ? `KES ${booking.commission}` : '-'}
                          {booking.commissionRate && <span className="text-xs ml-1 text-muted-foreground">({booking.commissionRate}%)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">No bookings found.</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="bg-card rounded-2xl border overflow-hidden">
            {reviewsLoading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : reviews?.length ? (
              <div className="divide-y">
                {reviews.map(review => (
                  <div key={review.id} className="p-6 flex justify-between items-start">
                    <div>
                      <div className="flex text-yellow-500 mb-2">{"★".repeat(review.rating)}</div>
                      <p className="text-foreground font-medium mb-1">"{review.body}"</p>
                      <p className="text-sm text-muted-foreground">{review.reviewerName} {review.businessName ? `(${review.businessName})` : ''} • Expert ID: {review.expertId}</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteReview(review.id)}>Delete</Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">No reviews found.</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

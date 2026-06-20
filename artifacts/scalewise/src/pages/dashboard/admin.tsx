import { useState } from "react";
import {
  useGetAdminStats, useListApplications, useListAllBookings, useListReviews,
  useApproveApplication, useRejectApplication, useDeleteReview,
  useGetExpertBreakdown, useMarkBookingPaid, useAdminUpdateBookingStatus,
  useListAdminMessages, useSendAdminMessage,
  getListApplicationsQueryKey, getListAllBookingsQueryKey, getGetAdminStatsQueryKey,
  getListReviewsQueryKey, getGetExpertBreakdownQueryKey, getListAdminMessagesQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

function StatCard({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`p-5 rounded-2xl border shadow-sm ${highlight ? "bg-primary/10 border-primary/20" : "bg-card"}`}>
      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${highlight ? "text-primary" : "text-muted-foreground"}`}>{label}</div>
      <div className={`text-2xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    upcoming: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    "no-show": "bg-orange-100 text-orange-700",
  };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedExpertId, setSelectedExpertId] = useState<number | null>(null);
  const [adminMsgBody, setAdminMsgBody] = useState("");
  const [bookingFilter, setBookingFilter] = useState<string>("");

  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: apps, isLoading: appsLoading } = useListApplications();
  const { data: bookings, isLoading: bookingsLoading } = useListAllBookings({
    status: bookingFilter as any || undefined,
  });
  const { data: reviews } = useListReviews();
  const { data: breakdown } = useGetExpertBreakdown();
  const { data: adminMessages } = useListAdminMessages(selectedExpertId ?? 0, {
    query: { queryKey: getListAdminMessagesQueryKey(selectedExpertId ?? 0), enabled: selectedExpertId !== null },
  });

  const approveApp = useApproveApplication();
  const rejectApp = useRejectApplication();
  const deleteReview = useDeleteReview();
  const markPaid = useMarkBookingPaid();
  const adminStatusUpdate = useAdminUpdateBookingStatus();
  const sendAdminMsg = useSendAdminMessage();

  if (authLoading) return <div className="p-8"><Skeleton className="h-[400px]" /></div>;
  if (!user || user.role !== "admin") return <Redirect to="/" />;

  const handleApprove = (id: number) => {
    approveApp.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Application approved" });
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      },
    });
  };

  const handleReject = (id: number) => {
    rejectApp.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Application rejected" });
        queryClient.invalidateQueries({ queryKey: getListApplicationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      },
    });
  };

  const handleDeleteReview = (id: number) => {
    deleteReview.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Review deleted" });
        queryClient.invalidateQueries({ queryKey: getListReviewsQueryKey() });
      },
    });
  };

  const handleMarkPaid = (bookingId: number) => {
    markPaid.mutate({ id: bookingId }, {
      onSuccess: () => {
        toast({ title: "Payout marked as paid" });
        queryClient.invalidateQueries({ queryKey: getListAllBookingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetExpertBreakdownQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.message, variant: "destructive" });
      },
    });
  };

  const handleAdminStatus = (bookingId: number, status: string) => {
    adminStatusUpdate.mutate({ id: bookingId, data: { status: status as any } }, {
      onSuccess: () => {
        toast({ title: `Booking marked as ${status}` });
        queryClient.invalidateQueries({ queryKey: getListAllBookingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
      },
    });
  };

  const handleSendAdminMessage = (expertId: number) => {
    if (!adminMsgBody.trim()) return;
    sendAdminMsg.mutate({ expertId, data: { body: adminMsgBody } }, {
      onSuccess: () => {
        setAdminMsgBody("");
        queryClient.invalidateQueries({ queryKey: getListAdminMessagesQueryKey(expertId) });
      },
      onError: (err: any) => {
        toast({ title: "Send failed", description: err?.message, variant: "destructive" });
      },
    });
  };

  const pendingApps = apps?.filter((a) => a.status === "pending").length ?? 0;

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Console</h1>
        <p className="text-muted-foreground">Manage platform operations and payouts.</p>
      </div>

      {statsLoading ? (
        <Skeleton className="h-32 w-full mb-8" />
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <StatCard label="Total Experts" value={stats.totalExperts} />
          <StatCard label="Pending Apps" value={stats.pendingApplications} />
          <StatCard label="Upcoming" value={stats.upcomingBookings} />
          <StatCard label="Completed" value={stats.completedBookings} />
          <StatCard label="Cancelled" value={stats.cancelledBookings} />
          <StatCard label="Gross Volume" value={`KES ${stats.totalRevenue.toLocaleString()}`} />
          <StatCard label="Platform Revenue" value={`KES ${stats.totalCommission.toLocaleString()}`} highlight />
          <StatCard label="Pending Payout" value={`KES ${stats.pendingPayout.toLocaleString()}`} sub="Awaiting payment to experts" />
          <StatCard label="Paid Out" value={`KES ${stats.paidPayout.toLocaleString()}`} />
          <StatCard label="Total Bookings" value={stats.totalBookings} />
        </div>
      ) : null}

      <Tabs defaultValue="applications" className="w-full">
        <TabsList className="mb-6 w-full justify-start h-12 bg-muted/50 p-1 rounded-xl flex-wrap gap-1">
          <TabsTrigger value="applications" className="rounded-lg">
            Applications {pendingApps > 0 && <span className="ml-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">{pendingApps}</span>}
          </TabsTrigger>
          <TabsTrigger value="bookings" className="rounded-lg">All Bookings</TabsTrigger>
          <TabsTrigger value="payouts" className="rounded-lg">Expert Payouts</TabsTrigger>
          <TabsTrigger value="messaging" className="rounded-lg">Expert Messages</TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-lg">Reviews</TabsTrigger>
        </TabsList>

        {/* Applications Tab */}
        <TabsContent value="applications">
          <div className="bg-card rounded-2xl border overflow-hidden">
            {appsLoading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : apps?.length ? (
              <div className="divide-y">
                {apps.map((app) => (
                  <div key={app.id} className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-bold flex items-center gap-3">
                          {app.name}
                          <Badge variant={app.status === "pending" ? "secondary" : app.status === "approved" ? "default" : "destructive"}>
                            {app.status}
                          </Badge>
                        </h3>
                        <p className="text-sm text-muted-foreground">{app.email} · {app.industry} · {app.yearsExperience} yrs exp</p>
                      </div>
                      {app.status === "pending" && (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(app.id)}>Approve</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(app.id)}>Reject</Button>
                        </div>
                      )}
                    </div>
                    <div className="bg-muted/30 p-4 rounded-xl text-sm space-y-1.5 mb-3">
                      <p><strong>Headline:</strong> {app.headline}</p>
                      <p><strong>Bio:</strong> {app.bio}</p>
                      <p><strong>Skills:</strong> {app.skills?.join(", ")}</p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm font-medium">
                      {app.discoveryPrice != null && <span>Discovery: KES {app.discoveryPrice}</span>}
                      {app.consultancyPrice != null && <span>Consultancy: KES {app.consultancyPrice}</span>}
                      {app.growthPrice3mo != null && <span>3mo Growth: KES {app.growthPrice3mo}</span>}
                      {app.growthPrice6mo != null && <span>6mo Growth: KES {app.growthPrice6mo}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">No applications found.</div>
            )}
          </div>
        </TabsContent>

        {/* All Bookings Tab */}
        <TabsContent value="bookings">
          <div className="mb-4 flex items-center gap-3">
            <select
              value={bookingFilter}
              onChange={(e) => setBookingFilter(e.target.value)}
              className="h-10 px-3 rounded-lg border bg-card text-sm"
            >
              <option value="">All statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No-show</option>
            </select>
            <span className="text-sm text-muted-foreground">{bookings?.length ?? 0} bookings</span>
          </div>
          <div className="bg-card rounded-2xl border overflow-hidden">
            {bookingsLoading ? (
              <div className="p-8 text-center">Loading...</div>
            ) : bookings?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3">ID</th>
                      <th className="px-4 py-3">Expert</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3 text-primary">Commission</th>
                      <th className="px-4 py-3 text-green-700">Expert Earns</th>
                      <th className="px-4 py-3">Payout</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/10">
                        <td className="px-4 py-3 font-mono text-xs">#{b.id}</td>
                        <td className="px-4 py-3 font-medium">{b.expertName}</td>
                        <td className="px-4 py-3">{b.clientName}</td>
                        <td className="px-4 py-3 capitalize">{b.sessionType.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{new Date(b.scheduledTime).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{statusBadge(b.status)}</td>
                        <td className="px-4 py-3">{b.amount ? `KES ${b.amount.toLocaleString()}` : "—"}</td>
                        <td className="px-4 py-3 font-medium text-primary">
                          {b.commission ? `KES ${b.commission.toFixed(0)}` : "—"}
                          {b.commissionRate != null && <span className="text-xs ml-1 text-muted-foreground">({(b.commissionRate * 100).toFixed(0)}%)</span>}
                        </td>
                        <td className="px-4 py-3 font-medium text-green-700">
                          {b.expertEarnings != null ? `KES ${b.expertEarnings.toFixed(0)}` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {b.status === "completed" ? (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${b.payoutStatus === "paid" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                              {b.payoutStatus === "paid" ? "Paid" : "Pending"}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {b.status === "completed" && b.payoutStatus !== "paid" && (
                              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleMarkPaid(b.id)}>
                                Mark Paid
                              </Button>
                            )}
                            {b.status === "upcoming" && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAdminStatus(b.id, "cancelled")}>
                                  Cancel
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAdminStatus(b.id, "no-show")}>
                                  No-show
                                </Button>
                              </>
                            )}
                          </div>
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

        {/* Expert Payouts Tab */}
        <TabsContent value="payouts">
          <div className="bg-card rounded-2xl border overflow-hidden">
            {!breakdown?.length ? (
              <div className="p-12 text-center text-muted-foreground">No experts yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3">Expert</th>
                      <th className="px-4 py-3">Industry</th>
                      <th className="px-4 py-3">Rating</th>
                      <th className="px-4 py-3">Sessions</th>
                      <th className="px-4 py-3">Total Revenue</th>
                      <th className="px-4 py-3 text-primary">Commission</th>
                      <th className="px-4 py-3">Expert Total</th>
                      <th className="px-4 py-3 text-yellow-700">Pending Payout</th>
                      <th className="px-4 py-3 text-green-700">Paid Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {breakdown.map((e) => (
                      <tr key={e.expertId} className="hover:bg-muted/10">
                        <td className="px-4 py-3 font-semibold">{e.expertName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{e.industry}</td>
                        <td className="px-4 py-3">⭐ {e.rating.toFixed(1)}</td>
                        <td className="px-4 py-3">{e.completedBookings}/{e.totalBookings}</td>
                        <td className="px-4 py-3">KES {e.totalRevenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-primary font-medium">KES {e.totalCommission.toFixed(0)}</td>
                        <td className="px-4 py-3">KES {e.expertEarnings.toFixed(0)}</td>
                        <td className="px-4 py-3">
                          {e.pendingPayout > 0 ? (
                            <span className="text-yellow-700 font-semibold">KES {e.pendingPayout.toFixed(0)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-green-700 font-medium">
                          {e.paidPayout > 0 ? `KES ${e.paidPayout.toFixed(0)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Expert Messaging Tab */}
        <TabsContent value="messaging">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card rounded-2xl border overflow-hidden">
              <div className="p-4 border-b bg-muted/30">
                <h3 className="font-semibold text-sm">Select Expert</h3>
              </div>
              <div className="divide-y">
                {breakdown?.map((e) => (
                  <button
                    key={e.expertId}
                    onClick={() => setSelectedExpertId(e.expertId)}
                    className={`w-full text-left px-4 py-3 text-sm hover:bg-muted/30 transition-colors ${selectedExpertId === e.expertId ? "bg-primary/10 font-semibold" : ""}`}
                  >
                    {e.expertName}
                    <div className="text-xs text-muted-foreground">{e.industry}</div>
                  </button>
                )) ?? <div className="p-4 text-sm text-muted-foreground">No approved experts yet.</div>}
              </div>
            </div>

            <div className="md:col-span-2 bg-card rounded-2xl border flex flex-col overflow-hidden">
              {selectedExpertId === null ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center">
                  Select an expert to start a conversation.
                </div>
              ) : (
                <>
                  <div className="p-4 border-b bg-muted/30">
                    <h3 className="font-semibold">Message Thread — {breakdown?.find((e) => e.expertId === selectedExpertId)?.expertName}</h3>
                    <p className="text-xs text-muted-foreground">Permanent admin-to-expert channel</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
                    {!adminMessages?.length ? (
                      <div className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation.</div>
                    ) : (
                      adminMessages.map((m) => (
                        <div key={m.id} className={`flex ${m.senderRole === "admin" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${m.senderRole === "admin" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            <div className="font-medium text-xs mb-0.5 opacity-70">{m.senderName}</div>
                            <p>{m.body}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-4 border-t flex gap-2">
                    <Input
                      value={adminMsgBody}
                      onChange={(e) => setAdminMsgBody(e.target.value)}
                      placeholder="Type a message..."
                      onKeyDown={(e) => e.key === "Enter" && handleSendAdminMessage(selectedExpertId)}
                      className="flex-1"
                    />
                    <Button onClick={() => handleSendAdminMessage(selectedExpertId)} disabled={sendAdminMsg.isPending || !adminMsgBody.trim()}>
                      Send
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews">
          <div className="bg-card rounded-2xl border overflow-hidden">
            {!reviews?.length ? (
              <div className="p-12 text-center text-muted-foreground">No reviews found.</div>
            ) : (
              <div className="divide-y">
                {reviews.map((review) => (
                  <div key={review.id} className="p-6 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-yellow-500 font-semibold">{"★".repeat(review.rating)}</span>
                        <Badge variant="outline" className="text-xs">{review.reviewType}</Badge>
                      </div>
                      <p className="text-foreground font-medium mb-1">"{review.body}"</p>
                      <p className="text-sm text-muted-foreground">{review.reviewerName} {review.businessName ? `(${review.businessName})` : ""} · Expert #{review.expertId}</p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteReview(review.id)}>Delete</Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

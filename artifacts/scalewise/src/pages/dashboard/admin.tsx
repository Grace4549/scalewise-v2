import { useState } from "react";
import {
  useGetAdminStats, useListApplications, useListAllBookings, useListReviews,
  useApproveApplication, useRejectApplication, useDeleteReview,
  useGetExpertBreakdown, useMarkBookingPaid, useAdminUpdateBookingStatus,
  useListAdminMessages, useSendAdminMessage, useMarkExpertPaid,
  getListApplicationsQueryKey, getListAllBookingsQueryKey, getGetAdminStatsQueryKey,
  getListReviewsQueryKey, getGetExpertBreakdownQueryKey, getListAdminMessagesQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Link, Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const C = {
  blue: "#6395EE",
  mblue: "#90B8D6",
  green: "#88CFA8",
  mint: "#85DECB",
};

function DateRangeFilter({
  from, to, onFromChange, onToChange, label = "Date range",
}: {
  from: string; to: string; onFromChange: (v: string) => void; onToChange: (v: string) => void; label?: string;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}:</span>
      <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)}
        className="h-9 px-3 rounded-lg border bg-card text-sm" />
      <span className="text-xs text-muted-foreground">→</span>
      <input type="date" value={to} onChange={(e) => onToChange(e.target.value)}
        className="h-9 px-3 rounded-lg border bg-card text-sm" />
      {(from || to) && (
        <button onClick={() => { onFromChange(""); onToChange(""); }}
          className="text-xs underline text-muted-foreground hover:text-foreground">
          Clear
        </button>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, accent, onClick }: {
  label: string; value: string | number; sub?: string; accent?: string; onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl border shadow-sm bg-card transition-all ${clickable ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:scale-95 select-none" : ""}`}
      style={accent ? { borderColor: accent + "50", background: accent + "10" } : {}}
    >
      <div className="text-xs font-semibold uppercase tracking-wide mb-1"
        style={{ color: accent ?? "var(--muted-foreground)" }}>{label}</div>
      <div className="text-2xl font-bold" style={{ color: accent ?? "var(--foreground)" }}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      {clickable && (
        <div className="text-xs mt-2 font-medium opacity-60 flex items-center gap-1"
          style={{ color: accent ?? "var(--muted-foreground)" }}>
          View details →
        </div>
      )}
    </div>
  );
}

function PayoutBadge({ status }: { status?: string | null }) {
  if (status === "paid") return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: C.green + "33", color: "#1a5730" }}>Paid</span>
  );
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: C.mint + "33", color: "#0f5248" }}>Pending</span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    upcoming: { bg: C.mint + "30", color: "#0f5248" },
    completed: { bg: C.green + "30", color: "#1a5730" },
    cancelled: { bg: "#fecaca", color: "#b91c1c" },
    "no-show": { bg: "#fed7aa", color: "#c2410c" },
  };
  const s = map[status] ?? { bg: "#e5e7eb", color: "#6b7280" };
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>{status}</span>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SectionHeader({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color }}>{children}</div>
  );
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("applications");
  const [selectedExpertId, setSelectedExpertId] = useState<number | null>(null);
  const [adminMsgBody, setAdminMsgBody] = useState("");

  const [bookingFilter, setBookingFilter] = useState("");
  const [bookingDateFrom, setBookingDateFrom] = useState("");
  const [bookingDateTo, setBookingDateTo] = useState("");
  const [expandedBookings, setExpandedBookings] = useState<Set<number>>(new Set());

  const [appStatusFilter, setAppStatusFilter] = useState<"" | "pending" | "approved" | "rejected">("");
  const [appDateFrom, setAppDateFrom] = useState("");
  const [appDateTo, setAppDateTo] = useState("");

  const [payoutDateFrom, setPayoutDateFrom] = useState("");
  const [payoutDateTo, setPayoutDateTo] = useState("");
  const [expandedExperts, setExpandedExperts] = useState<Set<number>>(new Set());
  const [expertPayDates, setExpertPayDates] = useState<Record<number, string>>({});

  const [reviewDateFrom, setReviewDateFrom] = useState("");
  const [reviewDateTo, setReviewDateTo] = useState("");

  const { data: stats, isLoading: statsLoading } = useGetAdminStats();

  const appParams = (appDateFrom || appDateTo)
    ? { dateFrom: appDateFrom || undefined, dateTo: appDateTo || undefined }
    : undefined;
  const { data: apps, isLoading: appsLoading } = useListApplications(appParams);

  const { data: bookings, isLoading: bookingsLoading } = useListAllBookings({
    status: bookingFilter as any || undefined,
    dateFrom: bookingDateFrom || undefined,
    dateTo: bookingDateTo || undefined,
  });

  const payoutBookingParams = {
    status: "completed" as const,
    dateFrom: payoutDateFrom || undefined,
    dateTo: payoutDateTo || undefined,
  };
  const { data: completedBookings } = useListAllBookings(payoutBookingParams, {
    query: { queryKey: getListAllBookingsQueryKey(payoutBookingParams) },
  });

  const { data: reviews } = useListReviews();

  const breakdownParams = (payoutDateFrom || payoutDateTo)
    ? { dateFrom: payoutDateFrom || undefined, dateTo: payoutDateTo || undefined }
    : undefined;
  const { data: breakdown, isLoading: breakdownLoading } = useGetExpertBreakdown(breakdownParams);

  const { data: adminMessages } = useListAdminMessages(selectedExpertId ?? 0, {
    query: { queryKey: getListAdminMessagesQueryKey(selectedExpertId ?? 0), enabled: selectedExpertId !== null },
  });

  const approveApp = useApproveApplication();
  const rejectApp = useRejectApplication();
  const deleteReview = useDeleteReview();
  const markPaid = useMarkBookingPaid();
  const markExpertPaidMut = useMarkExpertPaid();
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

  const handleMarkExpertPaid = (expertId: number, count: number) => {
    const paidAt = expertPayDates[expertId];
    markExpertPaidMut.mutate(
      { id: expertId, data: paidAt ? { paidAt } : undefined },
      {
        onSuccess: (result) => {
          toast({ title: `Marked ${result.count} booking${result.count !== 1 ? "s" : ""} as paid` });
          queryClient.invalidateQueries({ queryKey: getListAllBookingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetExpertBreakdownQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Error", description: err?.message, variant: "destructive" });
        },
      }
    );
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

  const navigateTo = (tab: string, opts?: {
    bookingStatus?: string;
    appStatus?: "" | "pending" | "approved" | "rejected";
  }) => {
    setActiveTab(tab);
    if (opts?.bookingStatus !== undefined) setBookingFilter(opts.bookingStatus);
    if (opts?.appStatus !== undefined) setAppStatusFilter(opts.appStatus);
    setTimeout(() => window.scrollTo({ top: 400, behavior: "smooth" }), 50);
  };

  const toggleBooking = (id: number) => setExpandedBookings((p) => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const toggleExpert = (id: number) => setExpandedExperts((p) => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const pendingApps = apps?.filter((a) => a.status === "pending").length ?? 0;

  const filteredReviews = reviews?.filter((r) => {
    if (reviewDateFrom && r.createdAt < reviewDateFrom) return false;
    if (reviewDateTo && r.createdAt > reviewDateTo + "T23:59:59") return false;
    return true;
  });

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  const fmtDateTime = (iso: string) =>
    new Date(iso).toLocaleString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
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
      <div className="mb-8 flex items-center gap-4">
        <div className="w-1.5 h-12 rounded-full" style={{ background: `linear-gradient(to bottom, ${C.blue}, ${C.mint})` }} />
        <div>
          <h1 className="text-3xl font-bold">
            <span style={{ color: C.blue }}>Admin</span>
            {" "}
            <span style={{ color: C.mblue }}>Console</span>
          </h1>
          <p className="text-sm font-medium mt-0.5">
            <span style={{ color: C.green }}>Manage</span>
            <span className="text-muted-foreground"> platform operations, </span>
            <span style={{ color: C.mint }}>payouts</span>
            <span className="text-muted-foreground">, and </span>
            <span style={{ color: C.blue }}>applications</span>
            <span className="text-muted-foreground">.</span>
          </p>
        </div>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <Skeleton className="h-32 w-full mb-8" />
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <StatCard label="Total Experts" value={stats.totalExperts} accent={C.mblue}
            onClick={() => navigateTo("payouts")} />
          <StatCard label="Pending Apps" value={stats.pendingApplications} accent={C.blue}
            onClick={() => navigateTo("applications", { appStatus: "pending" })} />
          <StatCard label="Upcoming" value={stats.upcomingBookings} accent={C.mint}
            onClick={() => navigateTo("bookings", { bookingStatus: "upcoming" })} />
          <StatCard label="Completed" value={stats.completedBookings} accent={C.green}
            onClick={() => navigateTo("bookings", { bookingStatus: "completed" })} />
          <StatCard label="Cancelled" value={stats.cancelledBookings} accent={C.blue}
            onClick={() => navigateTo("bookings", { bookingStatus: "cancelled" })} />
          <StatCard label="Gross Volume" value={`KES ${stats.totalRevenue.toLocaleString()}`} accent={C.mint} sub="Total collected from clients"
            onClick={() => navigateTo("bookings", { bookingStatus: "completed" })} />
          <StatCard label="Platform Revenue" value={`KES ${stats.totalCommission.toLocaleString()}`} accent={C.blue} sub="Your commission cut"
            onClick={() => navigateTo("bookings", { bookingStatus: "completed" })} />
          <StatCard label="Pending Payout" value={`KES ${stats.pendingPayout.toLocaleString()}`} accent={C.mint} sub="Owed to experts via M-Pesa"
            onClick={() => navigateTo("payouts")} />
          <StatCard label="Paid Out" value={`KES ${stats.paidPayout.toLocaleString()}`} accent={C.green}
            onClick={() => navigateTo("payouts")} />
          <StatCard label="Total Bookings" value={stats.totalBookings} accent={C.mblue}
            onClick={() => navigateTo("bookings", { bookingStatus: "" })} />
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 w-full justify-start h-auto bg-muted/40 p-1.5 rounded-xl flex-wrap gap-1 border">
          <TabsTrigger value="applications"
            className="rounded-lg font-medium transition-all data-[state=active]:shadow-sm data-[state=active]:text-white"
            style={activeTab === "applications" ? { backgroundColor: C.blue, color: "white" } : { color: C.blue }}>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.blue, opacity: activeTab === "applications" ? 0 : 1 }} />
              Applications
              {pendingApps > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                  style={activeTab === "applications"
                    ? { backgroundColor: "rgba(255,255,255,0.3)", color: "white" }
                    : { backgroundColor: C.blue + "22", color: C.blue }}>
                  {pendingApps}
                </span>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="bookings"
            className="rounded-lg font-medium transition-all data-[state=active]:shadow-sm"
            style={activeTab === "bookings" ? { backgroundColor: C.mint, color: "#0f5248" } : { color: C.mint === "#85DECB" ? "#0f7a6a" : C.mint }}>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.mint, opacity: activeTab === "bookings" ? 0 : 1 }} />
              All Bookings
            </span>
          </TabsTrigger>
          <TabsTrigger value="payouts"
            className="rounded-lg font-medium transition-all data-[state=active]:shadow-sm"
            style={activeTab === "payouts" ? { backgroundColor: C.green, color: "#1a5730" } : { color: "#1a7a42" }}>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.green, opacity: activeTab === "payouts" ? 0 : 1 }} />
              Expert Payouts
            </span>
          </TabsTrigger>
          <TabsTrigger value="messaging"
            className="rounded-lg font-medium transition-all data-[state=active]:shadow-sm"
            style={activeTab === "messaging" ? { backgroundColor: C.mblue, color: "#1a3a5c" } : { color: "#2a5a8c" }}>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.mblue, opacity: activeTab === "messaging" ? 0 : 1 }} />
              Expert Messages
            </span>
          </TabsTrigger>
          <TabsTrigger value="reviews"
            className="rounded-lg font-medium transition-all data-[state=active]:shadow-sm"
            style={activeTab === "reviews" ? { backgroundColor: C.blue, color: "white" } : { color: C.blue }}>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C.blue, opacity: activeTab === "reviews" ? 0 : 1 }} />
              Reviews
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ── APPLICATIONS ── */}
        <TabsContent value="applications">
          <div className="mb-4 p-4 bg-card rounded-xl border flex flex-wrap gap-4 items-center">
            <select value={appStatusFilter} onChange={(e) => setAppStatusFilter(e.target.value as any)}
              className="h-9 px-3 rounded-lg border bg-background text-sm">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <DateRangeFilter from={appDateFrom} to={appDateTo}
              onFromChange={setAppDateFrom} onToChange={setAppDateTo} label="Applied between" />
            <span className="text-sm text-muted-foreground ml-auto">
              {(appStatusFilter ? apps?.filter(a => a.status === appStatusFilter) : apps)?.length ?? 0} application{((appStatusFilter ? apps?.filter(a => a.status === appStatusFilter) : apps)?.length ?? 0) !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="bg-card rounded-2xl border overflow-hidden">
            {appsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : (appStatusFilter ? apps?.filter(a => a.status === appStatusFilter) : apps)?.length ? (
              <div className="divide-y">
                {(appStatusFilter ? apps?.filter(a => a.status === appStatusFilter) : apps)!.map((app) => (
                  <div key={app.id} className="p-6">
                    <div className="flex justify-between items-start mb-3 gap-4">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold flex flex-wrap items-center gap-3">
                          {app.name}
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                            style={
                              app.status === "approved"
                                ? { backgroundColor: C.green + "33", color: "#1a5730" }
                                : app.status === "pending"
                                  ? { backgroundColor: C.blue + "22", color: C.blue }
                                  : { backgroundColor: "#fecaca", color: "#b91c1c" }
                            }>
                            {app.status}
                          </span>
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {app.email} · {app.industry} · {app.yearsExperience} yrs exp
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Applied: {fmtDate(app.createdAt)}
                        </p>
                      </div>
                      {app.status === "pending" && (
                        <div className="flex gap-2 shrink-0">
                          <Button size="sm" className="hover:opacity-90"
                            style={{ backgroundColor: C.green, color: "#1a5730" }}
                            onClick={() => handleApprove(app.id)}
                            disabled={approveApp.isPending}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive"
                            onClick={() => handleReject(app.id)}
                            disabled={rejectApp.isPending}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="bg-muted/30 p-4 rounded-xl text-sm space-y-1.5 mb-3">
                      <p><strong>Headline:</strong> {app.headline}</p>
                      <p><strong>Bio:</strong> {app.bio}</p>
                      <p><strong>Skills:</strong> {app.skills?.join(", ")}</p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm font-medium">
                      {app.discoveryPrice != null && (
                        <span style={{ color: C.mblue }}>Discovery: KES {app.discoveryPrice.toLocaleString()}</span>
                      )}
                      {app.consultancyPrice != null && (
                        <span style={{ color: C.mblue }}>Consultancy: KES {app.consultancyPrice.toLocaleString()}</span>
                      )}
                      {app.growthPrice3mo != null && (
                        <span style={{ color: C.blue }}>3mo Growth: KES {app.growthPrice3mo.toLocaleString()}</span>
                      )}
                      {app.growthPrice6mo != null && (
                        <span style={{ color: C.blue }}>6mo Growth: KES {app.growthPrice6mo.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                No applications found{appStatusFilter ? ` with status "${appStatusFilter}"` : ""}.
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── ALL BOOKINGS ── */}
        <TabsContent value="bookings">
          <div className="mb-4 p-4 bg-card rounded-xl border flex flex-wrap gap-4 items-center">
            <select value={bookingFilter} onChange={(e) => setBookingFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border bg-background text-sm">
              <option value="">All statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No-show</option>
            </select>
            <DateRangeFilter from={bookingDateFrom} to={bookingDateTo}
              onFromChange={setBookingDateFrom} onToChange={setBookingDateTo} label="Session date" />
            <span className="text-sm text-muted-foreground ml-auto">{bookings?.length ?? 0} booking{bookings?.length !== 1 ? "s" : ""}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3 ml-1">Click any row to expand full details.</p>
          <div className="bg-card rounded-2xl border overflow-hidden">
            {bookingsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : bookings?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase tracking-wide"
                    style={{ backgroundColor: C.mblue + "20", color: C.mblue }}>
                    <tr>
                      <th className="px-4 py-3 w-8" />
                      <th className="px-4 py-3">Expert</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Scheduled</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3" style={{ color: C.blue }}>Commission</th>
                      <th className="px-4 py-3" style={{ color: C.green }}>Expert Earns</th>
                      <th className="px-4 py-3">Payout</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bookings.map((b) => (
                      <>
                        <tr key={b.id} className="hover:bg-muted/10 cursor-pointer select-none"
                          onClick={() => toggleBooking(b.id)}>
                          <td className="px-4 py-3 text-muted-foreground">
                            <Chevron open={expandedBookings.has(b.id)} />
                          </td>
                          <td className="px-4 py-3 font-medium">{b.expertName}</td>
                          <td className="px-4 py-3">{b.clientName}</td>
                          <td className="px-4 py-3 capitalize">{b.sessionType.replace(/_/g, " ")}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div>{fmtDate(b.scheduledTime)}</div>
                            <div className="text-xs text-muted-foreground">{fmtTime(b.scheduledTime)}</div>
                          </td>
                          <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                          <td className="px-4 py-3">{b.amount ? `KES ${b.amount.toLocaleString()}` : "—"}</td>
                          <td className="px-4 py-3 font-medium" style={{ color: C.blue }}>
                            {b.commission ? `KES ${b.commission.toFixed(0)}` : "—"}
                            {b.commissionRate != null && (
                              <span className="text-xs ml-1 text-muted-foreground">
                                ({(b.commissionRate * 100).toFixed(0)}%)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium" style={{ color: C.green }}>
                            {b.expertEarnings != null ? `KES ${b.expertEarnings.toFixed(0)}` : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {b.status === "completed" ? <PayoutBadge status={b.payoutStatus} /> : "—"}
                          </td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              {b.status === "completed" && b.payoutStatus !== "paid" && (
                                <Button size="sm" className="h-7 text-xs hover:opacity-90"
                                  style={{ backgroundColor: C.green, color: "#1a5730" }}
                                  onClick={() => handleMarkPaid(b.id)}
                                  disabled={markPaid.isPending}>
                                  Mark Paid
                                </Button>
                              )}
                              {b.status === "upcoming" && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 text-xs"
                                    onClick={() => handleAdminStatus(b.id, "completed")}>
                                    Complete
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs"
                                    onClick={() => handleAdminStatus(b.id, "cancelled")}>
                                    Cancel
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs"
                                    onClick={() => handleAdminStatus(b.id, "no-show")}>
                                    No-show
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedBookings.has(b.id) && (
                          <tr key={`exp-${b.id}`}>
                            <td colSpan={11} className="px-0 py-0">
                              <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-5 text-sm"
                                style={{ backgroundColor: C.mblue + "0E" }}>
                                <div>
                                  <SectionHeader color={C.mblue}>Date & Time</SectionHeader>
                                  <div className="font-medium">{fmtDateTime(b.scheduledTime)}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Duration: {b.durationMinutes ?? "—"} min
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Booked on: {fmtDate(b.createdAt)}
                                  </div>
                                </div>
                                <div>
                                  <SectionHeader color={C.mblue}>Participants</SectionHeader>
                                  <div>Expert: <span className="font-medium">{b.expertName ?? "—"}</span></div>
                                  <div>Client: <span className="font-medium">{b.clientName ?? "—"}</span></div>
                                </div>
                                <div>
                                  <SectionHeader color={C.blue}>Google Meet Link</SectionHeader>
                                  {b.meetLink ? (
                                    <a href={b.meetLink} target="_blank" rel="noreferrer"
                                      className="underline break-all" style={{ color: C.blue }}>
                                      {b.meetLink}
                                    </a>
                                  ) : (
                                    <span className="text-muted-foreground">Not set</span>
                                  )}
                                </div>
                                <div>
                                  <SectionHeader color={C.green}>Payout Details</SectionHeader>
                                  <div>Status: <PayoutBadge status={b.payoutStatus} /></div>
                                  {b.payoutPaidAt && (
                                    <div className="text-xs mt-1" style={{ color: C.green }}>
                                      Paid on: {fmtDate(b.payoutPaidAt)}
                                    </div>
                                  )}
                                  {b.notes && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      Notes: {b.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">No bookings found.</div>
            )}
          </div>
        </TabsContent>

        {/* ── EXPERT PAYOUTS ── */}
        <TabsContent value="payouts">
          <div className="mb-4 p-4 bg-card rounded-xl border flex flex-wrap gap-4 items-center">
            <DateRangeFilter from={payoutDateFrom} to={payoutDateTo}
              onFromChange={setPayoutDateFrom} onToChange={setPayoutDateTo} label="Session date range" />
          </div>
          <p className="text-xs text-muted-foreground mb-3 ml-1">Click any expert row to see pending bookings and mark them paid.</p>
          <div className="bg-card rounded-2xl border overflow-hidden">
            {breakdownLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading...</div>
            ) : !breakdown?.length ? (
              <div className="p-12 text-center text-muted-foreground">No approved experts yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase tracking-wide"
                    style={{ backgroundColor: C.mblue + "20", color: C.mblue }}>
                    <tr>
                      <th className="px-4 py-3 w-8" />
                      <th className="px-4 py-3">Expert</th>
                      <th className="px-4 py-3">Industry</th>
                      <th className="px-4 py-3">Rating</th>
                      <th className="px-4 py-3">Sessions</th>
                      <th className="px-4 py-3">Total Revenue</th>
                      <th className="px-4 py-3" style={{ color: C.blue }}>Commission</th>
                      <th className="px-4 py-3">Expert Total</th>
                      <th className="px-4 py-3" style={{ color: "#b45309" }}>Pending Payout</th>
                      <th className="px-4 py-3" style={{ color: C.green }}>Paid Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {breakdown.map((e) => {
                      const pendingBookings = completedBookings?.filter(
                        (b) => b.expertId === e.expertId && b.payoutStatus === "pending"
                      ) ?? [];
                      return (
                        <>
                          <tr key={e.expertId} className="hover:bg-muted/10 cursor-pointer select-none"
                            onClick={() => toggleExpert(e.expertId)}>
                            <td className="px-4 py-3 text-muted-foreground">
                              <Chevron open={expandedExperts.has(e.expertId)} />
                            </td>
                            <td className="px-4 py-3 font-semibold">{e.expertName}</td>
                            <td className="px-4 py-3 text-muted-foreground">{e.industry}</td>
                            <td className="px-4 py-3">⭐ {e.rating.toFixed(1)}</td>
                            <td className="px-4 py-3">{e.completedBookings}/{e.totalBookings}</td>
                            <td className="px-4 py-3">KES {e.totalRevenue.toLocaleString()}</td>
                            <td className="px-4 py-3 font-medium" style={{ color: C.blue }}>
                              KES {e.totalCommission.toFixed(0)}
                            </td>
                            <td className="px-4 py-3">KES {e.expertEarnings.toFixed(0)}</td>
                            <td className="px-4 py-3">
                              {e.pendingPayout > 0 ? (
                                <span className="font-semibold" style={{ color: "#b45309" }}>
                                  KES {e.pendingPayout.toFixed(0)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium" style={{ color: C.green }}>
                              {e.paidPayout > 0 ? `KES ${e.paidPayout.toFixed(0)}` : "—"}
                            </td>
                          </tr>
                          {expandedExperts.has(e.expertId) && (
                            <tr key={`exp-${e.expertId}`}>
                              <td colSpan={10} className="px-0 py-0">
                                <div className="px-6 py-5" style={{ backgroundColor: C.mint + "0E" }}>
                                  <div className="text-sm font-semibold mb-4" style={{ color: C.blue }}>
                                    {e.expertName} — Pending Payouts
                                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold"
                                      style={{ backgroundColor: C.mint + "33", color: "#0f5248" }}>
                                      {pendingBookings.length} booking{pendingBookings.length !== 1 ? "s" : ""}
                                    </span>
                                  </div>

                                  {pendingBookings.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">All payouts settled for this expert.</p>
                                  ) : (
                                    <>
                                      <div className="rounded-xl border overflow-hidden mb-5">
                                        <table className="w-full text-sm">
                                          <thead className="text-xs uppercase tracking-wide"
                                            style={{ backgroundColor: C.mint + "25", color: "#0f5248" }}>
                                            <tr>
                                              <th className="px-4 py-2.5 text-left">Booking #</th>
                                              <th className="px-4 py-2.5 text-left">Session Type</th>
                                              <th className="px-4 py-2.5 text-left">Client</th>
                                              <th className="px-4 py-2.5 text-left">Date</th>
                                              <th className="px-4 py-2.5 text-left">Gross Amount</th>
                                              <th className="px-4 py-2.5 text-left">Expert Earns</th>
                                              <th className="px-4 py-2.5" />
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y">
                                            {pendingBookings.map((b) => (
                                              <tr key={b.id} className="bg-white/40">
                                                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                                                  #{b.id}
                                                </td>
                                                <td className="px-4 py-2.5 capitalize">
                                                  {b.sessionType.replace(/_/g, " ")}
                                                </td>
                                                <td className="px-4 py-2.5">{b.clientName ?? "—"}</td>
                                                <td className="px-4 py-2.5 whitespace-nowrap">
                                                  {fmtDate(b.scheduledTime)}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                  KES {b.amount?.toLocaleString() ?? "—"}
                                                </td>
                                                <td className="px-4 py-2.5 font-semibold"
                                                  style={{ color: C.green }}>
                                                  KES {b.expertEarnings?.toFixed(0) ?? "—"}
                                                </td>
                                                <td className="px-4 py-2.5"
                                                  onClick={(ev) => ev.stopPropagation()}>
                                                  <Button size="sm" className="h-7 text-xs hover:opacity-90"
                                                    style={{ backgroundColor: C.green, color: "#1a5730" }}
                                                    onClick={() => handleMarkPaid(b.id)}
                                                    disabled={markPaid.isPending}>
                                                    Mark Paid
                                                  </Button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>

                                      {/* Mark all paid with date */}
                                      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border"
                                        style={{ backgroundColor: C.blue + "08", borderColor: C.blue + "30" }}
                                        onClick={(ev) => ev.stopPropagation()}>
                                        <div className="text-sm font-medium" style={{ color: C.blue }}>
                                          Mark all {pendingBookings.length} pending paid via M-Pesa:
                                        </div>
                                        <input type="date"
                                          value={expertPayDates[e.expertId] ?? ""}
                                          onChange={(ev) => setExpertPayDates((prev) => ({
                                            ...prev, [e.expertId]: ev.target.value,
                                          }))}
                                          className="h-9 px-3 rounded-lg border bg-card text-sm" />
                                        <span className="text-xs text-muted-foreground">(leave blank = today)</span>
                                        <Button
                                          style={{ backgroundColor: C.blue, color: "white" }}
                                          className="hover:opacity-90"
                                          onClick={() => handleMarkExpertPaid(e.expertId, pendingBookings.length)}
                                          disabled={markExpertPaidMut.isPending}>
                                          Mark All {pendingBookings.length} Paid
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── EXPERT MESSAGING ── */}
        <TabsContent value="messaging">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-card rounded-2xl border overflow-hidden">
              <div className="p-4 border-b" style={{ backgroundColor: C.mblue + "20" }}>
                <h3 className="font-semibold text-sm" style={{ color: C.mblue }}>Select Expert</h3>
              </div>
              <div className="divide-y">
                {breakdown?.map((e) => (
                  <button key={e.expertId} onClick={() => setSelectedExpertId(e.expertId)}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-muted/30 transition-colors"
                    style={selectedExpertId === e.expertId
                      ? { backgroundColor: C.blue + "15", fontWeight: 600 }
                      : {}}>
                    {e.expertName}
                    <div className="text-xs text-muted-foreground">{e.industry}</div>
                  </button>
                )) ?? (
                  <div className="p-4 text-sm text-muted-foreground">No approved experts yet.</div>
                )}
              </div>
            </div>

            <div className="md:col-span-2 bg-card rounded-2xl border flex flex-col overflow-hidden">
              {selectedExpertId === null ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center">
                  Select an expert to start a conversation.
                </div>
              ) : (
                <>
                  <div className="p-4 border-b" style={{ backgroundColor: C.mblue + "20" }}>
                    <h3 className="font-semibold" style={{ color: C.mblue }}>
                      Thread — {breakdown?.find((e) => e.expertId === selectedExpertId)?.expertName}
                    </h3>
                    <p className="text-xs text-muted-foreground">Admin-to-expert private channel</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px]">
                    {!adminMessages?.length ? (
                      <div className="text-center text-sm text-muted-foreground py-8">
                        No messages yet. Start the conversation.
                      </div>
                    ) : (
                      adminMessages.map((m) => (
                        <div key={m.id} className={`flex ${m.senderRole === "admin" ? "justify-end" : "justify-start"}`}>
                          <div className="max-w-[70%] rounded-2xl px-4 py-2.5 text-sm"
                            style={m.senderRole === "admin"
                              ? { backgroundColor: C.blue, color: "white" }
                              : { backgroundColor: "#f3f4f6" }}>
                            <div className="font-medium text-xs mb-0.5 opacity-70">{m.senderName}</div>
                            <p>{m.body}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-4 border-t flex gap-2">
                    <Input value={adminMsgBody} onChange={(e) => setAdminMsgBody(e.target.value)}
                      placeholder="Type a message..." className="flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleSendAdminMessage(selectedExpertId)} />
                    <Button style={{ backgroundColor: C.blue, color: "white" }} className="hover:opacity-90"
                      onClick={() => handleSendAdminMessage(selectedExpertId)}
                      disabled={sendAdminMsg.isPending || !adminMsgBody.trim()}>
                      Send
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── REVIEWS ── */}
        <TabsContent value="reviews">
          <div className="mb-4 p-4 bg-card rounded-xl border flex flex-wrap gap-4 items-center">
            <DateRangeFilter from={reviewDateFrom} to={reviewDateTo}
              onFromChange={setReviewDateFrom} onToChange={setReviewDateTo} label="Posted between" />
            <span className="text-sm text-muted-foreground ml-auto">
              {filteredReviews?.length ?? 0} review{filteredReviews?.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="bg-card rounded-2xl border overflow-hidden">
            {!filteredReviews?.length ? (
              <div className="p-12 text-center text-muted-foreground">No reviews found.</div>
            ) : (
              <div className="divide-y">
                {filteredReviews.map((review) => (
                  <div key={review.id} className="p-6 flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-semibold text-yellow-500">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                        <Badge variant="outline" className="text-xs"
                          style={review.reviewType === "verified"
                            ? { borderColor: C.green, color: C.green }
                            : {}}>
                          {review.reviewType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{fmtDate(review.createdAt)}</span>
                      </div>
                      <p className="text-foreground font-medium mb-1">"{review.body}"</p>
                      <p className="text-sm text-muted-foreground">
                        {review.reviewerName}
                        {review.businessName ? ` (${review.businessName})` : ""}
                        {" · Expert #"}{review.expertId}
                      </p>
                    </div>
                    <Button variant="destructive" size="sm" className="shrink-0"
                      onClick={() => handleDeleteReview(review.id)}
                      disabled={deleteReview.isPending}>
                      Delete
                    </Button>
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

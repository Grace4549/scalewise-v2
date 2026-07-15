import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout, useGetInbox, getGetMeQueryKey, getGetInboxQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LayoutDashboard, LogOut, MessageSquare } from "lucide-react";

const P = {
  blue:   "#6395EE",
  mblue:  "#90B8D6",
  mgreen: "#88CFA8",
  mint:   "#85DECB",
};

const NAV_LINKS = [
  { href: "/experts",  label: "Browse Experts", color: P.blue   },
  { href: "/about",    label: "About",           color: P.mblue  },
  { href: "/faq",      label: "FAQ",             color: P.mgreen },
  { href: "/contact",  label: "Contact",         color: P.mint   },
];

export function Navbar() {
  const { user, refetch } = useAuth();
  const logout            = useLogout();
  const queryClient       = useQueryClient();

  const [, navigate]      = useLocation();

  const showInbox = !!user && (user.role === "client" || user.role === "expert");
  const { data: inbox } = useGetInbox({ query: { queryKey: getGetInboxQueryKey(), enabled: showInbox } });
  const totalUnread = showInbox ? (inbox?.reduce((sum, t) => sum + (t.unreadCount ?? 0), 0) ?? 0) : 0;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        // Clear the entire cache so no authenticated data leaks to the next
        // user session (bookings, messages, dashboards, etc. are all keyed
        // by static route strings, not user identity).
        queryClient.clear();
        refetch();
        navigate("/");
      },
    });
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold sw-logo-breathe">ScaleWise</span>
          </Link>
          <div className="hidden md:flex gap-5 text-sm font-medium">
            {NAV_LINKS.map(({ href, label, color }) => (
              <Link
                key={href}
                href={href}
                className="transition-colors hover:opacity-80"
                style={{ color }}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (() => {
            const roleColor = user.role === "admin" ? P.blue : user.role === "expert" ? P.mgreen : P.mint;
            const roleDark  = user.role === "admin" ? "#1a3a7a" : user.role === "expert" ? "#1a5730" : "#0f5248";
            const initials  = user.name.split(" ").slice(0, 2).map((w: string) => w[0]).join("").toUpperCase();
            const dashHref  = user.role === "admin" ? "/admin" : user.role === "expert" ? "/expert/dashboard" : "/dashboard";
            const dashLabel = user.role === "admin" ? "Admin Console" : "My Dashboard";
            return (
              <div className="flex items-center gap-2">
                {(user.role === "client" || user.role === "expert") && (
                  <Link href={user.role === "expert" ? "/expert/dashboard" : "/dashboard"}>
                    <button className="relative p-2 rounded-lg hover:bg-muted/60 transition-colors" aria-label="Messages">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      {totalUnread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold flex items-center justify-center text-white px-0.5"
                          style={{ backgroundColor: "#ef4444" }}>
                          {totalUnread > 99 ? "99+" : totalUnread}
                        </span>
                      )}
                    </button>
                  </Link>
                )}
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 hover:bg-muted/60 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ backgroundColor: roleColor, color: roleDark }}>
                      {initials}
                    </span>
                    <span className="hidden md:flex flex-col items-start leading-none gap-0.5">
                      <span className="text-sm font-semibold max-w-[120px] truncate">{user.name}</span>
                      <span className="text-[11px] capitalize px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: roleColor + "28", color: roleColor === P.mint ? "#0f7a6a" : roleColor }}>
                        {user.role}
                      </span>
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-semibold truncate">{user.name}</p>
                    <p className="text-xs capitalize mt-0.5 font-medium"
                      style={{ color: roleColor === P.mint ? "#0f7a6a" : roleColor }}>{user.role}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={dashHref} className="flex items-center gap-2 cursor-pointer">
                      <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                      {dashLabel}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    disabled={logout.isPending}
                    className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" />
                    {logout.isPending ? "Logging out…" : "Logout"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            );
          })() : (
            <>
              {/* Login dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    Login <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 text-xs text-muted-foreground font-medium">Sign in as…</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/login" className="flex items-center gap-2 cursor-pointer">
                      <span className="text-base">🏢</span>
                      <div>
                        <div className="font-medium text-sm">Business Owner</div>
                        <div className="text-xs text-muted-foreground">Access your dashboard and sessions</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/login?role=expert" className="flex items-center gap-2 cursor-pointer">
                      <span className="text-base">💡</span>
                      <div>
                        <div className="font-medium text-sm">Expert</div>
                        <div className="text-xs text-muted-foreground">Access your expert dashboard</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sign Up dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-1">
                    Sign Up <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-3 py-2 text-xs text-muted-foreground font-medium">I want to…</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/register?role=client" className="flex items-center gap-2 cursor-pointer">
                      <span className="text-base">🏢</span>
                      <div>
                        <div className="font-medium text-sm">Sign up as a Business Owner</div>
                        <div className="text-xs text-muted-foreground">Book sessions with verified experts</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/apply-expert" className="flex items-center gap-2 cursor-pointer">
                      <span className="text-base">💡</span>
                      <div>
                        <div className="font-medium text-sm">Apply as an Expert</div>
                        <div className="text-xs text-muted-foreground">Submit your application for review — no account needed yet</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  const { user } = useAuth();
  const isExpert  = user?.role === "expert";

  return (
    <footer className="border-t bg-card text-card-foreground">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="text-xl font-bold" style={{ color: P.blue }}>ScaleWise</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The partner you have been missing — connecting business owners with people who have actually done it.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4" style={{ color: P.blue }}>Quick Links</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
              <li><Link href="/experts" className="hover:text-foreground transition-colors">Browse Experts</Link></li>
              <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link href="/apply-expert" className="hover:text-foreground transition-colors">Become an Expert</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4" style={{ color: P.mgreen }}>For Business Owners</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/experts" className="hover:text-foreground transition-colors">Find an Expert</Link></li>
              <li><Link href="/experts" className="hover:text-foreground transition-colors">Book a Session</Link></li>
              <li><Link href="/dashboard" className="hover:text-foreground transition-colors">Client Dashboard</Link></li>
            </ul>

            <h4 className="font-semibold mt-6 mb-4" style={{ color: P.mint }}>For Experts</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/apply-expert" className="hover:text-foreground transition-colors">Apply as a Founding Expert</Link></li>
              {isExpert
                ? <li><Link href="/expert/dashboard" className="hover:text-foreground transition-colors">Expert Dashboard</Link></li>
                : <>
                    <li><Link href="/login?role=expert" className="hover:text-foreground transition-colors">Expert Login</Link></li>
                  </>
              }
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4" style={{ color: P.mblue }}>Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-foreground transition-colors">Cancellation &amp; Refund Policy</Link></li>
            </ul>

            <h4 className="font-semibold mt-6 mb-4" style={{ color: P.mblue }}>Support</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
              <li><a href="mailto:hello@scalewise.co.ke?subject=Enquiry%20-%20ScaleWise" className="hover:text-foreground transition-colors">hello@scalewise.co.ke</a></li>
              <li><a href="tel:+254707346331" className="hover:text-foreground transition-colors">+254 707 346 331</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center gap-4">
          <p>Your business does not have to figure this out alone. Neither do you.</p>
          <p>© 2026 ScaleWise. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

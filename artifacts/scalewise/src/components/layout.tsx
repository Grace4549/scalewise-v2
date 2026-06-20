import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

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
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, { onSuccess: () => refetch() });
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: P.blue }}>ScaleWise</span>
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
          {user ? (
            <>
              <div className="hidden md:block text-sm text-muted-foreground">
                {user.name} ({user.role})
              </div>
              {user.role === "admin" && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm">Admin</Button>
                </Link>
              )}
              {user.role === "expert" && (
                <Link href="/expert/dashboard">
                  <Button variant="ghost" size="sm">Expert Dashboard</Button>
                </Link>
              )}
              {user.role === "client" && (
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">Dashboard</Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <>
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
                    <Link href="/login?role=client" className="flex items-center gap-2 cursor-pointer">
                      <span className="text-base">🏢</span>
                      <div>
                        <div className="font-medium text-sm">Business Owner</div>
                        <div className="text-xs text-muted-foreground">Looking for expert guidance</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/login?role=expert" className="flex items-center gap-2 cursor-pointer">
                      <span className="text-base">💡</span>
                      <div>
                        <div className="font-medium text-sm">Expert</div>
                        <div className="text-xs text-muted-foreground">Sharing expertise and coaching</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/login?role=admin" className="flex items-center gap-2 cursor-pointer text-muted-foreground">
                      <span className="text-base">🔐</span>
                      <div className="text-xs">Admin Login</div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link href="/register">
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
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
              <li><Link href="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
              <li><Link href="/experts" className="hover:text-foreground transition-colors">Book a Session</Link></li>
              <li><Link href="/dashboard/client" className="hover:text-foreground transition-colors">Client Dashboard</Link></li>
            </ul>

            <h4 className="font-semibold mt-6 mb-4" style={{ color: P.mint }}>For Experts</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/apply-expert" className="hover:text-foreground transition-colors">Apply as a Founding Expert</Link></li>
              <li><Link href="/dashboard/expert" className="hover:text-foreground transition-colors">Expert Dashboard</Link></li>
              <li><Link href="/faq" className="hover:text-foreground transition-colors">How Payouts Work</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4" style={{ color: P.mblue }}>Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
            </ul>

            <h4 className="font-semibold mt-6 mb-4" style={{ color: P.mblue }}>Support</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
              <li><a href="mailto:hello@scalewise.co.ke" className="hover:text-foreground transition-colors">hello@scalewise.co.ke</a></li>
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

import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLogout } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, refetch } = useAuth();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => refetch(),
    });
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">ScaleWise</span>
          </Link>
          <div className="hidden md:flex gap-4 text-sm font-medium">
            <Link href="/experts" className="text-muted-foreground hover:text-foreground transition-colors">Browse Experts</Link>
            <Link href="/about" className="text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link href="/faq" className="text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="hidden md:block text-sm text-muted-foreground">
                {user.name} ({user.role})
              </div>
              {user.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm">Admin</Button>
                </Link>
              )}
              {user.role === 'expert' && (
                <Link href="/expert/dashboard">
                  <Button variant="ghost" size="sm">Expert Dashboard</Button>
                </Link>
              )}
              {user.role === 'client' && (
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm">Dashboard</Button>
                </Link>
              )}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
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
              <span className="text-xl font-bold text-primary">ScaleWise</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The partner you've been missing — connecting business owners with people who have actually done it.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
              <li><Link href="/experts" className="hover:text-foreground transition-colors">Browse Experts</Link></li>
              <li><Link href="/about" className="hover:text-foreground transition-colors">About</Link></li>
              <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link href="/apply-expert" className="hover:text-foreground transition-colors">Become an Expert</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">For Business Owners</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/experts" className="hover:text-foreground transition-colors">Find an Expert</Link></li>
              <li><Link href="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
              <li><Link href="/experts" className="hover:text-foreground transition-colors">Leave a Review</Link></li>
            </ul>
            
            <h4 className="font-semibold mt-6 mb-4">For Experts</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/apply-expert" className="hover:text-foreground transition-colors">Apply as a Founding Expert</Link></li>
              <li><Link href="/apply-expert" className="hover:text-foreground transition-colors">Become an Expert</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
            </ul>
            
            <h4 className="font-semibold mt-6 mb-4">Support</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/contact" className="hover:text-foreground transition-colors">Contact Us</Link></li>
              <li><a href="mailto:hello@scalewise.co.ke" className="hover:text-foreground transition-colors">hello@scalewise.co.ke</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground flex flex-col md:flex-row justify-between items-center gap-4">
          <p>Your business doesn't have to figure this out alone. Neither do you.</p>
          <p>© 2026 ScaleWise. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

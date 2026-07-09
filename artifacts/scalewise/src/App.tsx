import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/providers/auth-provider";
import { Navbar, Footer } from "@/components/layout";
import { AnnouncementBanner } from "@/components/announcement-banner";

// Pages
import Home from "@/pages/home";
import About from "@/pages/about";
import FAQ from "@/pages/faq";
import Contact from "@/pages/contact";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";
import RefundPolicy from "@/pages/refund-policy";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import ForgotPassword from "@/pages/auth/forgot-password";
import ResetPassword from "@/pages/auth/reset-password";
import ApplyExpert from "@/pages/apply-expert";
import ExpertsList from "@/pages/experts/index";
import ExpertProfile from "@/pages/experts/[id]";
import ClientDashboard from "@/pages/dashboard/client";
import ExpertDashboard from "@/pages/dashboard/expert";
import AdminDashboard from "@/pages/dashboard/admin";
import Messages from "@/pages/messages";

function NotFound() {
  return (
    <div className="min-h-[50vh] w-full flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Page Not Found</h1>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <a href="/" className="mt-4 inline-block text-primary hover:underline">Go Home</a>
      </div>
    </div>
  );
}

/** Smoothly scrolls to #hash after every route change, or resets to top when there's no hash. */
function ScrollToHash() {
  const [location] = useLocation();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const id = hash.slice(1);
      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return true;
        }
        return false;
      };
      // Try immediately, then wait for the page to render
      if (!tryScroll()) {
        requestAnimationFrame(() => {
          if (!tryScroll()) {
            setTimeout(tryScroll, 250);
          }
        });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [location]);

  return null;
}

const queryClient = new QueryClient();

function Router() {
  return (
    <div className="flex flex-col min-h-screen">
      <ScrollToHash />
      <AnnouncementBanner />
      <Navbar />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={About} />
          <Route path="/faq" component={FAQ} />
          <Route path="/contact" component={Contact} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/refund-policy" component={RefundPolicy} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/apply-expert" component={ApplyExpert} />
          <Route path="/experts" component={ExpertsList} />
          <Route path="/experts/:id" component={ExpertProfile} />
          <Route path="/dashboard" component={ClientDashboard} />
          <Route path="/expert/dashboard" component={ExpertDashboard} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/messages/:bookingId" component={Messages} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

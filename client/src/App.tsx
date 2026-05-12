import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/lib/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Photos from "@/pages/photos";
import Messages from "@/pages/messages";
import Events from "@/pages/events";
import EventDetail from "@/pages/event-detail";
import Recommendations from "@/pages/recommendations";
import RecommendationDetail from "@/pages/recommendation-detail";
import RecommendationForm from "@/pages/recommendation-form";
import About from "@/pages/about";
import Rsvp from "@/pages/rsvp";
import Itinerary from "@/pages/itinerary";
import AuthPage from "@/pages/auth";
import Admin from "@/pages/admin";
import { UserMenu } from "@/components/user-menu";
import { Loader2 } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/photos" component={Photos} />
      <Route path="/messages" component={Messages} />
      <Route path="/events/:id" component={EventDetail} />
      <Route path="/events" component={Events} />
      <Route path="/recommendations/new" component={RecommendationForm} />
      <Route path="/recommendations/:id/edit" component={RecommendationForm} />
      <Route path="/recommendations/:id" component={RecommendationDetail} />
      <Route path="/recommendations" component={Recommendations} />
      <Route path="/rsvp" component={Rsvp} />
      <Route path="/itinerary" component={Itinerary} />
      <Route path="/about" component={About} />
      <Route path="/admin" component={Admin} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isLoading, user } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user && location !== "/auth") {
      navigate("/auth");
    }

    if (!isLoading && user && location === "/auth") {
      navigate("/");
    }
  }, [isLoading, user, location, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;

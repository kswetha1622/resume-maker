import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || !data.user.email_confirmed_at) {
      if (data.user) {
        await supabase.auth.signOut();
      }
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>(user?.email ?? "");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!session) navigate({ to: "/auth", replace: true });
      else setEmail(session.user.email ?? "");
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <nav className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/dashboard" className="text-xl font-bold tracking-tight">
            KINETIC<span className="text-primary">CV</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link
              to="/dashboard"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-primary sm:inline"
            >
              Dashboard
            </Link>
            <span className="hidden max-w-[180px] truncate text-xs text-muted-foreground md:inline">
              {email}
            </span>
            <button
              onClick={signOut}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>
      <Outlet />
    </div>
  );
}

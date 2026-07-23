import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster, toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPassword,
  head: () => ({
    meta: [
      { title: "Reset password · KineticCV" },
      { name: "description", content: "Set a new password for your KineticCV account." },
      { property: "og:title", content: "Reset password · KineticCV" },
      { property: "og:description", content: "Set a new password for your KineticCV account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    let active = true;
    const checkRecovery = async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const isRecoveryLink = hash.get("type") === "recovery";
      const { data } = await supabase.auth.getSession();
      if (active) setRecoveryReady(isRecoveryLink || Boolean(data.session));
    };
    void checkRecovery();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (active && event === "PASSWORD_RECOVERY") setRecoveryReady(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryReady)
      return toast.error(
        "Open the password reset link from your email before choosing a new password",
      );
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Redirecting…");
      setTimeout(() => navigate({ to: "/dashboard", replace: true }), 800);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Toaster richColors position="top-center" />
      <form
        onSubmit={submit}
        className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a strong password you haven't used before.
          </p>
        </div>
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              New password
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Confirm password
            </span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              required
            />
          </label>
        </div>
        {!recoveryReady && (
          <p role="alert" className="text-sm text-destructive">
            This reset link is missing or expired. Request a new one from the sign-in page.
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !recoveryReady}
          className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

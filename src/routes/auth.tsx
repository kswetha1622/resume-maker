import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster, toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in · KineticCV" },
      {
        name: "description",
        content: "Sign in or create an account to build and export your professional resume.",
      },
      { property: "og:title", content: "Sign in · KineticCV" },
      { property: "og:description", content: "Sign in or create an account to build your resume." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(6, "At least 6 characters").max(72);
const nameSchema = z.string().trim().min(2, "Enter your full name").max(100);

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);

  const resendVerification = async () => {
    const emailRes = emailSchema.safeParse(email);
    if (!emailRes.success) {
      toast.error("Please enter a valid email address first.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailRes.data,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success("Verification email resent — check your email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend verification email");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailRes = emailSchema.safeParse(email);
    if (!emailRes.success) return toast.error(emailRes.error.issues[0].message);

    setLoading(true);
    try {
      if (mode === "signup") {
        const pw = passwordSchema.safeParse(password);
        if (!pw.success) {
          toast.error(pw.error.issues[0].message);
          return;
        }
        const validName = nameSchema.safeParse(name);
        if (!validName.success) {
          toast.error(validName.error.issues[0].message);
          return;
        }
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: emailRes.data,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: validName.data },
          },
        });
        if (error) throw error;
        // Auth intentionally obscures whether an email already exists. An empty
        // identities list is the safe signal that this was a repeated signup.
        if (signUpData.user?.identities?.length === 0) {
          setMode("signin");
          throw new Error(
            "An account already exists for this email. Sign in with its password or use Forgot password.",
          );
        }
        if (signUpData.session) {
          toast.success("Account created — you're signed in.");
          await navigate({ to: "/dashboard", replace: true });
        } else {
          toast.success("Account created. Check your email to confirm it, then sign in.");
          setMode("signin");
        }
      } else if (mode === "signin") {
        const pw = passwordSchema.safeParse(password);
        if (!pw.success) {
          toast.error(pw.error.issues[0].message);
          return;
        }
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: emailRes.data,
          password: pw.data,
        });
        if (error) throw error;
        if (!signInData.session)
          throw new Error("Sign in did not create a session. Please try again.");

        if (signInData.user && !signInData.user.email_confirmed_at) {
          await supabase.auth.signOut();
          throw new Error("Please verify your email before logging in");
        }

        toast.success("Welcome back!");
        await navigate({ to: "/dashboard", replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(emailRes.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent — check your email.");
        setMode("signin");
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong";
      const isUnverified =
        raw.toLowerCase().includes("email not confirmed") ||
        raw.toLowerCase().includes("email not verified") ||
        raw.toLowerCase().includes("please verify your email");

      const msg = isUnverified
        ? "Please verify your email before logging in"
        : raw.toLowerCase().includes("invalid login credentials")
          ? "Email or password is incorrect. If you previously signed up with this email, use Forgot password to set a new password."
          : raw;

      if (isUnverified) {
        setShowResend(true);
      }
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        {/* Left brand panel */}
        <aside className="hidden flex-1 flex-col justify-between bg-slate-950 p-12 text-white lg:flex">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            KINETIC<span className="text-blue-400">CV</span>
          </Link>
          <div>
            <h1 className="font-serif text-5xl leading-tight tracking-tight">
              Build a resume that gets you interviews.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/70">
              Six curated templates for Professional, Engineering, Nursing, IT, Business, and
              Freshers. Live A4 preview, PDF &amp; PNG export, print-ready.
            </p>
          </div>
          <p className="text-xs text-white/50">© {new Date().getFullYear()} KineticCV</p>
        </aside>

        {/* Right form */}
        <main className="flex flex-1 items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            <Link to="/" className="mb-8 inline-block text-xl font-bold tracking-tight lg:hidden">
              KINETIC<span className="text-primary">CV</span>
            </Link>
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {mode === "signin" && "Sign in to your account"}
                {mode === "signup" && "Create your account"}
                {mode === "forgot" && "Reset your password"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "signin" && "Welcome back — let's finish that resume."}
                {mode === "signup" && "Free forever. No credit card required."}
                {mode === "forgot" && "We'll email you a secure link to reset it."}
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === "signup" && (
                <Field label="Full name">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alexander Sterling"
                    className={inputCls}
                    maxLength={100}
                  />
                </Field>
              )}
              <Field label="Email">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (showResend) setShowResend(false);
                  }}
                  placeholder="you@example.com"
                  className={inputCls}
                  autoComplete="email"
                />
              </Field>
              {mode !== "forgot" && (
                <Field label="Password">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className={inputCls}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </Field>
              )}

              {mode === "signin" && (
                <div className="flex items-center justify-between">
                  {showResend ? (
                    <button
                      type="button"
                      onClick={resendVerification}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Resend Verification Email
                    </button>
                  ) : (
                    <div />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setShowResend(false);
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {loading
                  ? "Please wait…"
                  : mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset link"}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              {mode === "signin" && (
                <>
                  Don't have an account?{" "}
                  <button
                    className="font-semibold text-primary hover:underline"
                    onClick={() => {
                      setMode("signup");
                      setShowResend(false);
                    }}
                  >
                    Sign up
                  </button>
                </>
              )}
              {mode === "signup" && (
                <>
                  Already have an account?{" "}
                  <button
                    className="font-semibold text-primary hover:underline"
                    onClick={() => {
                      setMode("signin");
                      setShowResend(false);
                    }}
                  >
                    Sign in
                  </button>
                </>
              )}
              {mode === "forgot" && (
                <button
                  className="font-semibold text-primary hover:underline"
                  onClick={() => {
                    setMode("signin");
                    setShowResend(false);
                  }}
                >
                  Back to sign in
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

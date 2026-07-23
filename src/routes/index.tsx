import { createFileRoute, Link } from "@tanstack/react-router";
import { TEMPLATES } from "@/lib/resume-types";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "KineticCV — Build a beautiful resume in minutes" },
      {
        name: "description",
        content:
          "Design, preview, and export professional resumes as high-quality PDF or PNG. Six curated templates for every career stage.",
      },
      { property: "og:title", content: "KineticCV — Build a beautiful resume in minutes" },
      {
        property: "og:description",
        content:
          "Design, preview, and export professional resumes as high-quality PDF or PNG. Six curated templates for every career stage.",
      },
    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <span className="text-xl font-bold tracking-tight">
            KINETIC<span className="text-primary">CV</span>
          </span>
          <div className="flex items-center gap-3">
            <Link
              to="/auth"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <section className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Resume Builder
          </p>
          <h1 className="font-serif text-4xl leading-tight tracking-tight text-foreground sm:text-6xl">
            A resume worth reading — <span className="italic text-primary">built in minutes.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Fill in a form, see your A4 preview update live, and export a print-ready PDF or PNG.
            Six templates crafted for Professional, Engineering, Nursing, IT, Business, and
            Freshers.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Build My Resume
            </Link>
            <Link
              to="/auth"
              className="rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition hover:bg-accent"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="mb-6 text-center text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Templates for every career
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {TEMPLATES.map((t) => (
              <div key={t.id} className="group cursor-default">
                <div className="relative mb-3 aspect-[3/4] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <div className="p-3">
                    <div
                      className="mb-2 h-1 w-full rounded-full"
                      style={{ background: t.accent }}
                    />
                    <div className="mb-3 h-1 w-2/3 rounded-full bg-muted" />
                    <div className="space-y-1">
                      <div className="h-0.5 w-full bg-muted" />
                      <div className="h-0.5 w-full bg-muted" />
                      <div className="h-0.5 w-4/5 bg-muted" />
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs font-semibold text-foreground">{t.name}</p>
                <p className="text-center text-[10px] text-muted-foreground">{t.tagline}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-16 border-t border-border bg-card py-8">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} KineticCV Builder
        </p>
      </footer>
    </div>
  );
}

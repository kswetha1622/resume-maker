import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TEMPLATES, type TemplateId, emptyResume, sampleResume } from "@/lib/resume-types";
import { toast } from "sonner";
import { Trash2, Pencil, FileText, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard · KineticCV" },
      { name: "description", content: "Your saved resumes and template picker." },
    ],
  }),
});

interface ResumeRow {
  id: string;
  title: string;
  template: string;
  updated_at: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("resumes")
      .select("id, title, template, updated_at")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    else setResumes(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createFromTemplate = async (template: TemplateId) => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    const { data, error } = await supabase
      .from("resumes")
      .insert({
        user_id: userRes.user.id,
        title: `${TEMPLATES.find((t) => t.id === template)?.name} Resume`,
        template,
        data: sampleResume() as unknown as never,
      })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    navigate({ to: "/builder/$id", params: { id: data.id } });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this resume? This can't be undone.")) return;
    const { error } = await supabase.from("resumes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Resume deleted");
    setResumes((r) => r.filter((x) => x.id !== id));
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your Resumes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Continue editing or start fresh from a template.
          </p>
        </div>
        <button
          onClick={() => setShowTemplates((v) => !v)}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 sm:self-auto"
        >
          <Plus className="size-4" />
          Build My Resume
        </button>
      </div>

      {showTemplates && (
        <section className="mb-10 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold">Choose a template</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Pick a starting point. You can preview and edit everything after.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => createFromTemplate(t.id)}
                className="group text-left"
              >
                <div className="relative mb-2 aspect-[3/4] overflow-hidden rounded-xl border border-border bg-background transition group-hover:ring-2 group-hover:ring-primary">
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
                      <div className="h-0.5 w-5/6 bg-muted" />
                    </div>
                  </div>
                  <div className="absolute inset-0 grid place-items-center bg-slate-950/70 opacity-0 transition group-hover:opacity-100">
                    <span className="text-xs font-bold uppercase tracking-widest text-white">
                      Use {t.name}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">{t.name}</p>
                <p className="text-[11px] text-muted-foreground">{t.tagline}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : resumes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <FileText className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="mb-1 font-semibold">No resumes yet</p>
            <p className="mb-4 text-sm text-muted-foreground">
              Click "Build My Resume" above to start from a template.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((r) => {
              const tpl = TEMPLATES.find((t) => t.id === r.template);
              return (
                <div
                  key={r.id}
                  className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-foreground">{r.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {tpl?.name ?? r.template} · Updated{" "}
                        {new Date(r.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ background: tpl?.accent }}
                    />
                  </div>
                  <div className="mt-auto flex gap-2">
                    <Link
                      to="/builder/$id"
                      params={{ id: r.id }}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
                    >
                      <Pencil className="size-3.5" /> Edit
                    </Link>
                    <button
                      onClick={() => remove(r.id)}
                      className="rounded-md border border-border bg-card p-2 text-muted-foreground transition hover:bg-destructive hover:text-destructive-foreground"
                      aria-label="Delete resume"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

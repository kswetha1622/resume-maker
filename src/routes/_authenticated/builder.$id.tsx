import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { emptyResume, uid, TEMPLATES, type ResumeData, type TemplateId } from "@/lib/resume-types";
import { ResumePreview } from "@/components/resume/ResumePreview";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileImage,
  Printer,
  Save,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { generateResumeContent } from "@/lib/ai-resume.functions";
import { uid as makeId } from "@/lib/resume-types";

const safeFilename = (value: string) =>
  // eslint-disable-next-line no-control-regex
  (value.trim() || "resume").replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-").slice(0, 100);

export const Route = createFileRoute("/_authenticated/builder/$id")({
  component: Builder,
  head: () => ({
    meta: [
      { title: "Resume Builder · KineticCV" },
      {
        name: "description",
        content: "Edit your resume with a live A4 preview and export as PDF or PNG.",
      },
    ],
  }),
});

function Builder() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("Untitled Resume");
  const [template, setTemplate] = useState<TemplateId>("professional");
  const [data, setData] = useState<ResumeData>(emptyResume());
  const [aiLoading, setAiLoading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const callGenerate = useServerFn(generateResumeContent);

  const autoFillWithAI = async () => {
    setAiLoading(true);
    toast.loading("AI is drafting your resume…", { id: "ai" });
    try {
      const result = await callGenerate({
        data: { template, jobTitle: data.jobTitle, fullName: data.fullName },
      });
      const ai = JSON.parse(result.json) as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === "string" ? v : "");
      const arrStr = (v: unknown): string[] =>
        Array.isArray(v)
          ? v.map((x) => (typeof x === "string" ? x : String(x ?? ""))).filter(Boolean)
          : [];
      const arrObj = <T,>(v: unknown, map: (o: Record<string, unknown>) => T): T[] =>
        Array.isArray(v) ? v.map((o) => map((o ?? {}) as Record<string, unknown>)) : [];

      setData((prev) => ({
        ...prev,
        fullName: str(ai.fullName) || prev.fullName,
        jobTitle: str(ai.jobTitle) || prev.jobTitle,
        email: str(ai.email) || prev.email,
        phone: str(ai.phone) || prev.phone,
        location: str(ai.location) || prev.location,
        linkedin: str(ai.linkedin) || prev.linkedin,
        github: str(ai.github) || prev.github,
        portfolio: str(ai.portfolio) || prev.portfolio,
        objective: str(ai.objective) || prev.objective,
        summary: str(ai.summary) || prev.summary,
        education: arrObj(ai.education, (o) => ({
          id: makeId(),
          school: str(o.school),
          degree: str(o.degree),
          period: str(o.period),
          details: str(o.details),
        })),
        skills: arrStr(ai.skills),
        experience: arrObj(ai.experience, (o) => {
          let bullets = "";
          if (Array.isArray(o.bullets)) {
            bullets = o.bullets.map(String).join("\n");
          } else if (typeof o.bullets === "string") {
            bullets = o.bullets;
          } else if (o.bullets) {
            bullets = String(o.bullets);
          }
          return {
            id: makeId(),
            company: str(o.company),
            role: str(o.role),
            period: str(o.period),
            bullets: bullets,
          };
        }),
        projects: arrObj(ai.projects, (o) => ({
          id: makeId(),
          name: str(o.name),
          link: str(o.link),
          description: str(o.description),
        })),
        certifications: arrStr(ai.certifications).map((text) => ({ id: makeId(), text })),
        achievements: arrStr(ai.achievements).map((text) => ({ id: makeId(), text })),
        languages: arrStr(ai.languages).map((text) => ({ id: makeId(), text })),
        interests: arrStr(ai.interests).map((text) => ({ id: makeId(), text })),
        references: arrObj(ai.references, (o) => ({
          id: makeId(),
          name: str(o.name),
          detail: str(o.detail),
        })),
      }));
      toast.success("Resume filled with AI content", { id: "ai" });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "AI generation failed";
      toast.error(errorMsg, {
        id: "ai",
        action: {
          label: "Retry",
          onClick: () => autoFillWithAI(),
        },
      });
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: row, error } = await supabase
        .from("resumes")
        .select("title, template, data")
        .eq("id", id)
        .single();
      if (error || !row) {
        toast.error("Resume not found");
        navigate({ to: "/dashboard" });
        return;
      }
      setTitle(row.title);
      setTemplate((row.template as TemplateId) ?? "professional");
      setData({ ...emptyResume(), ...(row.data as Partial<ResumeData>) });
      setLoading(false);
    })();
  }, [id, navigate]);

  const update = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("resumes")
      .update({ title, template, data: data as unknown as never })
      .eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Resume saved");
  };

  const removeResume = async () => {
    if (!confirm("Delete this resume?")) return;
    const { error } = await supabase.from("resumes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/dashboard" });
  };

  // A4 at 96dpi = 794 × 1123 CSS px
  const A4_PX = { width: 794, height: 1123 };

  const renderPngDataUrl = async (): Promise<string> => {
    const el = document.getElementById("resume-print") as HTMLElement | null;
    if (!el) throw new Error("Preview not found");
    const { toPng } = await import("html-to-image");
    // html-to-image renders at natural element size; preview transform on
    // wrapper does not affect the captured node. Force explicit A4 pixels.
    return toPng(el, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: "#ffffff",
      width: A4_PX.width,
      height: A4_PX.height,
      canvasWidth: A4_PX.width,
      canvasHeight: A4_PX.height,
      style: {
        transform: "none",
        margin: "0",
        width: `${A4_PX.width}px`,
        height: `${A4_PX.height}px`,
      },
      filter: (node) => {
        // Skip <script> / <style> that could break serialization.
        const tag = (node as HTMLElement).tagName;
        return tag !== "SCRIPT";
      },
    });
  };

  const exportPdf = async () => {
    toast.loading("Generating PDF…", { id: "pdf" });
    try {
      const [dataUrl, jspdfMod] = await Promise.all([renderPngDataUrl(), import("jspdf")]);
      const pdf = new jspdfMod.jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
        compress: true,
      });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      pdf.addImage(dataUrl, "PNG", 0, 0, pageW, pageH, undefined, "FAST");
      pdf.save(`${safeFilename(title)}.pdf`);
      toast.success("PDF ready", { id: "pdf" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF export failed", { id: "pdf" });
      console.error(e);
    }
  };

  const exportPng = async () => {
    toast.loading("Generating PNG…", { id: "png" });
    try {
      const dataUrl = await renderPngDataUrl();
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${safeFilename(title)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("PNG ready", { id: "png" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PNG export failed", { id: "png" });
      console.error(e);
    }
  };

  const printResume = () => window.print();

  const onPhoto = (file: File | null) => {
    if (!file) return;
    if (file.size > 3_000_000) return toast.error("Photo must be under 3MB");
    const reader = new FileReader();
    reader.onload = () => update("photo", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const previewScale = usePreviewScale(previewRef);

  if (loading) {
    return <div className="p-12 text-center text-sm text-muted-foreground">Loading resume…</div>;
  }

  return (
    <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="rounded-md border border-border bg-card p-2 text-muted-foreground transition hover:bg-accent"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-lg font-bold tracking-tight outline-none transition hover:border-border focus:border-primary focus:bg-card"
            maxLength={100}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={autoFillWithAI}
            disabled={aiLoading}
            className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {aiLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {aiLoading ? "Drafting Resume…" : "Auto Fill with AI"}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            <Save className="size-3.5" /> {saving ? "Saving…" : "Save"}
          </button>
          <details className="group relative">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90">
              <Download className="size-3.5" /> Download Resume{" "}
              <ChevronDown className="size-3.5 transition group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 z-30 mt-2 grid min-w-44 overflow-hidden rounded-md border border-border bg-card p-1 shadow-lg">
              <button
                onClick={exportPdf}
                className="flex items-center gap-2 rounded px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-accent"
              >
                <Download className="size-3.5" /> High-quality PDF
              </button>
              <button
                onClick={exportPng}
                className="flex items-center gap-2 rounded px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-accent"
              >
                <FileImage className="size-3.5" /> High-quality PNG
              </button>
            </div>
          </details>
          <button
            onClick={printResume}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-accent"
          >
            <Printer className="size-3.5" /> Print
          </button>
          <button
            onClick={removeResume}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 print:block">
        {/* Form */}
        <div className="space-y-6 print:hidden">
          {/* Template */}
          <Card title="Template">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`rounded-lg border p-2 text-[11px] font-semibold transition ${
                    template === t.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </Card>

          {/* Personal */}
          <Card title="Personal Details">
            <div className="flex items-center gap-4">
              <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted">
                {data.photo ? (
                  <img src={data.photo} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Photo
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
                  className="block text-xs file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
                />
                {data.photo && (
                  <button
                    onClick={() => update("photo", "")}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Text
                label="Full Name"
                value={data.fullName}
                onChange={(v) => update("fullName", v)}
              />
              <Text
                label="Job Title"
                value={data.jobTitle}
                onChange={(v) => update("jobTitle", v)}
              />
              <Text label="Email" value={data.email} onChange={(v) => update("email", v)} />
              <Text label="Phone" value={data.phone} onChange={(v) => update("phone", v)} />
              <Text
                label="Location"
                value={data.location}
                onChange={(v) => update("location", v)}
              />
              <Text
                label="LinkedIn"
                value={data.linkedin}
                onChange={(v) => update("linkedin", v)}
              />
              <Text label="GitHub" value={data.github} onChange={(v) => update("github", v)} />
              <Text
                label="Portfolio"
                value={data.portfolio}
                onChange={(v) => update("portfolio", v)}
              />
            </div>
          </Card>

          <Card title="Career Objective">
            <TextArea
              value={data.objective}
              onChange={(v) => update("objective", v)}
              rows={3}
              placeholder="One-sentence goal aligned with the role you're applying for."
            />
          </Card>

          <Card title="Professional Summary">
            <TextArea
              value={data.summary}
              onChange={(v) => update("summary", v)}
              rows={4}
              placeholder="2–4 sentences summarizing your background, strengths, and impact."
            />
          </Card>

          {/* Education */}
          <ListCard
            title="Education"
            onAdd={() =>
              update("education", [
                ...data.education,
                { id: uid(), school: "", degree: "", period: "", details: "" },
              ])
            }
          >
            {data.education.map((e, i) => (
              <ItemRow
                key={e.id}
                onDelete={() =>
                  update(
                    "education",
                    data.education.filter((x) => x.id !== e.id),
                  )
                }
              >
                <Text
                  label="School"
                  value={e.school}
                  onChange={(v) =>
                    update(
                      "education",
                      data.education.map((x, j) => (j === i ? { ...x, school: v } : x)),
                    )
                  }
                />
                <Text
                  label="Degree"
                  value={e.degree}
                  onChange={(v) =>
                    update(
                      "education",
                      data.education.map((x, j) => (j === i ? { ...x, degree: v } : x)),
                    )
                  }
                />
                <Text
                  label="Period"
                  value={e.period}
                  onChange={(v) =>
                    update(
                      "education",
                      data.education.map((x, j) => (j === i ? { ...x, period: v } : x)),
                    )
                  }
                />
                <Text
                  label="Details"
                  value={e.details ?? ""}
                  onChange={(v) =>
                    update(
                      "education",
                      data.education.map((x, j) => (j === i ? { ...x, details: v } : x)),
                    )
                  }
                />
              </ItemRow>
            ))}
          </ListCard>

          {/* Skills */}
          <Card title="Skills">
            <SkillsInput skills={data.skills} onChange={(s) => update("skills", s)} />
          </Card>

          {/* Experience */}
          <ListCard
            title="Experience"
            onAdd={() =>
              update("experience", [
                ...data.experience,
                { id: uid(), company: "", role: "", period: "", bullets: "" },
              ])
            }
          >
            {data.experience.map((e, i) => (
              <ItemRow
                key={e.id}
                onDelete={() =>
                  update(
                    "experience",
                    data.experience.filter((x) => x.id !== e.id),
                  )
                }
              >
                <Text
                  label="Company"
                  value={e.company}
                  onChange={(v) =>
                    update(
                      "experience",
                      data.experience.map((x, j) => (j === i ? { ...x, company: v } : x)),
                    )
                  }
                />
                <Text
                  label="Role"
                  value={e.role}
                  onChange={(v) =>
                    update(
                      "experience",
                      data.experience.map((x, j) => (j === i ? { ...x, role: v } : x)),
                    )
                  }
                />
                <Text
                  label="Period"
                  value={e.period}
                  onChange={(v) =>
                    update(
                      "experience",
                      data.experience.map((x, j) => (j === i ? { ...x, period: v } : x)),
                    )
                  }
                />
                <TextArea
                  label="Bullets (one per line)"
                  value={e.bullets}
                  rows={3}
                  onChange={(v) =>
                    update(
                      "experience",
                      data.experience.map((x, j) => (j === i ? { ...x, bullets: v } : x)),
                    )
                  }
                  full
                />
              </ItemRow>
            ))}
          </ListCard>

          {/* Projects */}
          <ListCard
            title="Projects"
            onAdd={() =>
              update("projects", [
                ...data.projects,
                { id: uid(), name: "", link: "", description: "" },
              ])
            }
          >
            {data.projects.map((p, i) => (
              <ItemRow
                key={p.id}
                onDelete={() =>
                  update(
                    "projects",
                    data.projects.filter((x) => x.id !== p.id),
                  )
                }
              >
                <Text
                  label="Name"
                  value={p.name}
                  onChange={(v) =>
                    update(
                      "projects",
                      data.projects.map((x, j) => (j === i ? { ...x, name: v } : x)),
                    )
                  }
                />
                <Text
                  label="Link"
                  value={p.link ?? ""}
                  onChange={(v) =>
                    update(
                      "projects",
                      data.projects.map((x, j) => (j === i ? { ...x, link: v } : x)),
                    )
                  }
                />
                <TextArea
                  label="Description"
                  value={p.description}
                  rows={2}
                  onChange={(v) =>
                    update(
                      "projects",
                      data.projects.map((x, j) => (j === i ? { ...x, description: v } : x)),
                    )
                  }
                  full
                />
              </ItemRow>
            ))}
          </ListCard>

          {/* Simple lists */}
          <NamedList
            title="Certifications"
            items={data.certifications}
            onChange={(v) => update("certifications", v)}
          />
          <NamedList
            title="Achievements"
            items={data.achievements}
            onChange={(v) => update("achievements", v)}
          />
          <NamedList
            title="Languages"
            items={data.languages}
            onChange={(v) => update("languages", v)}
          />
          <NamedList
            title="Interests"
            items={data.interests}
            onChange={(v) => update("interests", v)}
          />

          {/* References */}
          <ListCard
            title="References"
            onAdd={() =>
              update("references", [...data.references, { id: uid(), name: "", detail: "" }])
            }
          >
            {data.references.map((r, i) => (
              <ItemRow
                key={r.id}
                onDelete={() =>
                  update(
                    "references",
                    data.references.filter((x) => x.id !== r.id),
                  )
                }
              >
                <Text
                  label="Name"
                  value={r.name}
                  onChange={(v) =>
                    update(
                      "references",
                      data.references.map((x, j) => (j === i ? { ...x, name: v } : x)),
                    )
                  }
                />
                <Text
                  label="Detail (role, contact)"
                  value={r.detail}
                  onChange={(v) =>
                    update(
                      "references",
                      data.references.map((x, j) => (j === i ? { ...x, detail: v } : x)),
                    )
                  }
                />
              </ItemRow>
            ))}
          </ListCard>
        </div>

        {/* Preview */}
        <div className="lg:sticky lg:top-24 lg:h-fit">
          <div className="mb-3 flex items-center justify-between print:hidden">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Live Preview (A4)
            </span>
          </div>
          <div
            ref={previewRef}
            className="overflow-hidden rounded-xl bg-slate-200/40 p-4"
            style={{ minHeight: 300 }}
          >
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
                width: "210mm",
                height: `calc(297mm * ${previewScale})`,
              }}
            >
              <ResumePreview data={data} template={template} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ============ helpers ============ */

function usePreviewScale(ref: React.RefObject<HTMLDivElement | null>) {
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    const compute = () => {
      const el = ref.current;
      if (!el) return;
      const width = el.clientWidth - 32; // padding
      // 210mm ≈ 793.7px
      const s = Math.min(1, width / 793.7);
      setScale(s);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [ref]);
  return scale;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ListCard({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </h3>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary transition hover:bg-primary/20"
        >
          <Plus className="size-3" /> Add
        </button>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ItemRow({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  return (
    <div className="relative grid grid-cols-1 gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
      {children}
      <button
        onClick={onDelete}
        className="absolute right-2 top-2 rounded p-1 text-muted-foreground transition hover:text-destructive"
        aria-label="Remove"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function Text({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        maxLength={300}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  full,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <label className={`block space-y-1 ${full ? "sm:col-span-2" : ""}`}>
      {label && (
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        maxLength={2000}
      />
    </label>
  );
}

function SkillsInput({ skills, onChange }: { skills: string[]; onChange: (s: string[]) => void }) {
  const [text, setText] = useState("");
  const add = () => {
    const v = text.trim();
    if (!v) return;
    onChange([...skills, v]);
    setText("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {skills.map((s, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground"
          >
            {s}
            <button
              onClick={() => onChange(skills.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Type a skill and press Enter"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          onClick={add}
          className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function NamedList({
  title,
  items,
  onChange,
}: {
  title: string;
  items: { id: string; text: string }[];
  onChange: (v: { id: string; text: string }[]) => void;
}) {
  return (
    <ListCard title={title} onAdd={() => onChange([...items, { id: uid(), text: "" }])}>
      {items.map((it, i) => (
        <div key={it.id} className="flex gap-2">
          <input
            value={it.text}
            onChange={(e) =>
              onChange(items.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))
            }
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            maxLength={200}
          />
          <button
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            className="rounded-md border border-border bg-card p-2 text-muted-foreground transition hover:text-destructive"
            aria-label="Remove"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      ))}
    </ListCard>
  );
}

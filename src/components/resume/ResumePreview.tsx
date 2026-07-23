import type { ResumeData, TemplateId } from "@/lib/resume-types";

interface Props {
  data: ResumeData;
  template: TemplateId;
}

const ACCENTS: Record<TemplateId, string> = {
  professional: "#2563eb",
  engineering: "#0f766e",
  nursing: "#e11d48",
  it: "#0ea5e9",
  business: "#0f172a",
  freshers: "#7c3aed",
};

export function ResumePreview({ data, template }: Props) {
  const accent = ACCENTS[template];
  const contact = [data.location, data.email, data.phone].filter(Boolean);
  const links = [
    data.linkedin && { label: "LinkedIn", value: data.linkedin },
    data.github && { label: "GitHub", value: data.github },
    data.portfolio && { label: "Portfolio", value: data.portfolio },
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const isTwoCol = template !== "business";
  const useSerif = template === "professional" || template === "business";

  return (
    <div
      id="resume-print"
      className="a4-page mx-auto"
      style={{
        fontFamily: useSerif ? "'Source Serif 4', Georgia, serif" : "'Inter', sans-serif",
      }}
    >
      <div className="flex h-full flex-col p-12" style={{ minHeight: "297mm" }}>
        {/* Header */}
        <header className="mb-8 border-b-2 pb-6" style={{ borderColor: accent }}>
          <div className="flex items-start gap-6">
            {data.photo && (
              <img
                src={data.photo}
                alt=""
                className="size-24 rounded-lg object-cover"
                style={{ border: `2px solid ${accent}` }}
              />
            )}
            <div className="min-w-0 flex-1">
              <h1
                className="text-4xl font-bold leading-tight tracking-tight"
                style={{ color: template === "business" ? "#0f172a" : accent }}
              >
                {data.fullName || "Your Name"}
              </h1>
              {data.jobTitle && (
                <p
                  className="mt-1 text-lg italic text-slate-600"
                  style={{ fontFamily: "'Source Serif 4', serif" }}
                >
                  {data.jobTitle}
                </p>
              )}
              {contact.length > 0 && (
                <p
                  className="mt-3 text-[11px] font-medium uppercase tracking-widest text-slate-500"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {contact.join(" · ")}
                </p>
              )}
              {links.length > 0 && (
                <p
                  className="mt-1 text-[11px] font-medium text-slate-500"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {links.map((l) => `${l.label}: ${l.value}`).join(" · ")}
                </p>
              )}
            </div>
          </div>
        </header>

        {isTwoCol ? (
          <div className="grid flex-1 grid-cols-3 gap-10">
            <aside className="col-span-1 space-y-6">
              {data.skills.length > 0 && (
                <Section title="Core Skills" accent={accent}>
                  <ul className="space-y-1 text-sm leading-relaxed text-slate-700">
                    {data.skills.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </Section>
              )}
              {data.languages.length > 0 && (
                <Section title="Languages" accent={accent}>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {data.languages.map((l) => (
                      <li key={l.id}>{l.text}</li>
                    ))}
                  </ul>
                </Section>
              )}
              {data.certifications.length > 0 && (
                <Section title="Certifications" accent={accent}>
                  <ul className="space-y-1 text-sm text-slate-700">
                    {data.certifications.map((c) => (
                      <li key={c.id}>{c.text}</li>
                    ))}
                  </ul>
                </Section>
              )}
              {data.interests.length > 0 && (
                <Section title="Interests" accent={accent}>
                  <p className="text-sm text-slate-700">
                    {data.interests.map((i) => i.text).join(", ")}
                  </p>
                </Section>
              )}
            </aside>
            <main className="col-span-2 space-y-6">
              {data.objective && (
                <Section title="Career Objective" accent={accent}>
                  <p className="text-sm leading-relaxed text-slate-700">{data.objective}</p>
                </Section>
              )}
              {data.summary && (
                <Section title="Professional Summary" accent={accent}>
                  <p className="text-sm leading-relaxed text-slate-700">{data.summary}</p>
                </Section>
              )}
              {data.experience.length > 0 && (
                <Section title="Experience" accent={accent}>
                  <div className="space-y-4">
                    {data.experience.map((e) => (
                      <div key={e.id}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                          <p className="font-bold text-slate-900">{e.company}</p>
                          <p className="text-xs text-slate-500">{e.period}</p>
                        </div>
                        <p className="text-sm italic text-slate-600">{e.role}</p>
                        {e.bullets && (
                          <ul className="mt-1 list-disc pl-5 text-xs leading-relaxed text-slate-700">
                            {e.bullets
                              .split("\n")
                              .filter(Boolean)
                              .map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              {data.education.length > 0 && (
                <Section title="Education" accent={accent}>
                  <div className="space-y-3">
                    {data.education.map((ed) => (
                      <div key={ed.id}>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                          <p className="font-bold text-slate-900">{ed.school}</p>
                          <p className="text-xs text-slate-500">{ed.period}</p>
                        </div>
                        <p className="text-sm italic text-slate-600">{ed.degree}</p>
                        {ed.details && (
                          <p className="mt-0.5 text-xs text-slate-700">{ed.details}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              {data.projects.length > 0 && (
                <Section title="Projects" accent={accent}>
                  <div className="space-y-2">
                    {data.projects.map((p) => (
                      <div key={p.id}>
                        <p className="text-sm font-bold text-slate-900">
                          {p.name}
                          {p.link && (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              ({p.link})
                            </span>
                          )}
                        </p>
                        {p.description && (
                          <p className="text-xs leading-relaxed text-slate-700">{p.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}
              {data.achievements.length > 0 && (
                <Section title="Achievements" accent={accent}>
                  <ul className="list-disc pl-5 text-xs leading-relaxed text-slate-700">
                    {data.achievements.map((a) => (
                      <li key={a.id}>{a.text}</li>
                    ))}
                  </ul>
                </Section>
              )}
              {data.references.length > 0 && (
                <Section title="References" accent={accent}>
                  <div className="grid grid-cols-2 gap-3">
                    {data.references.map((r) => (
                      <div key={r.id}>
                        <p className="text-sm font-bold text-slate-900">{r.name}</p>
                        <p className="text-xs text-slate-600">{r.detail}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </main>
          </div>
        ) : (
          <div className="flex-1 space-y-6">
            {data.summary && (
              <Section title="Executive Summary" accent={accent}>
                <p className="text-sm leading-relaxed text-slate-700">{data.summary}</p>
              </Section>
            )}
            {data.experience.length > 0 && (
              <Section title="Professional Experience" accent={accent}>
                <div className="space-y-4">
                  {data.experience.map((e) => (
                    <div key={e.id}>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                        <p className="font-bold text-slate-900">
                          {e.company} — {e.role}
                        </p>
                        <p className="text-xs text-slate-500">{e.period}</p>
                      </div>
                      {e.bullets && (
                        <ul className="mt-1 list-disc pl-5 text-xs leading-relaxed text-slate-700">
                          {e.bullets
                            .split("\n")
                            .filter(Boolean)
                            .map((b, i) => (
                              <li key={i}>{b}</li>
                            ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {data.education.length > 0 && (
              <Section title="Education" accent={accent}>
                <div className="space-y-2">
                  {data.education.map((ed) => (
                    <div
                      key={ed.id}
                      className="flex flex-wrap items-baseline justify-between gap-x-2"
                    >
                      <p className="text-sm">
                        <span className="font-bold">{ed.school}</span> — {ed.degree}
                      </p>
                      <p className="text-xs text-slate-500">{ed.period}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {data.skills.length > 0 && (
              <Section title="Skills" accent={accent}>
                <p className="text-sm text-slate-700">{data.skills.join(" · ")}</p>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3
        className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em]"
        style={{ color: accent, fontFamily: "'Inter', sans-serif" }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

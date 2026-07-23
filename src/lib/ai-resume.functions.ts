import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TEMPLATE_CONTEXT: Record<string, string> = {
  professional: "an experienced professional (mid-senior corporate)",
  engineering: "a mechanical/civil/electrical engineer",
  nursing: "a registered nurse in a hospital setting",
  it: "a software engineer / IT professional",
  business: "a business analyst / manager",
  freshers: "a recent college graduate (entry-level candidate)",
};

const Input = z.object({
  template: z.string().min(1),
  jobTitle: z.string().optional().default(""),
  fullName: z.string().optional().default(""),
});

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 3,
  delay = 1000,
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, init);
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 429)) {
        return res;
      }
      if (i === retries - 1) return res;
      console.warn(
        `Fetch returned status ${res.status}. Retrying ${i + 1}/${retries} in ${delay}ms...`,
      );
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`Fetch threw error: ${err}. Retrying ${i + 1}/${retries} in ${delay}ms...`);
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay *= 2;
  }
  return fetch(url, init);
}

function getMockResumeContent(template: string, jobTitle: string, fullName: string) {
  const name = fullName.trim() || "Alexander Sterling";
  const title =
    jobTitle.trim() ||
    (template === "engineering"
      ? "Software Engineer"
      : template === "nursing"
        ? "Registered Nurse"
        : template === "it"
          ? "IT Systems Administrator"
          : template === "business"
            ? "Business Analyst"
            : template === "freshers"
              ? "Graduate Assistant"
              : "Professional Candidate");
  const email = `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`;

  const data = {
    fullName: name,
    jobTitle: title,
    email: email,
    phone: "+1 (555) 019-2834",
    location: "San Francisco, CA",
    linkedin: `linkedin.com/in/${name.toLowerCase().replace(/\s+/g, "-")}`,
    github: `github.com/${name.toLowerCase().replace(/\s+/g, "")}`,
    portfolio: `${name.toLowerCase().replace(/\s+/g, "")}.dev`,
    objective: `Ambitious and results-driven ${title.toLowerCase()} seeking to leverage expertise and proven track record to contribute to organization success.`,
    summary: `Dedicated and highly skilled ${title} with over 5 years of experience. Proven track record of managing projects, collaborating with cross-functional teams, and implementing innovative solutions to drive efficiency and growth. Strong communicator with exceptional problem-solving abilities.`,
    education: [
      {
        school: "State University",
        degree: "Bachelor of Science in Computer Science",
        period: "2018 - 2022",
        details: "Graduated with Honors, GPA: 3.8/4.0. Active member of the computer science club.",
      },
    ],
    skills: [
      "Project Management",
      "Team Leadership",
      "Problem Solving",
      "Strategic Planning",
      "Communication",
      "Data Analysis",
      "Agile Methodology",
      "Process Improvement",
    ],
    experience: [
      {
        company: "InnovateTech Solutions",
        role: `Senior ${title}`,
        period: "2022 - Present",
        bullets:
          "Led a cross-functional team of 8 professionals to deliver key software products ahead of schedule.\nOptimized operations resulting in a 15% reduction in project delivery lifecycle.\nDesigned and implemented new internal tools that improved team productivity by 20%.",
      },
      {
        company: "Apex Global Corp",
        role: title,
        period: "2020 - 2022",
        bullets:
          "Collaborated with stakeholders to define project requirements and specifications.\nManaged development and testing of robust solutions handling high-throughput operations.\nResolved critical production bugs reducing system downtime by 35%.",
      },
    ],
    projects: [
      {
        name: "Enterprise Workflow Optimizer",
        link: "github.com/project/optimizer",
        description:
          "A secure web portal developed using React and Node.js that automates internal approvals and workflows, saving 10 hours per employee weekly.",
      },
      {
        name: "Data Analytics Dashboard",
        link: "github.com/project/analytics",
        description:
          "Real-time interactive dashboard visualizing operational metrics, providing executives with data-driven insights to make strategic decisions.",
      },
    ],
    certifications: [
      `Certified ${title} Professional`,
      "Project Management Professional (PMP)",
      "Agile Certified Practitioner (PMI-ACP)",
    ],
    achievements: [
      "Recipient of the Employee of the Year Award at InnovateTech Solutions (2024).",
      "Successfully scaled system infrastructure to support 100k+ daily active users.",
    ],
    languages: ["English (Native)", "Spanish (Conversational)"],
    interests: [
      "Artificial Intelligence",
      "Open Source Contribution",
      "Hiking & Outdoor Activities",
      "Photography",
    ],
    references: [
      {
        name: "Sarah Jenkins",
        detail: "Director of Engineering, InnovateTech Solutions (s.jenkins@innovatetech.com)",
      },
    ],
  };

  return JSON.stringify(data);
}

export const generateResumeContent = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ data }) => {
    const geminiKey = process.env.GEMINI_API_KEY;
    const lovableKey = process.env.LOVABLE_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    const persona = TEMPLATE_CONTEXT[data.template] ?? "a professional candidate";
    const role = data.jobTitle?.trim() || "a fitting role for this category";
    const name = data.fullName?.trim() || "Alex Morgan";

    // If no keys are configured, fallback to high-quality mock data generation
    if (!geminiKey && !lovableKey && !openaiKey) {
      console.warn("No AI API keys configured. Falling back to local template mock generation.");
      // Simulate a small network/processing delay for realism
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { json: getMockResumeContent(data.template, role, name) };
    }

    let apiUrl = "";
    let authHeader = "";
    let apiModel = "";

    if (geminiKey) {
      apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
      authHeader = `Bearer ${geminiKey}`;
      apiModel = "gemini-2.5-flash";
    } else if (lovableKey) {
      apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
      authHeader = `Bearer ${lovableKey}`;
      apiModel = "google/gemini-2.5-flash";
    } else {
      apiUrl = "https://api.openai.com/v1/chat/completions";
      authHeader = `Bearer ${openaiKey}`;
      apiModel = "gpt-4o-mini";
    }

    const system =
      "You are an expert resume writer. Generate realistic, ATS-friendly, professionally worded resume content in strict JSON matching the requested schema. Use concise action-verb bullets, quantified impact where possible, and avoid buzzword clichés. Output JSON only.";

    const user = `Generate a complete sample resume in JSON for ${persona}, targeting "${role}".
Use the name "${name}". All content must be realistic, ATS-friendly, and cohesive with the target role.

Return ONLY a JSON object with EXACTLY these keys:
{
  "fullName": string,
  "jobTitle": string,
  "email": string,
  "phone": string,
  "location": string,
  "linkedin": string,
  "github": string,
  "portfolio": string,
  "objective": string,                       // 1 sentence
  "summary": string,                          // 2-4 sentences
  "education": [{ "school": string, "degree": string, "period": string, "details": string }], // 1-2 items
  "skills": string[],                         // 8-14 relevant skills
  "experience": [{ "company": string, "role": string, "period": string, "bullets": string }], // 2-3 items, bullets separated by newlines, start each with an action verb
  "projects": [{ "name": string, "link": string, "description": string }], // 2 items
  "certifications": string[],                 // 2-4 items
  "achievements": string[],                   // 2-4 items
  "languages": string[],                      // 2-3 items like "English (Native)"
  "interests": string[],                      // 3-5 items
  "references": [{ "name": string, "detail": string }] // 1-2 items with role & contact
}`;

    const res = await fetchWithRetry(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        model: apiModel,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached. Try again in a moment.");
      if (res.status === 402)
        throw new Error("AI credits exhausted. Add credits in workspace billing.");
      throw new Error(`AI request failed (${res.status}): ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    // Strip markdown code fences and extract the JSON object substring
    let content = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const first = content.indexOf("{");
    const last = content.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      content = content.slice(first, last + 1);
    }
    try {
      JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON. Please try again.");
    }
    return { json: content };
  });

export type TemplateId =
  "professional" | "engineering" | "nursing" | "it" | "business" | "freshers";

export const TEMPLATES: Array<{
  id: TemplateId;
  name: string;
  tagline: string;
  accent: string;
}> = [
  {
    id: "professional",
    name: "Professional",
    tagline: "Timeless serif · executive",
    accent: "#2563eb",
  },
  { id: "engineering", name: "Engineering", tagline: "Technical two-column", accent: "#0f766e" },
  { id: "nursing", name: "Nursing", tagline: "Healthcare · warm & clear", accent: "#e11d48" },
  { id: "it", name: "IT / Tech", tagline: "Modern · skills-first", accent: "#0ea5e9" },
  { id: "business", name: "Business", tagline: "Formal · results-driven", accent: "#0f172a" },
  { id: "freshers", name: "Freshers", tagline: "Graduate · education-first", accent: "#7c3aed" },
];

export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  period: string;
  details?: string;
}
export interface ExperienceEntry {
  id: string;
  company: string;
  role: string;
  period: string;
  bullets: string;
}
export interface ProjectEntry {
  id: string;
  name: string;
  link?: string;
  description: string;
}
export interface NamedEntry {
  id: string;
  text: string;
}
export interface ReferenceEntry {
  id: string;
  name: string;
  detail: string;
}

export interface ResumeData {
  photo: string; // data URL
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  objective: string;
  summary: string;
  education: EducationEntry[];
  skills: string[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  certifications: NamedEntry[];
  achievements: NamedEntry[];
  languages: NamedEntry[];
  interests: NamedEntry[];
  references: ReferenceEntry[];
}

export const emptyResume = (): ResumeData => ({
  photo: "",
  fullName: "",
  jobTitle: "",
  email: "",
  phone: "",
  location: "",
  linkedin: "",
  github: "",
  portfolio: "",
  objective: "",
  summary: "",
  education: [],
  skills: [],
  experience: [],
  projects: [],
  certifications: [],
  achievements: [],
  languages: [],
  interests: [],
  references: [],
});

export const sampleResume = (): ResumeData => ({
  ...emptyResume(),
  fullName: "Your Name",
  jobTitle: "Your Job Title",
  email: "you@example.com",
  phone: "+1 555 123 4567",
  location: "City, Country",
  linkedin: "linkedin.com/in/you",
  summary:
    "Short professional summary. Describe your experience, strengths, and what you bring to a team.",
});

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

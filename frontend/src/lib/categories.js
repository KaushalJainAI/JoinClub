import { Cpu, Palette, BookOpen, HeartHandshake, Trophy, Sparkles } from "lucide-react";

export const CATEGORIES = {
  technical: { label: "Technical", icon: Cpu, color: "#2563eb", blurb: "Build, code, compete" },
  cultural: { label: "Cultural", icon: Palette, color: "#db2777", blurb: "Perform, create, express" },
  literary: { label: "Literary & Media", icon: BookOpen, color: "#7c3aed", blurb: "Speak, write, report" },
  social: { label: "Social Impact", icon: HeartHandshake, color: "#059669", blurb: "Serve, lead, change" },
  sports: { label: "Sports", icon: Trophy, color: "#ea580c", blurb: "Play, train, win" },
};

export const categoryMeta = (key) => CATEGORIES[key] || { label: "Club", icon: Sparkles, color: "#2563eb", blurb: "" };

export const STATUS_META = {
  pending: { label: "Under review", variant: "warning" },
  shortlisted: { label: "Shortlisted", variant: "default" },
  accepted: { label: "Accepted", variant: "success" },
  rejected: { label: "Not selected", variant: "destructive" },
  withdrawn: { label: "Withdrawn", variant: "muted" },
};

export const MODE_META = {
  recruitment: { label: "Recruitment" },
  workshop: { label: "Workshop" },
  event: { label: "Event team" },
};

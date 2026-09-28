import { Sparkles, Users, Rocket } from "lucide-react";

// Two-column auth layout: a brand panel on desktop, just the form on phones.
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="container grid min-h-[calc(100vh-4rem)] items-center gap-10 py-10 lg:grid-cols-2">
      <div className="relative hidden h-full max-h-[640px] overflow-hidden rounded-3xl bg-gradient-to-br from-navy-mid via-navy to-navy-deep p-10 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent/30 blur-3xl" />
        <div className="hero-grid pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative mt-auto space-y-6">
          <h2 className="text-4xl font-extrabold leading-tight">
            28 clubs.
            <br />
            One place to find yours.
          </h2>
          <ul className="space-y-3 text-white/85">
            <li className="flex items-center gap-3">
              <Users className="h-5 w-5 text-accent" /> Every technical, cultural and social club at PEC
            </li>
            <li className="flex items-center gap-3">
              <Rocket className="h-5 w-5 text-accent" /> Apply in minutes and track every application
            </li>
            <li className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-accent" /> AI help to pick a club, polish answers and practise interviews
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto w-full max-w-md animate-fade-up">
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";
import { ShieldCheck, Database, Bot, Cookie, Clock, Download, Trash2 } from "lucide-react";

// Public privacy notice. Mirrors docs/privacy-notice.md; if the policy changes,
// update both. Longer legal questions go to whoever runs the site.
export default function Privacy() {
  return (
    <div className="page max-w-3xl">
      <p className="eyebrow">Your data</p>
      <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">Privacy notice</h1>
      <p className="mt-3 text-muted-foreground">
        JoinClub PEC is for Punjab Engineering College students. This page says what we store, who can see it, and what
        you can do about it.
      </p>

      <Section icon={Database} title="What we collect">
        <ul>
          <li>
            <strong>Your account:</strong> name, email address, phone number, student ID, branch and year.
          </li>
          <li>
            <strong>Your profile:</strong> a short bio, skills, interests, and optionally a profile photo and a resume
            (PDF).
          </li>
          <li>
            <strong>What you apply to:</strong> which club and opening you applied to, the answers you wrote to that
            club&apos;s questions, and the status of your application.
          </li>
          <li>
            <strong>How you use the site:</strong> chat conversations with the AI assistant are stored so you can come
            back to them. They are deleted automatically after 180 days.
          </li>
        </ul>
        <p>We do not collect payment information, and we do not track you across other websites.</p>
      </Section>

      <Section icon={ShieldCheck} title="Who can see what">
        <ul>
          <li>Name, email, branch, year and photo: any signed-in student.</li>
          <li>Your answers to a club&apos;s questions: that club&apos;s admins, and the super admin.</li>
          <li>Application status: you, that club&apos;s admins, the super admin.</li>
          <li>Resume: the clubs you apply to, and the super admin.</li>
          <li>Phone number: the admins of clubs you apply to, and the super admin.</li>
          <li>
            AI chats: only you. The super admin sees aggregate usage and cost, never your conversations.
          </li>
        </ul>
        <p>
          Club admins see the applicants for their own club only. The site&apos;s technical administrator can see all
          data in order to fix faults and moderate abuse.
        </p>
      </Section>

      <Section icon={Bot} title="AI features and Anthropic">
        <p>
          The answer checker, the mock interview bot, the help assistant, and the optional AI summary a club admin sees
          of an applicant all send text to <strong>Anthropic</strong>, the company behind the Claude models. That can
          include your answers, your profile, your own applications, and a club&apos;s public description. Only your
          own data is ever sent, never another student&apos;s.
        </p>
        <p>
          AI features are marked in the interface. You can switch off the applicant summary and withdraw AI consent in
          your <Link to="/profile#privacy" className="font-medium text-primary hover:underline">profile settings</Link>;
          without consent the AI features stay off and the rest of the site works normally.
        </p>
      </Section>

      <Section icon={Cookie} title="Cookies">
        <p>
          One cookie, <code>token</code>, keeps you signed in. It is HttpOnly (JavaScript cannot read it), SameSite=Lax,
          and Secure in production. There are no advertising or analytics cookies.
        </p>
      </Section>

      <Section icon={Clock} title="How long we keep things">
        <ul>
          <li>AI chats: 180 days, then deleted automatically.</li>
          <li>Your account and applications: until you delete your account.</li>
          <li>Database backups: 14 days, then deleted.</li>
        </ul>
      </Section>

      <Section icon={Download} title="Your rights">
        <p>From your profile you can:</p>
        <ul>
          <li>
            <strong>Export everything</strong> — one JSON file with your account, applications and chats.
          </li>
          <li>
            <strong>
              <Trash2 className="mr-1 inline h-4 w-4" />
              Delete your account.
            </strong>{" "}
            Profile, photo, resume, phone number and chats go immediately. Applications you sent are kept but stripped
            of your name, email, phone number and answers, because the club needs a record of its recruitment — they
            cannot be reconnected to you.
          </li>
        </ul>
        <p>
          <Link to="/profile#privacy" className="font-medium text-primary hover:underline">
            Open profile privacy settings
          </Link>
        </p>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="mt-8 rounded-2xl border bg-card p-6 shadow-soft">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h2>
      <div className="prose-sm mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

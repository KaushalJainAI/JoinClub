import { Link } from "react-router-dom";
import { MapPin, ExternalLink } from "lucide-react";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="mt-16 border-t bg-card/50">
      <div className="container grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">Every club and society at Punjab Engineering College, in one place. Find your people, apply in minutes, and track it all.</p>
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> Sector 12, Chandigarh 160012
          </p>
        </div>
        <FooterCol
          title="Explore"
          links={[
            ["/clubs", "All clubs"],
            ["/openings", "Recruiting now"],
            ["/events", "Events"],
            ["/privacy", "Privacy"],
          ]}
        />
        <FooterCol
          title="Get ready"
          links={[
            ["/assistant", "Ask PEC Buddy"],
            ["/assistant?tab=checker", "Answer checker"],
            ["/assistant?tab=interview", "Mock interview"],
          ]}
        />
        <div>
          <h4 className="mb-3 text-sm font-semibold">PEC</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <a className="inline-flex items-center gap-1 hover:text-foreground" href="https://pec.ac.in" target="_blank" rel="noreferrer">
                pec.ac.in <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              <a className="inline-flex items-center gap-1 hover:text-foreground" href="https://pec.ac.in/cultural-clubs" target="_blank" rel="noreferrer">
                Cultural clubs <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              <a className="inline-flex items-center gap-1 hover:text-foreground" href="https://pec.ac.in/students/technical-societies" target="_blank" rel="noreferrer">
                Technical societies <ExternalLink className="h-3 w-3" />
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t py-5 text-center text-xs text-muted-foreground">
        Student-built. Club information sourced from pec.ac.in; club admins keep their own pages up to date.
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold">{title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to} className="hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

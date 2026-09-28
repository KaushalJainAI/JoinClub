import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="page grid min-h-[60vh] place-items-center text-center">
      <div>
        <div className="font-display text-8xl font-extrabold text-primary/15">404</div>
        <h1 className="-mt-6 text-2xl font-extrabold">This page wandered off</h1>
        <p className="mt-2 text-muted-foreground">But there are plenty of clubs that would love to meet you.</p>
        <Button className="mt-6" asChild>
          <Link to="/clubs">
            <Compass /> Explore clubs
          </Link>
        </Button>
      </div>
    </div>
  );
}

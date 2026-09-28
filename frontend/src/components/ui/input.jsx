import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-lg border border-input bg-card px-3 text-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input type={type} className={cn(field, "h-10 py-2 file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium", className)} ref={ref} {...props} />
));
Input.displayName = "Input";

const Textarea = React.forwardRef(({ className, ...props }, ref) => <textarea className={cn(field, "min-h-[96px] py-2 leading-relaxed", className)} ref={ref} {...props} />);
Textarea.displayName = "Textarea";

// Native select, styled to match; good on mobile and accessible for free.
const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(field, "h-10 cursor-pointer appearance-none bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-8", className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";

export { Input, Textarea, Select };

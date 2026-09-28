import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }) {
  return <div className={cn("animate-pulse rounded-lg bg-muted", className)} {...props} />;
}

export function Progress({ value = 0, className, barClassName, style }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full bg-primary transition-all duration-500", barClassName)} style={{ width: `${Math.max(0, Math.min(100, value))}%`, ...style }} />
    </div>
  );
}

export function Separator({ className }) {
  return <div role="separator" className={cn("h-px w-full bg-border", className)} />;
}

// ---- Tabs ----
export const Tabs = TabsPrimitive.Root;
export const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn("inline-flex items-center gap-1 rounded-xl bg-muted p-1 text-muted-foreground", className)} {...props} />
));
TabsList.displayName = "TabsList";
export const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm [&_svg]:size-4",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";
export const TabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-4 focus-visible:outline-none", className)} {...props} />
));
TabsContent.displayName = "TabsContent";

// ---- Dropdown menu ----
export const DropdownMenu = DropdownPrimitive.Root;
export const DropdownMenuTrigger = DropdownPrimitive.Trigger;
export const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 8, ...props }, ref) => (
  <DropdownPrimitive.Portal>
    <DropdownPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn("z-50 min-w-[12rem] overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className)}
      {...props}
    />
  </DropdownPrimitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";
export const DropdownMenuItem = React.forwardRef(({ className, ...props }, ref) => (
  <DropdownPrimitive.Item
    ref={ref}
    className={cn("relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors focus:bg-secondary [&_svg]:size-4 [&_svg]:text-muted-foreground", className)}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";
export const DropdownMenuSeparator = () => <DropdownPrimitive.Separator className="my-1 h-px bg-border" />;
export const DropdownMenuLabel = ({ className, ...props }) => <DropdownPrimitive.Label className={cn("px-2.5 py-2 text-sm", className)} {...props} />;

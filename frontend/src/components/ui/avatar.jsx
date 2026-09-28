import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn, initials } from "@/lib/utils";

const Avatar = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root ref={ref} className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...props} />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square h-full w-full object-cover", className)} {...props} />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback ref={ref} className={cn("flex h-full w-full items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary", className)} {...props} />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// A user's photo, or their initials.
function UserAvatar({ user, className }) {
  return (
    <Avatar className={className}>
      {user?.profile?.profilePhoto && <AvatarImage src={user.profile.profilePhoto} alt="" />}
      <AvatarFallback>{initials(user?.fullname)}</AvatarFallback>
    </Avatar>
  );
}

export { Avatar, AvatarImage, AvatarFallback, UserAvatar };

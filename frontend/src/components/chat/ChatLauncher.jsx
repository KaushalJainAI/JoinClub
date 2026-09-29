import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { MessageCircle, X, Maximize2, RotateCcw } from "lucide-react";
import { useChatStream } from "@/hooks/useChatStream";
import { useFetch } from "@/hooks/useFetch";
import BuddyEmpty from "./BuddyEmpty";
import { PageLoader } from "@/components/layout/guards";

// Loaded on first open, so the markdown renderer stays out of every page's bundle.
const ChatWindow = lazy(() => import("./ChatWindow"));

// The floating "Ask PEC Buddy" button, available on every student-facing page.
export default function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const { user } = useSelector((s) => s.auth);
  const chat = useChatStream("helpdesk", { loggedIn: Boolean(user) });
  const { data: status } = useFetch(open ? "/ai/status" : null);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen} modal={false}>
      <DialogPrimitive.Trigger asChild>
        <button
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-navy to-navy-mid py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-lift transition-transform hover:scale-105 data-[state=open]:hidden"
          aria-label="Ask PEC Buddy"
        >
          <MessageCircle className="h-5 w-5" /> Ask PEC Buddy
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed bottom-0 right-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden border bg-background shadow-lift data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4 data-[state=open]:fade-in-0 sm:bottom-5 sm:right-5 sm:h-[min(640px,calc(100vh-2.5rem))] sm:w-[400px] sm:rounded-2xl"
        >
          <div className="flex items-center gap-2 border-b bg-gradient-to-r from-navy to-navy-mid px-4 py-3 text-white">
            <DialogPrimitive.Title className="flex-1 font-display font-bold">PEC Buddy</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Chat with the JoinClub help assistant</DialogPrimitive.Description>
            {chat.messages.length > 0 && (
              <button onClick={chat.reset} className="rounded-md p-1.5 hover:bg-white/15" aria-label="New chat">
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <Link to="/assistant" onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-white/15" aria-label="Open full screen">
              <Maximize2 className="h-4 w-4" />
            </Link>
            <DialogPrimitive.Close className="rounded-md p-1.5 hover:bg-white/15" aria-label="Close">
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          <Suspense fallback={<PageLoader />}>
            <ChatWindow compact regenerate chat={chat} empty={<BuddyEmpty compact demo={status && !status.enabled} onPick={(t) => chat.send(t)} />} />
          </Suspense>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

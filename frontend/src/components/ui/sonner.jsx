import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

const Toaster = (props) => {
  const { resolvedTheme = "light" } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme}
      position="top-center"
      richColors
      closeButton
      toastOptions={{ classNames: { toast: "font-sans rounded-xl shadow-lift" } }}
      {...props}
    />
  );
};

export { Toaster };

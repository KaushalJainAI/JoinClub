import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import App from "./App.jsx";
import store from "./redux/store.js";
import { queryClient } from "./lib/queryClient.js";
import { Toaster } from "./components/ui/sonner.jsx";
import { ErrorBoundary } from "./components/layout/ErrorBoundary.jsx";
import { initSentry } from "./lib/sentry.js";
import "./index.css";

initSentry();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </QueryClientProvider>
        <Toaster />
      </Provider>
    </ThemeProvider>
  </StrictMode>
);

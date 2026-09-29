import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { ThemeProvider } from "next-themes";
import App from "./App.jsx";
import store from "./redux/store.js";
import { Toaster } from "./components/ui/sonner.jsx";
import { ErrorBoundary } from "./components/layout/ErrorBoundary.jsx";
import { initSentry } from "./lib/sentry.js";
import "./index.css";

initSentry();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Provider store={store}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
        <Toaster />
      </Provider>
    </ThemeProvider>
  </StrictMode>
);

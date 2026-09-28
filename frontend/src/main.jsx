import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { ThemeProvider } from "next-themes";
import App from "./App.jsx";
import store from "./redux/store.js";
import { Toaster } from "./components/ui/sonner.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Provider store={store}>
        <App />
        <Toaster />
      </Provider>
    </ThemeProvider>
  </StrictMode>
);

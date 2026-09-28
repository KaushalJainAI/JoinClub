import { useRef } from "react";
import { cn } from "@/lib/utils";

// Six single-digit boxes: auto-advance, backspace to go back, paste a whole code.
export default function OtpInput({ value, onChange, disabled, autoFocus = true }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  const setAt = (i, d) => {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join("").slice(0, 6));
  };

  const onKey = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
      setAt(i - 1, "");
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };

  const onInput = (i, e) => {
    const d = e.target.value.replace(/\D/g, "");
    if (!d) return setAt(i, "");
    if (d.length > 1) return onPaste(d);
    setAt(i, d);
    if (i < 5) refs.current[i + 1]?.focus();
  };

  const onPaste = (text) => {
    const code = text.replace(/\D/g, "").slice(0, 6);
    if (!code) return;
    onChange(code);
    refs.current[Math.min(code.length, 5)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2" onPaste={(e) => (e.preventDefault(), onPaste(e.clipboardData.getData("text")))}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          onChange={(e) => onInput(i, e)}
          onKeyDown={(e) => onKey(i, e)}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={6}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            "h-12 w-11 rounded-xl border border-input bg-card text-center font-display text-xl font-bold transition-all focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40 sm:h-14 sm:w-12",
            d && "border-primary/50 bg-primary/5"
          )}
        />
      ))}
    </div>
  );
}

import { useLayoutEffect, useRef, useState, type SelectHTMLAttributes } from "react";

export function SlidingLabel({
  text,
  id,
  decorative,
}: {
  text: string;
  id?: string;
  decorative?: boolean;
}) {
  const viewport = useRef<HTMLSpanElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const box = viewport.current!;
    const line = label.current!;
    const control = box.closest("button, .select-control");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    let distance = 0;

    function stop() {
      animation?.cancel();
      animation = undefined;
      box.removeAttribute("data-sliding");
    }

    function reveal() {
      if (!distance || motion.matches || animation?.playState === "running") return;
      if (control?.querySelector("select:disabled") || control?.matches(":disabled")) return;
      const shift = getComputedStyle(box).direction === "rtl" ? distance : -distance;
      box.setAttribute("data-sliding", "");
      animation = line.animate(
        [
          { transform: "translateX(0)", offset: 0 },
          { transform: "translateX(0)", offset: 0.18 },
          { transform: `translateX(${shift}px)`, offset: 0.62 },
          { transform: `translateX(${shift}px)`, offset: 0.82 },
          { transform: "translateX(0)", offset: 1 },
        ],
        { duration: Math.min(9000, 2300 + distance * 40), easing: "ease-in-out" },
      );
      animation.onfinish = stop;
    }

    function measure() {
      const width = box.clientWidth;
      const overflow = width ? Math.max(0, line.scrollWidth - width) : 0;
      if (overflow === distance) return;
      stop();
      distance = overflow;
      reveal();
    }

    const observer = new ResizeObserver(measure);
    observer.observe(box);
    measure();
    document.fonts.addEventListener("loadingdone", measure);
    control?.addEventListener("pointerenter", reveal);
    control?.addEventListener("focusin", reveal);
    motion.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
      control?.removeEventListener("pointerenter", reveal);
      control?.removeEventListener("focusin", reveal);
      motion.removeEventListener("change", stop);
      stop();
    };
  }, [text]);

  return (
    <span id={id} className="sliding-label" ref={viewport} aria-hidden={decorative}>
      <span className="sliding-label-text" ref={label}>
        {text}
      </span>
    </span>
  );
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "multiple" | "size">;

// Keep the native picker and form control. The overlay only draws the closed value.
export function Select({ children, onChange, value, defaultValue, title, ...props }: SelectProps) {
  const select = useRef<HTMLSelectElement>(null);
  const [label, setLabel] = useState<string>();

  function readLabel() {
    setLabel(select.current?.selectedOptions[0]?.label ?? "");
  }

  useLayoutEffect(readLabel, [children, value, defaultValue]);
  useLayoutEffect(() => {
    const form = select.current?.form;
    let frame = 0;
    function reset() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(readLabel);
    }
    form?.addEventListener("reset", reset);
    return () => {
      form?.removeEventListener("reset", reset);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <span className="select-control" data-enhanced={label !== undefined ? "" : undefined}>
      <select
        {...props}
        ref={select}
        value={value}
        defaultValue={defaultValue}
        title={title ?? label}
        onChange={(event) => {
          readLabel();
          onChange?.(event);
        }}
      >
        {children}
      </select>
      {label !== undefined && <SlidingLabel text={label} decorative />}
    </span>
  );
}

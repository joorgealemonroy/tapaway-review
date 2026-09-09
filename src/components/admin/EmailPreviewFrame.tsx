// EmailPreviewFrame — renders an HTML email inside a sandboxed iframe,
// scaled down to fit the card/container width. The 600px-wide email is the
// single source for measurement; the container height is set from an
// estimated pixel height (from the template registry).
//
// sandbox="allow-same-origin": no scripts, no forms, no popups — pure render.
import { useLayoutEffect, useRef, useState } from "react";

interface Props {
  html: string;
  title: string;
  /** Estimated content height (px) at 600px width. */
  contentHeight: number;
  className?: string;
}

const EMAIL_WIDTH = 600;

export default function EmailPreviewFrame({ html, title, contentHeight, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(w / EMAIL_WIDTH);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ height: contentHeight * scale, overflow: "hidden", position: "relative" }}
    >
      <iframe
        title={title}
        srcDoc={html}
        sandbox="allow-same-origin"
        style={{
          width: EMAIL_WIDTH,
          height: contentHeight,
          border: 0,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
          background: "#f4f4f5",
        }}
      />
    </div>
  );
}

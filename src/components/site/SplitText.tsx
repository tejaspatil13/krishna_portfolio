import type { ElementType } from "react";

/**
 * Renders text as masked words → chars for GSAP reveals while keeping a
 * clean accessible label. Words never break mid-word.
 */
export function SplitText({
  text,
  as: Tag = "span",
  className = "",
  mode = "chars",
}: {
  text: string;
  as?: ElementType;
  className?: string;
  mode?: "chars" | "words";
}) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true" className="reveal-mask" data-word>
          {mode === "chars" ? (
            w.split("").map((c, j) => (
              <span key={j} data-char className="inline-block">
                {c}
              </span>
            ))
          ) : (
            <span data-char className="inline-block">
              {w}
            </span>
          )}
          {i < words.length - 1 ? <span className="inline-block">&nbsp;</span> : null}
        </span>
      ))}
    </Tag>
  );
}

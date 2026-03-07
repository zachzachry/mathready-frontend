import { useState, useEffect } from "react";

const KATEX_CSS = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css";
const KATEX_JS  = "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js";

export function useKaTeX() {
  const [ready, setReady] = useState(!!window.katex);
  useEffect(() => {
    if (window.katex) { setReady(true); return; }
    if (!document.querySelector(`link[href="${KATEX_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = KATEX_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = KATEX_JS;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);
  return ready;
}

export default function MathText({ text, style }) {
  const katexReady = useKaTeX();
  if (!text) return null;
  if (!katexReady) return <span style={{ whiteSpace:"pre-wrap", ...style }}>{text}</span>;

  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <span style={{ whiteSpace:"pre-wrap", ...style }}>
      {parts.map((part, i) => {
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          const latex = part.slice(1,-1);
          if (/[\\^_{}]|frac|sqrt|times|cdot|pi/.test(latex)) {
            try {
              const html = window.katex.renderToString(latex, { throwOnError:false, displayMode:false });
              return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
            } catch {
              return <span key={i}>{latex}</span>;
            }
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

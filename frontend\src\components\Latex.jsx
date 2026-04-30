import React, { useEffect, useRef } from 'react';

export function Latex({ children, displayMode = false }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && window.katex) {
      try {
        window.katex.render(children, containerRef.current, {
          throwOnError: false,
          displayMode: displayMode
        });
      } catch (err) {
        console.error("KaTeX rendering error:", err);
      }
    }
  }, [children, displayMode]);

  return <span ref={containerRef} />;
}

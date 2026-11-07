import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface FormulaBlockProps {
  formula: string;
  displayMode?: boolean;
  className?: string;
}

export const FormulaBlock: React.FC<FormulaBlockProps> = ({
  formula,
  displayMode = true,
  className = '',
}) => {
  let html = '';
  let error = false;

  try {
    html = katex.renderToString(formula, {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    error = true;
  }

  if (error || !html) {
    return (
      <code className={`bp-mono text-xs px-2 py-1 rounded bg-[var(--bp-surface-2)] text-[var(--bp-ink)] border border-[var(--bp-line)] ${className}`}>
        {formula}
      </code>
    );
  }

  return (
    <div
      className={`overflow-x-auto py-1 text-[var(--bp-ink)] ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};


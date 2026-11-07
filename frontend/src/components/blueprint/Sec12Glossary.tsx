import React, { useState, useMemo } from 'react';
import { GLOSSARY_TERMS } from '../../lib/blueprintContent';

export const Sec12Glossary: React.FC = () => {
  const [query, setQuery] = useState('');

  const filteredTerms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GLOSSARY_TERMS;
    return GLOSSARY_TERMS.filter(
      (item) =>
        item.term.toLowerCase().includes(q) ||
        item.full.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search acronyms, terms, or definitions..."
            className="w-full px-3.5 py-2 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface)] text-xs text-[var(--bp-ink)] placeholder-[var(--bp-muted)] focus:outline-none focus:border-[var(--bp-accent)] transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--bp-muted)] hover:text-[var(--bp-ink)] cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <span className="bp-mono text-xs text-[var(--bp-muted)] shrink-0 self-center">
          Showing {filteredTerms.length} of {GLOSSARY_TERMS.length} acronyms
        </span>
      </div>

      {/* Grid of Terms */}
      {filteredTerms.length === 0 ? (
        <div className="p-8 rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] text-center text-xs text-[var(--bp-muted)]">
          No matching acronyms found for "{query}".
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTerms.map((term) => (
            <div
              key={term.term}
              className="p-4 rounded-xl border border-[var(--bp-line)] bg-[var(--bp-surface)] space-y-1.5 flex flex-col justify-between hover:border-[var(--bp-accent)] transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="bp-mono text-xs font-bold text-[var(--bp-accent)]">
                    {term.term}
                  </span>
                </div>
                <h5 className="font-semibold text-xs text-[var(--bp-ink)] mt-0.5">
                  {term.full}
                </h5>
                <p className="text-[11px] text-[var(--bp-muted)] leading-relaxed mt-1">
                  {term.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


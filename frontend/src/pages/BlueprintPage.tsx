import React, { useState, useEffect, useRef } from 'react';
import { BLUEPRINT_INDEX } from '../lib/blueprintContent';
import { Sec01WhatItDoes } from '../components/blueprint/Sec01WhatItDoes';
import { Sec02Pipeline } from '../components/blueprint/Sec02Pipeline';
import { Sec03Architecture } from '../components/blueprint/Sec03Architecture';
import { Sec04Vulnerability } from '../components/blueprint/Sec04Vulnerability';
import { Sec05PageGuides } from '../components/blueprint/Sec05PageGuides';
import { Sec06Formulas } from '../components/blueprint/Sec06Formulas';
import { Sec07MonteCarlo } from '../components/blueprint/Sec07MonteCarlo';
import { Sec08Optimization } from '../components/blueprint/Sec08Optimization';
import { Sec09DataModel } from '../components/blueprint/Sec09DataModel';
import { Sec10TechStack } from '../components/blueprint/Sec10TechStack';
import { Sec11Limitations } from '../components/blueprint/Sec11Limitations';
import { Sec12Glossary } from '../components/blueprint/Sec12Glossary';
import { Link2, ArrowUp, Check, ChevronRight } from 'lucide-react';

export interface BlueprintPageProps {
  onSelectTab?: (tabId: string) => void;
}

export const BlueprintPage: React.FC<BlueprintPageProps> = ({ onSelectTab }) => {
  const [activeId, setActiveId] = useState<string>('sec-01');
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  // Smooth or instant scroll utility respecting prefers-reduced-motion
  const scrollToSection = (id: string) => {
    const mainEl = document.getElementById('app-main-scroller') || document.querySelector('main');
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (id === 'blueprint-top') {
      if (mainEl) {
        mainEl.scrollTo({
          top: 0,
          behavior: prefersReduced ? 'instant' : 'smooth',
        });
      } else {
        window.scrollTo({
          top: 0,
          behavior: prefersReduced ? 'instant' : 'smooth',
        });
      }
      setActiveId('sec-01');
      window.history.replaceState(null, '', ' ');
      return;
    }

    const el = document.getElementById(id);
    if (!el) return;

    isNavigatingRef.current = true;
    setActiveId(id);

    el.scrollIntoView({
      behavior: prefersReduced ? 'instant' : 'smooth',
      block: 'start',
    });

    window.history.replaceState(null, '', `#${id}`);

    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 800);
  };

  // Scrollspy with IntersectionObserver watching the main container
  useEffect(() => {
    const mainEl = document.getElementById('app-main-scroller') || document.querySelector('main');
    if (!mainEl) return;

    const handleScroll = () => {
      if (mainEl.scrollTop > 600) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    mainEl.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      (entries) => {
        if (isNavigatingRef.current) return;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        root: mainEl,
        rootMargin: '-24px 0px -65% 0px',
        threshold: 0,
      }
    );

    BLUEPRINT_INDEX.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      mainEl.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  // Handle direct hash navigation on initial page load
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: 'instant', block: 'start' });
          setActiveId(hash);
        }
      }, 100);
    }
  }, []);

  // Copy anchor link
  const copyAnchor = (id: string) => {
    const url = window.location.href.split('#')[0] + `#${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderSectionContent = (id: string) => {
    switch (id) {
      case 'sec-01': return <Sec01WhatItDoes />;
      case 'sec-02': return <Sec02Pipeline onSelectTab={onSelectTab} />;
      case 'sec-03': return <Sec03Architecture />;
      case 'sec-04': return <Sec04Vulnerability />;
      case 'sec-05': return <Sec05PageGuides onSelectTab={onSelectTab} />;
      case 'sec-06': return <Sec06Formulas />;
      case 'sec-07': return <Sec07MonteCarlo />;
      case 'sec-08': return <Sec08Optimization />;
      case 'sec-09': return <Sec09DataModel />;
      case 'sec-10': return <Sec10TechStack />;
      case 'sec-11': return <Sec11Limitations />;
      case 'sec-12': return <Sec12Glossary />;
      default: return null;
    }
  };

  return (
    <div className="blueprint min-h-screen text-[var(--bp-ink)] pb-24">
      {/* Top Header & Hero */}
      <div className="border-b border-[var(--bp-line)] bg-[var(--bp-surface)] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="bp-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bp-accent)] text-white">
              Specification
            </span>
            <span className="text-sm font-semibold text-[var(--bp-ink)]">
              PS105 Platform Blueprint
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-[var(--bp-muted)]">
              12 Comprehensive Engineering Sections
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8 space-y-12">
        {/* Hero Section */}
        <div id="blueprint-top" className="space-y-4 max-w-4xl">
          <span className="bp-mono text-xs font-semibold text-[var(--bp-accent)]">
            System design &amp; methodological documentation
          </span>
          <h1
            className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-[var(--bp-ink)] leading-tight"
            style={{ fontFamily: 'Newsreader, Georgia, serif' }}
          >
            Cyber Risk Quantification, Simulation &amp; Capital Optimization
          </h1>
          <p className="text-base text-[var(--bp-muted)] leading-relaxed">
            PS105 converts technical vulnerability telemetry into defensible financial loss distributions. 
            By integrating NIST CPE correlation, the FAIR-inspired quantitative model, 10,000-trial Monte Carlo stochastic simulations, 
            and 0/1 Knapsack Mixed-Integer Linear Programming, the platform equips CISOs and CFOs to justify cybersecurity 
            investment decisions with mathematical rigor.
          </p>
        </div>

        {/* Index Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[var(--bp-muted)]">
              Blueprint table of contents
            </h2>
            <span className="text-xs text-[var(--bp-muted)]">Click any section to jump</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BLUEPRINT_INDEX.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => scrollToSection(entry.id)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                  activeId === entry.id
                    ? 'border-[var(--bp-accent)] bg-[var(--bp-accent-soft)]/40 shadow-sm'
                    : 'border-[var(--bp-line)] bg-[var(--bp-surface)] hover:border-[var(--bp-accent)] hover:bg-[var(--bp-surface-2)]'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="bp-mono text-xs font-bold text-[var(--bp-accent)]">
                      §{entry.num}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--bp-muted)] group-hover:text-[var(--bp-accent)] transition-colors" />
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--bp-ink)]">
                    {entry.title}
                  </h3>
                  <p className="text-xs text-[var(--bp-muted)] leading-relaxed pt-1">
                    {entry.summary}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile / Tablet Sticky Navigation Chips (< xl) */}
        <div className="xl:hidden sticky top-0 z-10 bg-[var(--bp-bg)] border-b border-[var(--bp-line)] py-2.5 px-4 -mx-6 mb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {BLUEPRINT_INDEX.map((entry) => {
              const isActive = activeId === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => scrollToSection(entry.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[var(--bp-accent)] text-white shadow-xs'
                      : 'bg-[var(--bp-surface)] text-[var(--bp-muted)] border border-[var(--bp-line)] hover:text-[var(--bp-ink)]'
                  }`}
                >
                  §{entry.num} {entry.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Layout with Sticky Right TOC */}
        <div className="grid xl:grid-cols-[1fr_260px] gap-10 items-start pt-6 border-t border-[var(--bp-line)]">
          {/* 12 Sections */}
          <div className="space-y-16 min-w-0">
            {BLUEPRINT_INDEX.map((entry) => (
              <section
                key={entry.id}
                id={entry.id}
                className="scroll-mt-6 space-y-6 pt-4 border-t border-[var(--bp-line)] first:border-0 first:pt-0"
              >
                {/* Section Header */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="bp-mono text-xs font-semibold px-2 py-0.5 rounded bg-[var(--bp-accent-soft)] text-[var(--bp-accent)]">
                        Section {entry.num}
                      </span>
                      <h2
                        className="text-xl sm:text-2xl font-semibold text-[var(--bp-ink)]"
                        style={{ fontFamily: 'Newsreader, Georgia, serif' }}
                      >
                        {entry.title}
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyAnchor(entry.id)}
                      title="Copy link to this section"
                      className="p-1.5 rounded-lg border border-[var(--bp-line)] bg-[var(--bp-surface)] text-[var(--bp-muted)] hover:text-[var(--bp-ink)] hover:border-[var(--bp-accent)] transition-all cursor-pointer shrink-0"
                      aria-label={`Copy link to section ${entry.num}`}
                    >
                      {copiedId === entry.id ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Link2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs sm:text-sm text-[var(--bp-muted)] leading-relaxed">
                    {entry.summary}
                  </p>
                </div>

                {/* Section Content */}
                <div className="pt-2">
                  {renderSectionContent(entry.id)}
                </div>

                {/* Bottom Back to Top / Index Jump */}
                <div className="flex items-center justify-between pt-4 border-t border-[var(--bp-line)] text-xs text-[var(--bp-muted)]">
                  <span>Section {entry.num} of 12</span>
                  <button
                    type="button"
                    onClick={() => scrollToSection('blueprint-top')}
                    className="hover:text-[var(--bp-accent)] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    Back to index ↑
                  </button>
                </div>
              </section>
            ))}
          </div>

          {/* Sticky Right TOC Navigation (Desktop XL) */}
          <aside className="hidden xl:block sticky top-4 space-y-3 z-10">
            <h4 className="text-[11px] font-semibold text-[var(--bp-muted)]">
              On this page
            </h4>
            <nav className="space-y-1 text-xs border-l-2 border-[var(--bp-line)] pl-3">
              {BLUEPRINT_INDEX.map((entry) => {
                const isActive = activeId === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => scrollToSection(entry.id)}
                    className={`block w-full text-left py-1 transition-all cursor-pointer truncate ${
                      isActive
                        ? 'font-bold text-[var(--bp-accent)] translate-x-1'
                        : 'text-[var(--bp-muted)] hover:text-[var(--bp-ink)]'
                    }`}
                  >
                    <span className="bp-mono mr-1.5 opacity-70">
                      {entry.num}.
                    </span>
                    {entry.title}
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      </div>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={() => scrollToSection('blueprint-top')}
          className="fixed bottom-6 right-6 p-3 rounded-full bg-[var(--bp-surface)] border border-[var(--bp-line)] text-[var(--bp-ink)] shadow-lg hover:border-[var(--bp-accent)] hover:text-[var(--bp-accent)] transition-all cursor-pointer z-20"
          aria-label="Scroll back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};


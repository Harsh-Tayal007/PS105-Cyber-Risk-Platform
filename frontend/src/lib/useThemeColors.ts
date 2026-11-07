import { useState, useEffect } from 'react';

export interface ThemeColors {
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  muted: string;
  line: string;
  brand: string;
  brandSoft: string;
  brandInk: string;
  warn: string;
  warnSoft: string;
  danger: string;
  dangerSoft: string;
  ok: string;
  okSoft: string;
}

export function readThemeColors(): ThemeColors {
  if (typeof window === 'undefined') {
    return {
      bg: '#F5F2EA',
      surface: '#FFFFFF',
      surface2: '#FAF8F3',
      ink: '#17211C',
      muted: '#5C6760',
      line: '#E4DFD2',
      brand: '#1E4D3F',
      brandSoft: '#E3EDE8',
      brandInk: '#FFFFFF',
      warn: '#B7791F',
      warnSoft: '#F6ECD6',
      danger: '#A8352A',
      dangerSoft: '#F7E4E1',
      ok: '#2F7D4F',
      okSoft: '#E2F1E8',
    };
  }

  const computed = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => computed.getPropertyValue(name).trim() || fallback;

  return {
    bg: get('--bg', '#F5F2EA'),
    surface: get('--surface', '#FFFFFF'),
    surface2: get('--surface-2', '#FAF8F3'),
    ink: get('--ink', '#17211C'),
    muted: get('--ink-muted', '#5C6760'),
    line: get('--line', '#E4DFD2'),
    brand: get('--brand', '#1E4D3F'),
    brandSoft: get('--brand-soft', '#E3EDE8'),
    brandInk: get('--brand-ink', '#FFFFFF'),
    warn: get('--warn', '#B7791F'),
    warnSoft: get('--warn-soft', '#F6ECD6'),
    danger: get('--danger', '#A8352A'),
    dangerSoft: get('--danger-soft', '#F7E4E1'),
    ok: get('--ok', '#2F7D4F'),
    okSoft: get('--ok-soft', '#E2F1E8'),
  };
}

export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(readThemeColors);

  useEffect(() => {
    const update = () => {
      setColors(readThemeColors());
    };

    update();
    window.addEventListener('ps105_theme_change', update);

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          update();
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      window.removeEventListener('ps105_theme_change', update);
      observer.disconnect();
    };
  }, []);

  return colors;
}


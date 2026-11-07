import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { BlueprintPage } from './BlueprintPage';
import { BLUEPRINT_INDEX, PIPELINE_NODES, DEMO_STEPS, PAGE_GUIDES, FORMULA_GROUPS, TECH_STACK, GLOSSARY_TERMS } from '../lib/blueprintContent';

describe('BlueprintPage', () => {
  it('contains exactly 12 blueprint index entries', () => {
    expect(BLUEPRINT_INDEX).toHaveLength(12);
  });

  it('each index entry has valid id, num, title, and summary', () => {
    BLUEPRINT_INDEX.forEach((entry, idx) => {
      const expectedNum = (idx + 1).toString().padStart(2, '0');
      expect(entry.id).toBe(`sec-${expectedNum}`);
      expect(entry.num).toBe(expectedNum);
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.summary.length).toBeGreaterThan(0);
    });
  });

  it('renders all 12 index titles in the markup', () => {
    const html = renderToString(<BlueprintPage />);
    BLUEPRINT_INDEX.forEach(({ title }) => {
      // In server-rendered HTML, '&' is escaped to '&amp;'
      const escapedTitle = title.replace(/&/g, '&amp;');
      expect(html).toContain(escapedTitle);
    });
  });

  it('renders matching section elements with id for all 12 entries', () => {
    const html = renderToString(<BlueprintPage />);
    BLUEPRINT_INDEX.forEach(({ id }) => {
      expect(html).toContain(`id="${id}"`);
    });
  });

  it('renders core architectural and content sections', () => {
    const html = renderToString(<BlueprintPage />);
    // Check key strings from content data
    expect(html).toContain('7-Stage Risk Analytics Pipeline');
    expect(html).toContain('ABC Financial Services');
    expect(html).toContain('Loss Exceedance Curve');
    expect(html).toContain('0/1 Cyber Capital Allocation Knapsack');
    expect(html).toContain('CPE matching pipeline');
    expect(html).toContain('Third Normal Form (3NF)');
  });

  it('content data structures are complete and well-formed', () => {
    expect(PIPELINE_NODES.length).toBe(7);
    expect(DEMO_STEPS.length).toBe(6);
    expect(PAGE_GUIDES.length).toBe(9);
    expect(FORMULA_GROUPS.length).toBe(4);
    expect(TECH_STACK.length).toBe(4);
    expect(GLOSSARY_TERMS.length).toBeGreaterThanOrEqual(20);
  });
});

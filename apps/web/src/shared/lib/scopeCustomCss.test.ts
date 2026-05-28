import { describe, expect, it } from 'vitest';

import { scopeCustomCss } from './scopeCustomCss';

describe('scopeCustomCss', () => {
  it('returns empty string for empty input', () => {
    expect(scopeCustomCss('', 'p1')).toBe('');
  });

  it('prefixes simple element selectors', () => {
    const result = scopeCustomCss('h1 { color: red; }', 'p1');
    expect(result).toContain('#subpage-p1 h1');
  });

  it('prefixes class selectors', () => {
    const result = scopeCustomCss('.my-class { color: blue; }', 'p1');
    expect(result).toContain('#subpage-p1 .my-class');
  });

  it('prefixes ID selectors', () => {
    const result = scopeCustomCss('#my-id { display: flex; }', 'p1');
    expect(result).toContain('#subpage-p1 #my-id');
  });

  it('prefixes each selector in a comma-separated list individually', () => {
    const result = scopeCustomCss('h1, h2, h3 { font-weight: bold; }', 'p1');
    expect(result).toContain('#subpage-p1 h1');
    expect(result).toContain('#subpage-p1 h2');
    expect(result).toContain('#subpage-p1 h3');
  });

  it('replaces the html selector with the scope identifier', () => {
    const result = scopeCustomCss('html { background: white; }', 'p1');
    expect(result).toContain('#subpage-p1 {');
    expect(result).not.toContain('html {');
  });

  it('replaces the body selector with the scope identifier', () => {
    const result = scopeCustomCss('body { margin: 0; }', 'p1');
    expect(result).toContain('#subpage-p1 {');
    expect(result).not.toContain('body {');
  });

  it('replaces :root with the scope identifier', () => {
    const result = scopeCustomCss(':root { --color: red; }', 'p1');
    expect(result).toContain('#subpage-p1 {');
    expect(result).not.toContain(':root {');
  });

  it('preserves @keyframes blocks without prefixing internal selectors', () => {
    const input = '@keyframes fade { from { opacity: 0; } to { opacity: 1; } }';
    const result = scopeCustomCss(input, 'p1');
    expect(result).toContain('@keyframes fade');
    expect(result).not.toContain('#subpage-p1');
  });

  it('preserves @font-face blocks without prefixing', () => {
    const input =
      "@font-face { font-family: 'MyFont'; src: url('font.woff2'); }";
    const result = scopeCustomCss(input, 'p1');
    expect(result).toContain('@font-face');
    expect(result).not.toContain('#subpage-p1');
  });

  it('preserves -webkit-keyframes blocks', () => {
    const input =
      '@-webkit-keyframes slide { from { left: 0; } to { left: 100%; } }';
    const result = scopeCustomCss(input, 'p1');
    expect(result).toContain('@-webkit-keyframes slide');
    expect(result).not.toContain('#subpage-p1');
  });

  it('preserves @import statements', () => {
    const input = "@import url('style.css');\nh1 { color: red; }";
    const result = scopeCustomCss(input, 'p1');
    expect(result).toContain("@import url('style.css')");
    expect(result).toContain('#subpage-p1 h1');
  });

  it('prefixes selectors inside @media queries', () => {
    const input = '@media (max-width: 768px) { h1 { font-size: 1rem; } }';
    const result = scopeCustomCss(input, 'p1');
    expect(result).toContain('@media (max-width: 768px)');
    expect(result).toContain('#subpage-p1 h1');
  });

  it('uses the subpageId to generate the correct scope name', () => {
    const resultA = scopeCustomCss('p { color: red; }', 'abc123');
    const resultB = scopeCustomCss('p { color: red; }', 'xyz789');
    expect(resultA).toContain('#subpage-abc123 p');
    expect(resultB).toContain('#subpage-xyz789 p');
  });

  it('does not double-prefix when selector already starts with the scope', () => {
    const input = '#subpage-p1 p { color: red; }';
    const result = scopeCustomCss(input, 'p1');
    expect(result).not.toMatch(/#subpage-p1 #subpage-p1/);
  });

  it('handles multiple rules', () => {
    const input =
      'h1 { color: red; } p { margin: 0; } .note { font-size: 0.9em; }';
    const result = scopeCustomCss(input, 'page1');
    expect(result).toContain('#subpage-page1 h1');
    expect(result).toContain('#subpage-page1 p');
    expect(result).toContain('#subpage-page1 .note');
  });

  it('normalizes line endings before style injection for stable hydration', () => {
    const result = scopeCustomCss(
      'h1 {\r\n color: red;\r}\r\np { color: blue; }',
      'p1',
    );
    expect(result).not.toContain('\r');
    expect(result).toContain('\n');
  });

  describe('known limitations (documented)', () => {
    it.fails(
      ':is() pseudo-class — prefix is applied outside the function, not to each internal selector',
      () => {
        const result = scopeCustomCss(':is(h1, h2) { color: red; }', 'p1');
        // A fully correct implementation would prefix inside :is()
        expect(result).toContain(':is(#subpage-p1 h1, #subpage-p1 h2)');
      },
    );
  });
});

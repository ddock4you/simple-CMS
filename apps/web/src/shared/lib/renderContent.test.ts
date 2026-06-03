import { describe, expect, it } from 'vitest';

import { sanitizeCustomHtml } from './renderContent';

describe('sanitizeCustomHtml', () => {
  it('returns empty string for null', () => {
    expect(sanitizeCustomHtml(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(sanitizeCustomHtml(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(sanitizeCustomHtml('')).toBe('');
  });

  it('removes <script> tags and their content', () => {
    const result = sanitizeCustomHtml(
      '<p>Hello</p><script>alert("xss")</script>',
    );
    expect(result).not.toContain('<script');
    expect(result).toContain('Hello');
  });

  it('removes on* event handler attributes', () => {
    const result = sanitizeCustomHtml('<p onclick="alert()">Click me</p>');
    expect(result).not.toContain('onclick');
    expect(result).toContain('Click me');
  });

  it('removes onerror event handler on img', () => {
    const result = sanitizeCustomHtml(
      '<img src="x" onerror="alert()" alt="test">',
    );
    expect(result).not.toContain('onerror');
  });

  it('removes javascript: href', () => {
    const result = sanitizeCustomHtml(
      '<a href="javascript:alert()">Click</a>',
    );
    expect(result).not.toContain('javascript:');
  });

  it('allows semantic sectioning tags (section, article, aside)', () => {
    const result = sanitizeCustomHtml(
      '<section><article><aside>Content</aside></article></section>',
    );
    expect(result).toContain('<section>');
    expect(result).toContain('<article>');
    expect(result).toContain('<aside>');
  });

  it('allows nav, header, footer, main tags', () => {
    const result = sanitizeCustomHtml(
      '<header><nav><main>Content</main></nav></header><footer>Footer</footer>',
    );
    expect(result).toContain('<header>');
    expect(result).toContain('<nav>');
    expect(result).toContain('<main>');
    expect(result).toContain('<footer>');
  });

  it('allows figure and figcaption', () => {
    const result = sanitizeCustomHtml(
      '<figure><img src="test.jpg" alt="test"><figcaption>Caption</figcaption></figure>',
    );
    expect(result).toContain('<figure>');
    expect(result).toContain('<figcaption>');
  });

  it('allows details and summary', () => {
    const result = sanitizeCustomHtml(
      '<details><summary>Title</summary><p>Body</p></details>',
    );
    expect(result).toContain('<details>');
    expect(result).toContain('<summary>');
  });

  it('keeps iframe with an allowed YouTube embed host', () => {
    const result = sanitizeCustomHtml(
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" width="560" height="315"></iframe>',
    );
    expect(result).toContain('<iframe');
    expect(result).toContain('www.youtube.com');
  });

  it('keeps iframe with an allowed Vimeo host', () => {
    const result = sanitizeCustomHtml(
      '<iframe src="https://player.vimeo.com/video/123456789" width="640" height="360"></iframe>',
    );
    expect(result).toContain('<iframe');
    expect(result).toContain('player.vimeo.com');
  });

  it('keeps iframe with youtube.com (without www)', () => {
    const result = sanitizeCustomHtml(
      '<iframe src="https://youtube.com/embed/dQw4w9WgXcQ"></iframe>',
    );
    expect(result).toContain('<iframe');
  });

  it('keeps iframe with Google Maps embed path', () => {
    const result = sanitizeCustomHtml(
      '<iframe src="https://www.google.com/maps/embed?pb=test" width="600" height="450"></iframe>',
    );
    expect(result).toContain('<iframe');
  });

  it('removes iframe with non-map Google path', () => {
    const result = sanitizeCustomHtml(
      '<iframe src="https://www.google.com/search?q=test" width="600" height="450"></iframe>',
    );
    expect(result).not.toContain('<iframe');
  });

  it('removes iframe with a disallowed host', () => {
    const result = sanitizeCustomHtml(
      '<iframe src="https://evil.com/malicious" width="560" height="315"></iframe>',
    );
    expect(result).not.toContain('<iframe');
  });

  it('removes iframe without a src attribute', () => {
    const result = sanitizeCustomHtml(
      '<iframe width="560" height="315"></iframe>',
    );
    expect(result).not.toContain('<iframe');
  });

  it('passes safe HTML through without modification', () => {
    const input = '<p>Hello <strong>world</strong></p>';
    const result = sanitizeCustomHtml(input);
    expect(result).toContain('Hello');
    expect(result).toContain('<strong>world</strong>');
  });
});

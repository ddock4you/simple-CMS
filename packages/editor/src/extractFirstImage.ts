export interface TiptapImageReference {
  src: string;
  alt: string | null;
}

export function extractFirstImageFromTiptap(
  json: unknown,
): TiptapImageReference | null {
  let found: TiptapImageReference | null = null;

  const walk = (node: unknown) => {
    if (found || !node || typeof node !== 'object') return;

    const n = node as {
      type?: string;
      attrs?: { src?: unknown; alt?: unknown };
      content?: unknown[];
    };

    if (n.type === 'image' && typeof n.attrs?.src === 'string') {
      found = {
        src: n.attrs.src,
        alt: typeof n.attrs.alt === 'string' ? n.attrs.alt : null,
      };
      return;
    }

    if (Array.isArray(n.content)) {
      for (const child of n.content) {
        walk(child);
        if (found) return;
      }
    }
  };

  walk(json);
  return found;
}

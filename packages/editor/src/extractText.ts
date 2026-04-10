interface TiptapNode {
  type?: string;
  text?: string;
  content?: TiptapNode[];
}

export function extractTextFromTiptap(json: unknown): string {
  if (!json || typeof json !== 'object') return '';

  const node = json as TiptapNode;
  const parts: string[] = [];

  if (node.text) {
    parts.push(node.text);
  }

  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      const text = extractTextFromTiptap(child);
      if (text) parts.push(text);
    }
  }

  return parts.join(node.type === 'doc' ? '\n' : '');
}

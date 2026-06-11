export function summarizeContent(
  raw: string | null | undefined,
  max = 160,
): string | undefined {
  if (!raw) return undefined;

  const normalized = raw.replace(/\s+/g, ' ').trim();
  if (!normalized) return undefined;

  return normalized.length <= max
    ? normalized
    : `${normalized.slice(0, max)}…`;
}

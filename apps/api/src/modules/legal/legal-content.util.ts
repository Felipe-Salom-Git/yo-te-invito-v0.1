import { LEGAL_DOCUMENT_PLACEHOLDER_MARKDOWN } from '@yo-te-invito/shared';

const PLACEHOLDER_SNIPPETS = [
  'documento pendiente de revisión',
  'este documento debe ser completado',
  'debe ser completado y publicado desde el panel',
] as const;

export function parseLegalVersionNumber(version: string): number {
  const match = version.trim().match(/^v?(\d+)$/i);
  return match ? parseInt(match[1]!, 10) : 0;
}

export function formatLegalVersionNumber(n: number): string {
  return `v${n}`;
}

export function getNextLegalVersionLabel(existingVersions: string[]): string {
  let max = 0;
  for (const v of existingVersions) {
    max = Math.max(max, parseLegalVersionNumber(v));
  }
  return formatLegalVersionNumber(max + 1);
}

export function isLegalPlaceholderContent(contentMarkdown: string): boolean {
  const trimmed = contentMarkdown.trim();
  if (!trimmed) return true;
  if (trimmed === LEGAL_DOCUMENT_PLACEHOLDER_MARKDOWN.trim()) return true;
  const lower = trimmed.toLowerCase();
  return PLACEHOLDER_SNIPPETS.some((snippet) => lower.includes(snippet));
}

export function assertPublishableLegalContent(contentMarkdown: string): void {
  const trimmed = contentMarkdown.trim();
  if (trimmed.length < 20) {
    throw new Error('LEGAL_CONTENT_TOO_SHORT');
  }
  if (isLegalPlaceholderContent(trimmed)) {
    throw new Error('LEGAL_CONTENT_PLACEHOLDER');
  }
}

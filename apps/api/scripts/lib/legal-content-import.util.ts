import {
  getNextLegalVersionLabel,
  isLegalPlaceholderContent,
} from '../../src/modules/legal/legal-content.util';

export { isLegalPlaceholderContent };

export function extractTitleAndSummary(markdown: string): {
  title: string;
  summary: string | null;
} {
  const lines = markdown.split('\n');
  let title = '';
  let i = 0;

  for (; i < lines.length; i++) {
    const match = lines[i]?.match(/^#\s+(.+?)\s*$/);
    if (match) {
      title = match[1]!.trim();
      i++;
      break;
    }
  }

  if (!title) {
    title = 'Documento legal';
  }

  for (; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? '';
    if (!line) continue;
    if (line.startsWith('#')) break;
    if (/^\*\*[^*]+\*\*:?/.test(line)) continue;

    const paragraph: string[] = [];
    let j = i;
    for (; j < lines.length; j++) {
      const l = lines[j]?.trim() ?? '';
      if (!l) break;
      if (l.startsWith('#')) break;
      if (/^\*\*[^*]+\*\*:?/.test(l) && paragraph.length === 0) continue;
      paragraph.push(l);
    }
    if (paragraph.length > 0) {
      const summary = paragraph.join(' ').replace(/\s+/g, ' ').trim().slice(0, 500);
      return { title, summary: summary || null };
    }
    i = j;
  }

  return { title, summary: null };
}

export function resolveNextDraftVersion(existingVersions: string[]): string {
  return getNextLegalVersionLabel(existingVersions);
}

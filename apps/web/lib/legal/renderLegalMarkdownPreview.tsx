/**
 * Minimal safe Markdown preview (no HTML injection).
 */

/**
 * Rendered as React text children (no dangerouslySetInnerHTML).
 * HTML tags in source appear as literal text, not executed markup.
 */
function escapeText(text: string): string {
  return text;
}

type Block =
  | { type: 'h1' | 'h2' | 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'li'; text: string }
  | { type: 'blank' };

function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      blocks.push({ type: 'blank' });
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h3', text: trimmed.slice(4) });
    } else if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h2', text: trimmed.slice(3) });
    } else if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h1', text: trimmed.slice(2) });
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      blocks.push({ type: 'li', text: trimmed.slice(2) });
    } else {
      blocks.push({ type: 'p', text: trimmed });
    }
  }
  return blocks;
}

export function LegalMarkdownPreview({ markdown }: { markdown: string }) {
  const blocks = parseBlocks(markdown);
  if (!markdown.trim()) {
    return <p className="text-sm text-text-muted">Sin contenido para previsualizar.</p>;
  }

  return (
    <div className="space-y-2 text-sm leading-relaxed text-text">
      {blocks.map((block, i) => {
        if (block.type === 'blank') return <div key={i} className="h-2" />;
        if (block.type === 'h1') {
          return (
            <h1 key={i} className="text-xl font-bold text-text">
              {escapeText(block.text)}
            </h1>
          );
        }
        if (block.type === 'h2') {
          return (
            <h2 key={i} className="text-lg font-semibold text-text">
              {escapeText(block.text)}
            </h2>
          );
        }
        if (block.type === 'h3') {
          return (
            <h3 key={i} className="text-base font-semibold text-text">
              {escapeText(block.text)}
            </h3>
          );
        }
        if (block.type === 'li') {
          return (
            <p key={i} className="pl-4 text-text-muted before:content-['•_']">
              {escapeText(block.text)}
            </p>
          );
        }
        return (
          <p key={i} className="text-text-muted">
            {escapeText(block.text)}
          </p>
        );
      })}
    </div>
  );
}

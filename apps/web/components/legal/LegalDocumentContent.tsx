import { LegalMarkdownPreview } from '@/lib/legal/renderLegalMarkdownPreview';

type Props = {
  contentMarkdown: string;
};

export function LegalDocumentContent({ contentMarkdown }: Props) {
  return (
    <article className="prose-legal mt-8 rounded-xl border border-border/60 bg-bg-muted/20 p-6 sm:p-8">
      <LegalMarkdownPreview markdown={contentMarkdown} />
    </article>
  );
}

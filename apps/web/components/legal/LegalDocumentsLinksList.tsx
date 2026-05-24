import Link from 'next/link';
import type { MeLegalRequirementItem } from '@/repositories/interfaces';
import { formatPublicLegalDate } from '@/lib/legal/format-legal-date';

type Props = {
  items: MeLegalRequirementItem[];
  className?: string;
};

export function LegalDocumentsLinksList({ items, className = '' }: Props) {
  if (items.length === 0) return null;

  return (
    <ul className={`space-y-2 text-sm ${className}`}>
      {items.map((item) => (
        <li key={item.documentVersionId}>
          {item.publicPath ? (
            <Link
              href={item.publicPath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              {item.title}
            </Link>
          ) : (
            <span className="text-text">{item.title}</span>
          )}
          <span className="ml-2 text-xs text-text-muted">
            v{item.version} · {formatPublicLegalDate(item.publishedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

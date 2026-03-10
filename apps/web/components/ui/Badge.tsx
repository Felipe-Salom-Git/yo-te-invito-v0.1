import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'accent' | 'muted';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-border text-text',
  accent: 'bg-accent/20 text-accent border border-accent/40',
  muted: 'bg-bg-muted text-text-muted',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

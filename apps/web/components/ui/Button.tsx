import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-bg hover:bg-accent-hover border-transparent',
  secondary: 'bg-bg-muted text-text hover:bg-border border-border',
  ghost: 'bg-transparent text-text hover:bg-bg-muted border-transparent',
  outline: 'bg-transparent text-text border-border hover:border-accent hover:text-accent',
};

const sizes: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs leading-tight min-h-[1.75rem]',
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center rounded border font-medium
        transition-colors focus:outline-none focus:ring-2 focus:ring-accent-muted focus:ring-offset-2 focus:ring-offset-bg
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

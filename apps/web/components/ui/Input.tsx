import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** UI más baja (estudio de tickets y formularios densos). */
  density?: 'default' | 'dense';
  className?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, density = 'default', className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-');
    const errorId = error ? `${inputId}-error` : undefined;
    const dense = density === 'dense';
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={
              dense
                ? 'mb-1 block text-xs font-medium text-text'
                : 'mb-1.5 block text-sm font-medium text-text'
            }
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={errorId}
          className={`
            w-full rounded border bg-bg text-text placeholder:text-text-muted
            focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent
            disabled:cursor-not-allowed disabled:opacity-50
            border-border
            ${dense ? 'px-2 py-1 text-xs leading-tight min-h-[1.75rem]' : 'px-3 py-2'}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p id={errorId} className={`mt-1 text-red-500 ${dense ? 'text-xs' : 'text-sm'}`} role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

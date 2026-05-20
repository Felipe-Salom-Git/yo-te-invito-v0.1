import { SelectHTMLAttributes, ReactNode, forwardRef } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  density?: 'default' | 'dense';
  className?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, placeholder, error, density = 'default', className = '', id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s/g, '-');
    const dense = density === 'dense';
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className={
              dense
                ? 'mb-1 block text-xs font-medium text-text'
                : 'mb-1.5 block text-sm font-medium text-text'
            }
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`
            w-full rounded border bg-bg text-text
            focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent
            disabled:cursor-not-allowed disabled:opacity-50
            border-border
            ${dense ? 'px-2 py-1 text-xs leading-tight min-h-[1.75rem]' : 'px-3 py-2'}
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled hidden>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className={`mt-1 text-red-500 ${dense ? 'text-xs' : 'text-sm'}`}>{error}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

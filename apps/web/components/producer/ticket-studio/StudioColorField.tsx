'use client';

function normalizePickerHex(raw: string): string {
  const s = raw.trim();
  if (!s.startsWith('#')) return '#ffffff';
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(s)) {
    const r = s[1]!;
    const g = s[2]!;
    const b = s[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return '#ffffff';
}

function isHexColor(s: string): boolean {
  const t = s.trim();
  return /^#[0-9a-fA-F]{6}$/.test(t) || /^#[0-9a-fA-F]{3}$/.test(t);
}

type Props = {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  /** Menor altura (panel de propiedades del estudio). */
  compact?: boolean;
  className?: string;
};

/**
 * Color + hex aligned with dark portal: native picker + manual hex.
 */
export function StudioColorField({ label, value, onChange, compact = false, className = '' }: Props) {
  const trimmed = (value || '').trim();
  const picker = isHexColor(trimmed) ? normalizePickerHex(trimmed) : '#1a1a1a';

  return (
    <div className={`${compact ? 'space-y-1' : 'space-y-1.5'} ${className}`}>
      <span className={`block font-medium text-text ${compact ? 'text-xs' : 'text-sm'}`}>{label}</span>
      <div className={`flex flex-wrap items-center ${compact ? 'gap-2' : 'gap-3'}`}>
        <label
          className={`relative shrink-0 cursor-pointer overflow-hidden rounded-md border border-border shadow-sm ring-offset-2 ring-offset-bg focus-within:ring-2 focus-within:ring-accent ${
            compact ? 'h-7 w-7' : 'h-10 w-10'
          }`}
        >
          <input
            type="color"
            value={picker}
            onChange={(e) => onChange(e.target.value)}
            title={!isHexColor(trimmed) ? 'Valor actual no es hex; el selector aplica un color sólido nuevo' : undefined}
            className="absolute inset-0 h-[200%] w-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer border-0 p-0"
            aria-label={`${label} — selector`}
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#ffffff"
          aria-label={`${label} (hex)`}
          className={`min-w-0 flex-1 rounded border border-border bg-bg font-mono text-text placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${
            compact
              ? 'px-2 py-1 text-xs leading-tight min-h-[1.75rem]'
              : 'px-3 py-2 text-sm'
          }`}
        />
      </div>
    </div>
  );
}

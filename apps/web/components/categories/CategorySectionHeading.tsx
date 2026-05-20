/** Section title style aligned with Subcategorías rail on category landings. */
export const CATEGORY_SECTION_TITLE_CLASS =
  'text-lg font-black uppercase tracking-tight text-white sm:text-xl';

export const CATEGORY_SECTION_ACCENT_CLASS = 'mt-1.5 h-[3px] w-10 bg-accent';

export const CATEGORY_SECTION_SUBTITLE_CLASS = 'mt-1 text-sm text-white/60';

type CategorySectionHeadingProps = {
  title: string;
  subtitle?: string | null;
  className?: string;
};

export function CategorySectionHeading({ title, subtitle, className = '' }: CategorySectionHeadingProps) {
  return (
    <div className={className}>
      <h2 className={CATEGORY_SECTION_TITLE_CLASS}>{title}</h2>
      {subtitle ? <p className={CATEGORY_SECTION_SUBTITLE_CLASS}>{subtitle}</p> : null}
      <div className={CATEGORY_SECTION_ACCENT_CLASS} aria-hidden />
    </div>
  );
}

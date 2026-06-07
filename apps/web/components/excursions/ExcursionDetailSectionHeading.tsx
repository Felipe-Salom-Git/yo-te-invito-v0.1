type ExcursionDetailSectionHeadingProps = {
  title: string;
  id?: string;
};

/** Section title with green accent bar — excursion detail only. */
export function ExcursionDetailSectionHeading({ title, id }: ExcursionDetailSectionHeadingProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-6 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
      <h2 id={id} className="text-lg font-semibold text-white sm:text-xl">
        {title}
      </h2>
    </div>
  );
}

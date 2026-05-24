export type OnboardingChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href?: string;
};

export type OnboardingChecklistResult = {
  items: OnboardingChecklistItem[];
  doneCount: number;
  totalCount: number;
  percent: number;
  complete: boolean;
  title: string;
  subtitle: string;
  primaryCtaHref: string;
  primaryCtaLabel: string;
};

export function buildOnboardingChecklistResult(
  items: OnboardingChecklistItem[],
  meta: {
    title?: string;
    subtitle: string;
    primaryCtaHref: string;
    primaryCtaLabel: string;
  },
): OnboardingChecklistResult {
  const doneCount = items.filter((i) => i.done).length;
  const totalCount = items.length;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const complete = totalCount > 0 && doneCount === totalCount;
  const title =
    meta.title ??
    (complete ? 'Tu perfil está listo' : 'Tu perfil está casi listo');

  return {
    items,
    doneCount,
    totalCount,
    percent,
    complete,
    title,
    subtitle: meta.subtitle,
    primaryCtaHref: meta.primaryCtaHref,
    primaryCtaLabel: meta.primaryCtaLabel,
  };
}

import type { AdminUserListItem } from '@/repositories/interfaces';

type ProfileChip = {
  label: string;
  name: string;
};

function chipsFromUser(user: AdminUserListItem): ProfileChip[] {
  const chips: ProfileChip[] = [];
  if (user.producerProfile) {
    chips.push({ label: 'Productora', name: user.producerProfile.displayName });
  }
  if (user.gastroProfile) {
    chips.push({ label: 'Gastro', name: user.gastroProfile.displayName });
  }
  if (user.hotelProfile) {
    chips.push({ label: 'Hotel', name: user.hotelProfile.displayName });
  }
  if (user.referrerProfile) {
    chips.push({ label: 'Referidor', name: user.referrerProfile.displayName });
  }
  return chips;
}

export function AdminUserProfileBadges({ user }: { user: AdminUserListItem }) {
  const chips = chipsFromUser(user);
  if (chips.length === 0) {
    return <span className="text-xs text-text-muted">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={`${c.label}-${c.name}`}
          className="rounded border border-border/60 bg-bg px-1.5 py-0.5 text-[10px] text-text-muted"
          title={c.name}
        >
          {c.label}: {c.name}
        </span>
      ))}
    </div>
  );
}

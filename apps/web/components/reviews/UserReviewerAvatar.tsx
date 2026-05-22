'use client';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

type Props = {
  displayName: string;
  avatarUrl?: string | null;
  size?: 'md' | 'lg';
};

export function UserReviewerAvatar({
  displayName,
  avatarUrl,
  size = 'lg',
}: Props) {
  const sizeClass = size === 'lg' ? 'h-16 w-16 text-xl' : 'h-12 w-12 text-base';

  if (avatarUrl?.trim()) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={`${sizeClass} shrink-0 rounded-full border border-border object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-semibold text-accent`}
      aria-hidden
    >
      {initialsFromName(displayName)}
    </div>
  );
}

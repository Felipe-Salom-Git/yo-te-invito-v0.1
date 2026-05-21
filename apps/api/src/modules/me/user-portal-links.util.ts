/** Public web paths for favorites / activity links */
export function getContentDetailPath(
  category: string | null | undefined,
  eventId: string,
): string {
  const c = (category ?? 'event').toLowerCase();
  switch (c) {
    case 'gastro':
      return `/restaurants/${eventId}`;
    case 'excursion':
      return `/excursiones/${eventId}`;
    case 'rental':
      return `/rentals/${eventId}`;
    case 'hotel':
      return `/hoteles/${eventId}`;
    default:
      return `/events/${eventId}`;
  }
}

/** Public producer profile URL (slug preferred). */
export function getProducerPublicPath(producer: {
  id: string;
  slug?: string | null;
}): string {
  return `/producers/${producer.slug?.trim() || producer.id}`;
}

import {
  createOgShareImageResponse,
  OG_SHARE_ALT,
  OG_SHARE_CONTENT_TYPE,
  OG_SHARE_SIZE,
} from '@/lib/seo/ogShareImage';

export const runtime = 'nodejs';

export const alt = OG_SHARE_ALT;
export const size = OG_SHARE_SIZE;
export const contentType = OG_SHARE_CONTENT_TYPE;

export default createOgShareImageResponse;

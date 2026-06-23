/** Green smiley icon (RGBA) — favicon, PWA, JSON-LD icon. */
export const BRAND_FAVICON_SRC = '/brand/logo.png';

/** Full wordmark on black — source art for OG composition (not intro splash). */
export const BRAND_OG_SHARE_SRC = '/brand/logo_3.png';

export const BRAND_OG_SHARE_SIZE = { width: 1884, height: 1550 } as const;

/** Versioned 1200×630 share card — use in metadata to bust WhatsApp/social cache. */
export const BRAND_OG_SHARE_V2_SRC = '/brand/og-logo3-black-v2.png';

export const OG_SHARE_CARD_SIZE = { width: 1200, height: 630 } as const;

/** Intro / splash animation only — do not use for favicon or share previews. */
export const BRAND_SPLASH_SRC = '/brand/logo_2.png';

/** Default share image for pages without a custom cover. */
export const BRAND_OG_IMAGE_ROUTE = BRAND_OG_SHARE_V2_SRC;

/** Share image route for /home (same asset as site root). */
export const BRAND_OG_HOME_IMAGE_ROUTE = BRAND_OG_SHARE_V2_SRC;

export const OG_SHARE_METADATA = {
  url: BRAND_OG_SHARE_V2_SRC,
  width: OG_SHARE_CARD_SIZE.width,
  height: OG_SHARE_CARD_SIZE.height,
  alt: 'Yo Te Invito',
} as const;

/**
 * Share URL helpers — uses Web Share API when available, fallback to copy.
 */

export interface ShareOptions {
  title: string;
  url: string;
  text?: string;
}

export interface ShareResult {
  success: boolean;
  method: 'native' | 'copy' | 'unsupported';
  error?: string;
}

/**
 * Share content. Uses navigator.share when available; otherwise copies URL.
 * Requires user gesture (e.g. button click).
 */
export async function shareUrl(options: ShareOptions): Promise<ShareResult> {
  if (typeof window === 'undefined') {
    return { success: false, method: 'unsupported', error: 'Not in browser' };
  }

  const { title, url, text } = options;

  if (navigator.share) {
    try {
      await navigator.share({
        title,
        url,
        text: text ?? title,
      });
      return { success: true, method: 'native' };
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return { success: false, method: 'native', error: 'Cancelled' };
      }
      return {
        success: false,
        method: 'native',
        error: (err as Error).message,
      };
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return { success: true, method: 'copy' };
  } catch (err) {
    return {
      success: false,
      method: 'copy',
      error: (err as Error).message,
    };
  }
}

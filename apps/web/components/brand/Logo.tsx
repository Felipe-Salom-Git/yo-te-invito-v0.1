'use client';

import Image from 'next/image';

const LOGO_PATH = '/brand/logo.png';

export type LogoVariant = 'icon' | 'with-text' | 'navbar' | 'auth' | 'splash';

export interface LogoProps {
  /** Preset for common use cases; overrides width/height when set */
  variant?: LogoVariant;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
  /** Show "Yo Te Invito" text next to icon (for with-text, auth variants) */
  showText?: boolean;
}

const VARIANT_SIZES: Record<LogoVariant, { width: number; height: number }> = {
  icon: { width: 48, height: 48 },
  'with-text': { width: 140, height: 48 },
  navbar: { width: 320, height: 96 },
  auth: { width: 120, height: 40 },
  splash: { width: 96, height: 40 },
};

export function Logo({
  variant = 'navbar',
  width,
  height,
  className = '',
  priority = false,
  alt = 'Yo Te Invito',
  showText,
}: LogoProps) {
  const sizes = variant ? VARIANT_SIZES[variant] : { width: 120, height: 40 };
  const w = width ?? sizes.width;
  const h = height ?? sizes.height;
  const showLabel = showText ?? (variant === 'with-text' || variant === 'auth');

  const imgClasses =
    variant === 'splash'
      ? 'h-20 w-auto max-w-[80%] brightness-0 invert md:h-24'
      : variant === 'navbar'
        ? 'h-20 w-auto'
        : 'object-contain';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <Image
        src={LOGO_PATH}
        alt={alt}
        width={w}
        height={h}
        className={imgClasses}
        priority={priority}
      />
      {showLabel && (
        <span className="text-lg font-semibold text-text sm:text-xl">Yo Te Invito</span>
      )}
    </span>
  );
}

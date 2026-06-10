'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getContentDetailHref } from '@/lib/home/contentRoutes';
import {
  getContentCardPrimaryBadge,
  getContentCardPlaceholderEmoji,
  getContentPreviewDateLabel,
  getContentPreviewLocationLabel,
  getContentPreviewPrimaryCta,
  getContentPreviewShortDateLabel,
  isRentalContent,
} from '@/lib/home/contentCardPresentation';
import type { ContentCardItem } from './ContentCard';
import { ContentPreviewMeta } from './ContentPreviewMeta';
import { ContentPreviewActions } from './ContentPreviewActions';
import { ContentPreviewChips } from './ContentPreviewChips';
import { ContentTagChips } from '@/components/content-tags/ContentTagChips';
import { ContentPreviewExpanded } from './ContentPreviewExpanded';

export interface ContentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ContentCardItem | null;
  /** Similar/recommended items for the "Ver similares" section (same category) */
  similarItems?: ContentCardItem[];
  /** Called when user selects a similar item (updates preview in place) */
  onSelectItem?: (item: ContentCardItem) => void;
}

export function ContentPreviewModal({
  isOpen,
  onClose,
  item,
  similarItems = [],
  onSelectItem,
}: ContentPreviewModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (item) setIsExpanded(false);
  }, [item]);

  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        aria-modal="true"
        role="dialog"
        aria-labelledby={item ? 'preview-title' : undefined}
      >
        {/* Backdrop — dimmed, blurred */}
        <motion.div
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal panel */}
        <motion.div
          className={`relative z-10 mx-4 mb-0 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-bg-muted shadow-2xl transition-all duration-300 sm:mb-4 sm:max-h-[85vh] sm:rounded-2xl ${item && isExpanded ? 'max-w-5xl' : 'max-w-2xl'}`}
          initial={{ opacity: 0, scale: 0.97, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 16 }}
          transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
        >
          {item ? (
            <ContentPreviewContent
              item={item}
              onClose={onClose}
              onExpand={() => setIsExpanded(true)}
              isExpanded={isExpanded}
              similarItems={similarItems}
              onSelectItem={onSelectItem}
            />
          ) : (
            <div className="flex min-h-[200px] items-center justify-center p-8 text-text-muted">
              Sin contenido
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ContentPreviewContent({
  item,
  onClose,
  onExpand,
  isExpanded,
  similarItems,
  onSelectItem,
}: {
  item: ContentCardItem;
  onClose: () => void;
  onExpand: () => void;
  isExpanded: boolean;
  similarItems: ContentCardItem[];
  onSelectItem?: (item: ContentCardItem) => void;
}) {
  const detailHref = getContentDetailHref(item);
  const isRental = isRentalContent(item);
  const categoryLabel = getContentCardPrimaryBadge(item);
  const filteredSimilar = similarItems.filter((s) => s.id !== item.id);

  const dateLabel = getContentPreviewDateLabel(item);
  const locationLabel = getContentPreviewLocationLabel(item);

  const fromPrice =
    !isRental && item.fromPrice != null && Number(item.fromPrice) > 0
      ? Number(item.fromPrice)
      : null;
  const priceLabel = fromPrice != null ? `Desde $${fromPrice.toLocaleString('es-AR')}` : null;

  const shortDateLabel = getContentPreviewShortDateLabel(item);
  const primaryCtaLabel = getContentPreviewPrimaryCta(item.category);

  const hasMeta =
    dateLabel ||
    locationLabel ||
    (item.ratingAvg != null && item.ratingAvg > 0) ||
    (item.ratingCount != null && item.ratingCount > 0) ||
    priceLabel != null;

  return (
    <>
      {/* Close button — polished, softer weight */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-sm transition-all hover:bg-black/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent/80 focus:ring-offset-2 focus:ring-offset-transparent"
        aria-label="Cerrar"
      >
        <span className="text-lg leading-none">×</span>
      </button>

      {/* Hero — stronger gradient overlay, cinematic feel */}
      <div className="relative h-52 w-full overflow-hidden sm:h-60">
        {item.coverImageUrl ? (
          <motion.img
            src={item.coverImageUrl}
            alt=""
            className="h-full w-full object-cover object-center"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-900/50 via-bg-muted to-black">
            <span className="text-6xl opacity-50" aria-hidden>
              {getContentCardPlaceholderEmoji(item.category)}
            </span>
          </div>
        )}
        {/* Bottom gradient — stronger for text anchoring */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-bg-muted via-bg-muted/15 to-transparent"
          aria-hidden
        />
        {/* Side gradient */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent"
          aria-hidden
        />

        {/* Category badge */}
        {categoryLabel ? (
          <span className="absolute left-4 top-4 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            {categoryLabel}
          </span>
        ) : null}
      </div>

      {/* Main content — scrollable */}
      <div className="flex flex-1 flex-col overflow-y-auto p-5 sm:p-6">
        {/* Title */}
        <h2
          id="preview-title"
          className="text-xl font-bold leading-tight text-white sm:text-2xl"
        >
          {item.title}
        </h2>

        {/* Meta row — scannable */}
        {hasMeta && (
          <div className="mt-2.5">
            <ContentPreviewMeta
              dateLabel={dateLabel}
              locationLabel={locationLabel}
              ratingAvg={item.ratingAvg}
              ratingCount={item.ratingCount}
              priceLabel={priceLabel}
            />
          </div>
        )}

        {/* Description — line-clamp in base, full in expanded */}
        {item.description && (
          <p
            className={`mt-4 text-sm leading-relaxed text-white/90 ${
              isExpanded ? '' : 'line-clamp-3'
            }`}
          >
            {item.description}
          </p>
        )}

        {item.tags && item.tags.length > 0 ? (
          <ContentTagChips
            tags={item.tags}
            category={item.category}
            variant="dark"
            className="mt-4"
          />
        ) : null}

        {/* Producer / local */}
        {(isRental ? item.venueName : item.producerName || item.venueName) && (
          <p className="mt-2 text-sm text-white/70">
            {isRental
              ? [item.venueName, item.city].filter(Boolean).join(' · ')
              : [item.producerName, item.venueName].filter(Boolean).join(' · ')}
          </p>
        )}

        {/* CTA row */}
        <div className="mt-6">
          <ContentPreviewActions
            detailHref={detailHref}
            onClose={onClose}
            onExpand={onExpand}
            canExpand={filteredSimilar.length > 0}
            priceLabel={priceLabel}
            primaryCtaLabel={primaryCtaLabel}
          />
        </div>

        {/* Quick info chips */}
        <div className="mt-5">
          <ContentPreviewChips
            ratingCount={item.ratingCount}
            venueName={item.venueName}
            city={item.city}
            categoryLabel={categoryLabel}
            dateLabel={shortDateLabel}
            priceLabel={priceLabel}
          />
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <motion.div
            className="mt-6 border-t border-border pt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <ContentPreviewExpanded
              item={item}
              similarItems={similarItems}
              onSelectItem={onSelectItem}
            />
          </motion.div>
        )}
      </div>
    </>
  );
}

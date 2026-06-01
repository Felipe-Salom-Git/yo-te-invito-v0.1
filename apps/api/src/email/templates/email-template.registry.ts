import type { EmailTemplateId, RenderedEmailTemplate } from './email-template.types';
import { renderAdminCriticalAlert } from './templates/admin-critical-alert.template';
import { renderAuthVerifyEmail } from './templates/auth-verify-email.template';
import { renderAuthWelcomeBuyer } from './templates/auth-welcome-buyer.template';
import { renderAuthWelcomeGastro } from './templates/auth-welcome-gastro.template';
import { renderAuthWelcomeHotel } from './templates/auth-welcome-hotel.template';
import { renderAuthWelcomeProducer } from './templates/auth-welcome-producer.template';
import { renderAuthWelcomeReferrer } from './templates/auth-welcome-referrer.template';
import { renderProducerEventApproved } from './templates/producer-event-approved.template';
import { renderEventReminder24h } from './templates/event-reminder-24h.template';
import { renderProducerEventRejected } from './templates/producer-event-rejected.template';
import { renderTicketTransferAccepted } from './templates/ticket-transfer-accepted.template';
import { renderTicketTransferCancelled } from './templates/ticket-transfer-cancelled.template';
import { renderTicketTransferReceived } from './templates/ticket-transfer-received.template';
import { renderReviewDisputeAccepted } from './templates/review-dispute-accepted.template';
import { renderReviewDisputeCreated } from './templates/review-dispute-created.template';
import { renderReviewDisputeRejected } from './templates/review-dispute-rejected.template';
import { renderReviewModerationHidden } from './templates/review-moderation-hidden.template';
import { renderReviewModerationRestored } from './templates/review-moderation-restored.template';
import { renderReviewOfficialReply } from './templates/review-official-reply.template';
import { renderReviewReceived } from './templates/review-received.template';
import { renderTicketTransferRejected } from './templates/ticket-transfer-rejected.template';
import { renderReferralCommissionGenerated } from './templates/referral-commission-generated.template';
import { renderReferralPaymentMarkedAsPaid } from './templates/referral-payment-marked-as-paid.template';
import { renderReferralPaymentRequestCreated } from './templates/referral-payment-request-created.template';
import { renderReferralProducerAssociated } from './templates/referral-producer-associated.template';
import { renderReferralProposalAccepted } from './templates/referral-proposal-accepted.template';
import { renderReferralProposalReceived } from './templates/referral-proposal-received.template';
import { renderReferralProposalRejected } from './templates/referral-proposal-rejected.template';
import { renderExpectedEventSoon } from './templates/expected-event-soon.template';
import { renderFavoriteEventSoon } from './templates/favorite-event-soon.template';
import { renderFavoriteInterestNewContent } from './templates/favorite-interest-new-content.template';
import { renderFollowedGastroNewDiscount } from './templates/followed-gastro-new-discount.template';
import { renderFollowedProducerNewEvent } from './templates/followed-producer-new-event.template';
import { renderAdminEmailDeliveryFailed } from './templates/admin-email-delivery-failed.template';
import { renderAdminNewEventPending } from './templates/admin-new-event-pending.template';
import { renderAdminOperationalError } from './templates/admin-operational-error.template';
import { renderAdminScannerCriticalError } from './templates/admin-scanner-critical-error.template';
import { renderAdminStorageUploadFailed } from './templates/admin-storage-upload-failed.template';

export type EmailTemplateRenderer = (
  variables: Record<string, unknown>,
) => RenderedEmailTemplate;

const REGISTRY: Record<EmailTemplateId, EmailTemplateRenderer> = {
  AUTH_WELCOME_BUYER: renderAuthWelcomeBuyer,
  AUTH_WELCOME_PRODUCER: renderAuthWelcomeProducer,
  AUTH_WELCOME_GASTRO: renderAuthWelcomeGastro,
  AUTH_WELCOME_HOTEL: renderAuthWelcomeHotel,
  AUTH_WELCOME_REFERRER: renderAuthWelcomeReferrer,
  AUTH_VERIFY_EMAIL: renderAuthVerifyEmail,
  PRODUCER_EVENT_APPROVED: renderProducerEventApproved,
  PRODUCER_EVENT_REJECTED: renderProducerEventRejected,
  ADMIN_CRITICAL_ALERT: renderAdminCriticalAlert,
  TICKET_TRANSFER_RECEIVED: renderTicketTransferReceived,
  TICKET_TRANSFER_ACCEPTED: renderTicketTransferAccepted,
  TICKET_TRANSFER_REJECTED: renderTicketTransferRejected,
  TICKET_TRANSFER_CANCELLED: renderTicketTransferCancelled,
  EVENT_REMINDER_24H: renderEventReminder24h,
  REVIEW_RECEIVED: renderReviewReceived,
  REVIEW_OFFICIAL_REPLY: renderReviewOfficialReply,
  REVIEW_DISPUTE_CREATED: renderReviewDisputeCreated,
  REVIEW_DISPUTE_ACCEPTED: renderReviewDisputeAccepted,
  REVIEW_DISPUTE_REJECTED: renderReviewDisputeRejected,
  REVIEW_MODERATION_HIDDEN: renderReviewModerationHidden,
  REVIEW_MODERATION_RESTORED: renderReviewModerationRestored,
  REFERRAL_PRODUCER_ASSOCIATED: renderReferralProducerAssociated,
  REFERRAL_PROPOSAL_RECEIVED: renderReferralProposalReceived,
  REFERRAL_PROPOSAL_ACCEPTED: renderReferralProposalAccepted,
  REFERRAL_PROPOSAL_REJECTED: renderReferralProposalRejected,
  REFERRAL_COMMISSION_GENERATED: renderReferralCommissionGenerated,
  REFERRAL_PAYMENT_REQUEST_CREATED: renderReferralPaymentRequestCreated,
  REFERRAL_PAYMENT_MARKED_AS_PAID: renderReferralPaymentMarkedAsPaid,
  FAVORITE_EVENT_SOON: renderFavoriteEventSoon,
  EXPECTED_EVENT_SOON: renderExpectedEventSoon,
  FOLLOWED_PRODUCER_NEW_EVENT: renderFollowedProducerNewEvent,
  FAVORITE_INTEREST_NEW_CONTENT: renderFavoriteInterestNewContent,
  FOLLOWED_GASTRO_NEW_DISCOUNT: renderFollowedGastroNewDiscount,
  ADMIN_NEW_EVENT_PENDING: renderAdminNewEventPending,
  ADMIN_OPERATIONAL_ERROR: renderAdminOperationalError,
  ADMIN_EMAIL_DELIVERY_FAILED: renderAdminEmailDeliveryFailed,
  ADMIN_SCANNER_CRITICAL_ERROR: renderAdminScannerCriticalError,
  ADMIN_STORAGE_UPLOAD_FAILED: renderAdminStorageUploadFailed,
};

export function getEmailTemplateRenderer(
  templateId: EmailTemplateId,
): EmailTemplateRenderer {
  return REGISTRY[templateId];
}

export function listEmailTemplateIds(): EmailTemplateId[] {
  return Object.keys(REGISTRY) as EmailTemplateId[];
}

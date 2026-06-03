/**
 * Smoke: envío de un template piloto a un destinatario explícito.
 *
 * Requerido: SMOKE_EMAIL_TO, SMOKE_EMAIL_TEMPLATE_ID
 * Provider: MAIL_PROVIDER + SMTP_* o RESEND_API_KEY
 */
import {
  resolveMailFrom,
  resolveMailProviderKind,
  resolveMailReplyTo,
} from '../src/email/mail-config';
import { validateMailProviderEnv } from '../src/email/mail-config.validation';
import { createMailProvider } from '../src/email/providers/create-mail-provider';
import { renderEmailTemplate } from '../src/email/templates/email-template.renderer';
import {
  EMAIL_TEMPLATE_IDS,
  isEmailTemplateId,
  type EmailTemplateId,
} from '../src/email/templates/email-template.types';
import { getAppUrl } from '../src/email/templates/email-template.util';

function sampleVariables(templateId: EmailTemplateId): Record<string, unknown> {
  const appUrl = getAppUrl();
  switch (templateId) {
    case 'AUTH_WELCOME_BUYER':
      return {
        userName: 'Usuario de prueba',
        portalUrl: `${appUrl}/me`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'AUTH_WELCOME_PRODUCER':
      return {
        userName: 'Productora Demo',
        producerName: 'Productora Smoke',
        dashboardUrl: `${appUrl}/producer`,
        profileUrl: `${appUrl}/producer/profile`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'AUTH_WELCOME_GASTRO':
      return {
        userName: 'Gastro Demo',
        businessName: 'Local Smoke',
        dashboardUrl: `${appUrl}/gastro`,
        contentUrl: `${appUrl}/gastro/contenido`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'AUTH_WELCOME_HOTEL':
      return {
        userName: 'Hotel Demo',
        hotelName: 'Hotel Smoke',
        dashboardUrl: `${appUrl}/hotel`,
        profileUrl: `${appUrl}/hotel/editar`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'AUTH_WELCOME_REFERRER':
      return {
        userName: 'Referido Demo',
        referrerName: 'Referido Smoke',
        dashboardUrl: `${appUrl}/referrer`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'AUTH_VERIFY_EMAIL':
      return {
        userName: 'Usuario Demo',
        verifyUrl: `${appUrl}/verify-email?token=smoke-sample-token`,
        expiresIn: '24 horas',
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'PRODUCER_EVENT_APPROVED':
      return {
        producerName: 'Productora Demo',
        eventTitle: 'Evento Smoke Template',
        eventUrl: `${appUrl}/producer/events`,
        dashboardUrl: `${appUrl}/producer`,
        eventDate: '15/06/2026',
        eventTime: '21:00',
        venueName: 'Venue Demo',
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'PRODUCER_EVENT_REJECTED':
      return {
        producerName: 'Productora Demo',
        eventTitle: 'Evento Rechazado Smoke',
        rejectionReason: 'Falta información de ubicación en la ficha del evento.',
        eventEditUrl: `${appUrl}/producer/events/demo-event/edit`,
        dashboardUrl: `${appUrl}/producer`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'ADMIN_CRITICAL_ALERT':
      return {
        alertTitle: 'Smoke template — alerta de prueba',
        alertMessage: 'Este email fue generado por smoke:email-template.',
        severity: 'medium',
        occurredAt: new Date().toISOString(),
        context: 'templateId=ADMIN_CRITICAL_ALERT\nentorno=local',
        adminUrl: `${appUrl}/admin`,
      };
    case 'TICKET_TRANSFER_RECEIVED':
      return {
        recipientName: 'Receptor Demo',
        senderName: 'Emisor Demo',
        eventTitle: 'Evento Smoke Transfer',
        ticketName: 'General',
        eventDate: '15/06/2026',
        eventTime: '21:00',
        venueName: 'Venue Demo',
        transferUrl: `${appUrl}/me/ticket-transfer/smoke-token`,
        expiresAt: '18/06/2026, 21:00',
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'TICKET_TRANSFER_ACCEPTED':
      return {
        senderName: 'Emisor Demo',
        recipientName: 'Receptor Demo',
        eventTitle: 'Evento Smoke Transfer',
        ticketName: 'General',
        ticketsUrl: `${appUrl}/me/tickets`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'TICKET_TRANSFER_REJECTED':
      return {
        senderName: 'Emisor Demo',
        recipientName: 'Receptor Demo',
        eventTitle: 'Evento Smoke Transfer',
        ticketName: 'General',
        ticketsUrl: `${appUrl}/me/tickets`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'TICKET_TRANSFER_CANCELLED':
      return {
        recipientName: 'Receptor Demo',
        senderName: 'Emisor Demo',
        eventTitle: 'Evento Smoke Transfer',
        ticketName: 'General',
        ticketsUrl: `${appUrl}/me/tickets`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'EVENT_REMINDER_24H':
      return {
        userName: 'Usuario Demo',
        eventTitle: 'Evento Smoke Recordatorio',
        eventDate: '16/06/2026',
        eventTime: '21:00',
        venueName: 'Venue Demo',
        city: 'Buenos Aires',
        ticketUrl: `${appUrl}/me/tickets/demo-ticket`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'REVIEW_RECEIVED':
      return {
        recipientName: 'Productora Demo',
        reviewAuthorName: 'Usuario Demo',
        entityTitle: 'Evento Smoke Reviews',
        rating: '8',
        reviewText: 'Excelente experiencia, muy recomendable.',
        reviewsUrl: `${appUrl}/producer/comments`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'REVIEW_OFFICIAL_REPLY':
      return {
        userName: 'Usuario Demo',
        entityTitle: 'Evento Smoke Reviews',
        officialReply: 'Gracias por tu comentario. Nos alegra que hayas disfrutado.',
        reviewUrl: `${appUrl}/me/activity?tab=reviews`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'REVIEW_DISPUTE_CREATED':
      return {
        recipientName: 'Productora Demo',
        entityTitle: 'Evento Smoke Reviews',
        reason: 'La reseña contiene información que no corresponde al evento.',
        disputeUrl: `${appUrl}/producer/comments`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'REVIEW_DISPUTE_ACCEPTED':
      return {
        recipientName: 'Productora Demo',
        entityTitle: 'Evento Smoke Reviews',
        resolutionNote: 'Se verificó el contenido y se aplicó moderación según políticas.',
        reviewsUrl: `${appUrl}/producer/comments`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'REVIEW_DISPUTE_REJECTED':
      return {
        recipientName: 'Productora Demo',
        entityTitle: 'Evento Smoke Reviews',
        resolutionNote: 'No se encontraron motivos suficientes para ocultar la reseña.',
        reviewsUrl: `${appUrl}/producer/comments`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'REVIEW_MODERATION_HIDDEN':
      return {
        recipientName: 'Usuario Demo',
        entityTitle: 'Evento Smoke Reviews',
        moderationReason: 'Contenido reportado por incumplimiento de normas de convivencia.',
        reviewsUrl: `${appUrl}/me/activity?tab=reviews`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'REVIEW_MODERATION_RESTORED':
      return {
        recipientName: 'Usuario Demo',
        entityTitle: 'Evento Smoke Reviews',
        reviewsUrl: `${appUrl}/me/activity?tab=reviews`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'REFERRAL_PRODUCER_ASSOCIATED':
      return {
        referrerName: 'Referido Smoke',
        producerName: 'Productora Demo',
        producerUrl: `${appUrl}/producer/referrers`,
        referrerDashboardUrl: `${appUrl}/referrer`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'REFERRAL_PROPOSAL_RECEIVED':
      return {
        referrerName: 'Referido Smoke',
        producerName: 'Productora Demo',
        eventTitle: 'Evento Smoke Referidos',
        commissionType: 'Porcentaje',
        commissionValue: '10%',
        proposalUrl: `${appUrl}/referrer/eventos/demo-event`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'REFERRAL_PROPOSAL_ACCEPTED':
      return {
        producerName: 'Productora Demo',
        referrerName: 'Referido Smoke',
        eventTitle: 'Evento Smoke Referidos',
        agreementUrl: `${appUrl}/producer/referrals`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'REFERRAL_PROPOSAL_REJECTED':
      return {
        producerName: 'Productora Demo',
        referrerName: 'Referido Smoke',
        eventTitle: 'Evento Smoke Referidos',
        proposalUrl: `${appUrl}/producer/referrals`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'REFERRAL_COMMISSION_GENERATED':
      return {
        referrerName: 'Referido Smoke',
        producerName: 'Productora Demo',
        eventTitle: 'Evento Smoke Referidos',
        commissionAmount: '$ 1.500',
        currency: 'ARS',
        saleReference: 'orden-smoke-001',
        commissionUrl: `${appUrl}/referrer`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'REFERRAL_PAYMENT_REQUEST_CREATED':
      return {
        producerName: 'Productora Demo',
        referrerName: 'Referido Smoke',
        requestedAmount: '$ 3.000',
        currency: 'ARS',
        paymentRequestUrl: `${appUrl}/producer/referrals`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'REFERRAL_PAYMENT_MARKED_AS_PAID':
      return {
        referrerName: 'Referido Smoke',
        producerName: 'Productora Demo',
        paidAmount: '$ 3.000',
        currency: 'ARS',
        markedPaidAt: '1/6/2026, 14:30',
        paymentRequestUrl: `${appUrl}/referrer`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'FAVORITE_EVENT_SOON':
      return {
        userName: 'Usuario Demo',
        eventTitle: 'Evento Favorito Smoke',
        eventDate: '16/06/2026',
        eventTime: '21:00',
        venueName: 'Venue Demo',
        city: 'Buenos Aires',
        eventUrl: `${appUrl}/events/demo-event`,
        ticketsUrl: `${appUrl}/events/demo-event`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'EXPECTED_EVENT_SOON':
      return {
        userName: 'Usuario Demo',
        eventTitle: 'Evento Esperado Smoke',
        eventDate: '16/06/2026',
        eventTime: '21:00',
        venueName: 'Venue Demo',
        city: 'Córdoba',
        eventUrl: `${appUrl}/events/demo-expected`,
        ticketsUrl: `${appUrl}/events/demo-expected`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'FOLLOWED_PRODUCER_NEW_EVENT':
      return {
        userName: 'Usuario Demo',
        producerName: 'Productora Demo',
        eventTitle: 'Nuevo show en vivo',
        eventDate: '20/06/2026',
        city: 'Buenos Aires',
        eventUrl: `${appUrl}/events/demo-producer-event`,
        producerUrl: `${appUrl}/producers/demo-producer`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'FAVORITE_INTEREST_NEW_CONTENT':
      return {
        userName: 'Usuario Demo',
        contentTitle: 'Festival de verano',
        categoryName: 'eventos',
        subcategoryName: 'Música en vivo',
        city: 'Mar del Plata',
        contentUrl: `${appUrl}/events/demo-interest`,
        preferencesUrl: `${appUrl}/me/preferences`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'FOLLOWED_GASTRO_NEW_DISCOUNT':
      return {
        userName: 'Usuario Demo',
        gastroName: 'Local Smoke',
        discountTitle: '2x1 en cenas',
        discountValue: '50%',
        validUntil: '30/06/2026, 23:59',
        gastroUrl: `${appUrl}/descuentos/demo-discount`,
        preferencesUrl: `${appUrl}/me/preferences`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'ADMIN_NEW_EVENT_PENDING':
      return {
        eventTitle: 'Evento Smoke Admin',
        producerName: 'Productora Demo',
        categoryName: 'eventos',
        city: 'Buenos Aires',
        createdAt: new Date().toISOString(),
        adminEventUrl: `${appUrl}/admin/eventos/demo-event`,
        adminDashboardUrl: `${appUrl}/admin/eventos`,
        supportEmail: 'soporte@yoteinvito.club',
        operationsEmail: 'operaciones@yoteinvito.club',
      };
    case 'ADMIN_OPERATIONAL_ERROR':
      return {
        errorTitle: 'Smoke — error operativo',
        errorMessage: 'Este email fue generado por smoke:email-template.',
        severity: 'medium',
        moduleName: 'smoke',
        occurredAt: new Date().toISOString(),
        context: 'templateId=ADMIN_OPERATIONAL_ERROR',
        adminUrl: `${appUrl}/admin`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'ADMIN_EMAIL_DELIVERY_FAILED':
      return {
        templateId: 'AUTH_VERIFY_EMAIL',
        recipient: 'usuario@example.com',
        provider: 'smtp',
        errorCode: 'SEND_FAILED',
        errorMessage: 'Connection timeout (smoke sample)',
        occurredAt: new Date().toISOString(),
        context: 'entorno=local',
        adminUrl: `${appUrl}/admin`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'ADMIN_SCANNER_CRITICAL_ERROR':
      return {
        scannerLocation: 'Puerta principal',
        eventTitle: 'Evento Smoke Scanner',
        errorMessage: 'Fallo de persistencia al registrar scan (smoke).',
        occurredAt: new Date().toISOString(),
        context: 'deviceId=smoke-device',
        adminUrl: `${appUrl}/admin/auditoria`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    case 'ADMIN_STORAGE_UPLOAD_FAILED':
      return {
        entityType: 'producer_profile',
        entityId: 'demo-profile',
        uploaderEmail: 'productor@example.com',
        fileName: 'cover.jpg',
        errorMessage: 'GCS upload failed (smoke sample)',
        occurredAt: new Date().toISOString(),
        context: 'scope=producer_profile',
        adminUrl: `${appUrl}/admin`,
        supportEmail: 'soporte@yoteinvito.club',
      };
    default:
      return {};
  }
}

async function main(): Promise<number> {
  const to = process.env.SMOKE_EMAIL_TO?.trim();
  const templateRaw = process.env.SMOKE_EMAIL_TEMPLATE_ID?.trim();

  if (!to) {
    console.error('\n[smoke:email-template] SMOKE_EMAIL_TO is required.\n');
    return 1;
  }

  if (!templateRaw || !isEmailTemplateId(templateRaw)) {
    console.error(
      `[smoke:email-template] SMOKE_EMAIL_TEMPLATE_ID must be one of: ${EMAIL_TEMPLATE_IDS.join(', ')}`,
    );
    return 1;
  }

  let providerKind: string;
  try {
    providerKind = resolveMailProviderKind();
  } catch (err) {
    console.error('[smoke:email-template]', err instanceof Error ? err.message : err);
    return 1;
  }

  const missing = validateMailProviderEnv();
  if (missing.length > 0) {
    console.error(
      `[smoke:email-template] Missing env for MAIL_PROVIDER=${providerKind}: ${missing.join(', ')}`,
    );
    return 1;
  }

  const provider = createMailProvider();
  if (!provider.isConfigured()) {
    console.error(`[smoke:email-template] Provider "${provider.name}" is not configured.`);
    return 1;
  }

  const variables = sampleVariables(templateRaw);
  const rendered = renderEmailTemplate({ templateId: templateRaw, variables });

  console.log(
    `[smoke:email-template] provider=${provider.name} template=${templateRaw} to=${to} subject="${rendered.subject}"`,
  );

  const result = await provider.send({
    to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    from: resolveMailFrom(),
    replyTo: resolveMailReplyTo(),
  });

  if (!result.ok) {
    console.error(`[smoke:email-template] Send failed: ${result.errorCode}`);
    return 1;
  }

  console.log(
    `[smoke:email-template] OK${result.providerMessageId ? ` messageId=${result.providerMessageId}` : ''}`,
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('[smoke:email-template]', err);
    process.exit(1);
  });

import { Injectable, Logger } from '@nestjs/common';
import { NotificationKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  readPortalPreferences,
  shouldSendPushForKind,
} from '../me/user-portal-preferences.util';
import { getAppUrl, getDefaultSupportEmail } from '../../email/templates/email-template.util';
import { UserNotificationsService } from './user-notifications.service';
import {
  gastroDiscountNotificationReferenceKey,
  gastroProfileNotificationReferenceKey,
  notificationKindForDiscountEvent,
  notificationKindForProfileEvent,
  shouldSendGastroLifecycleEmail,
  uniqueActiveMembershipUserIds,
  type GastroDiscountNotifyAspect,
} from './gastro-lifecycle-notification-keys';

@Injectable()
export class GastroLifecycleNotificationsService {
  private readonly logger = new Logger(GastroLifecycleNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: UserNotificationsService,
  ) {}

  notifyDiscountPending(
    tenantId: string,
    discountId: string,
    title: string,
    aspect: GastroDiscountNotifyAspect,
  ): void {
    void this.dispatchDiscount(tenantId, discountId, title, 'pending', aspect).catch((err) => {
      this.logger.error(`notifyDiscountPending failed discount=${discountId}`, err);
    });
  }

  notifyDiscountApproved(
    tenantId: string,
    discountId: string,
    title: string,
    aspect: GastroDiscountNotifyAspect,
  ): void {
    void this.dispatchDiscount(tenantId, discountId, title, 'approved', aspect).catch((err) => {
      this.logger.error(`notifyDiscountApproved failed discount=${discountId}`, err);
    });
  }

  notifyDiscountRejected(
    tenantId: string,
    discountId: string,
    title: string,
    aspect: GastroDiscountNotifyAspect,
    reason?: string,
  ): void {
    void this.dispatchDiscount(
      tenantId,
      discountId,
      title,
      'rejected',
      aspect,
      reason,
    ).catch((err) => {
      this.logger.error(`notifyDiscountRejected failed discount=${discountId}`, err);
    });
  }

  notifyDiscountExpired(tenantId: string, discountId: string, title: string): void {
    void this.dispatchDiscount(tenantId, discountId, title, 'expired', 'create').catch((err) => {
      this.logger.error(`notifyDiscountExpired failed discount=${discountId}`, err);
    });
  }

  notifyProfileApproved(tenantId: string, profileId: string, displayName: string): void {
    void this.dispatchProfile(tenantId, profileId, displayName, 'approved').catch((err) => {
      this.logger.error(`notifyProfileApproved failed profile=${profileId}`, err);
    });
  }

  notifyProfileRejected(
    tenantId: string,
    profileId: string,
    displayName: string,
    reason?: string,
  ): void {
    void this.dispatchProfile(tenantId, profileId, displayName, 'rejected', reason).catch(
      (err) => {
        this.logger.error(`notifyProfileRejected failed profile=${profileId}`, err);
      },
    );
  }

  private copyForDiscount(
    event: 'pending' | 'approved' | 'rejected' | 'expired',
    title: string,
    aspect: GastroDiscountNotifyAspect,
    reason?: string,
  ): { title: string; body: string } {
    const name = title.trim() || 'tu descuento';
    if (event === 'pending') {
      return aspect === 'edit'
        ? {
            title: 'Edición enviada a revisión',
            body: `Los cambios de «${name}» están en revisión. La versión publicada sigue activa.`,
          }
        : {
            title: 'Descuento enviado a revisión',
            body: `«${name}» fue enviado a revisión. Te avisamos cuando administración lo apruebe o rechace.`,
          };
    }
    if (event === 'approved') {
      return aspect === 'edit'
        ? {
            title: 'Edición de descuento aprobada',
            body: `Los cambios de «${name}» ya están publicados.`,
          }
        : {
            title: 'Descuento aprobado',
            body: `«${name}» fue aprobado y ya puede mostrarse y canjearse.`,
          };
    }
    if (event === 'rejected') {
      const extra = reason?.trim() ? ` Motivo: ${reason.trim()}` : '';
      return aspect === 'edit'
        ? {
            title: 'Edición de descuento rechazada',
            body: `Los cambios de «${name}» fueron rechazados. Sigue publicada la versión anterior.${extra}`,
          }
        : {
            title: 'Descuento rechazado',
            body: `«${name}» fue rechazado.${extra}`,
          };
    }
    return {
      title: 'Descuento vencido',
      body: `«${name}» venció. Queda en tu historial; no se borran claims ni métricas.`,
    };
  }

  private async dispatchDiscount(
    tenantId: string,
    discountId: string,
    discountTitle: string,
    event: 'pending' | 'approved' | 'rejected' | 'expired',
    aspect: GastroDiscountNotifyAspect,
    reason?: string,
  ): Promise<void> {
    const discount = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId },
      select: { gastroProfileId: true, displayTitle: true },
    });
    if (!discount?.gastroProfileId) return;
    const copy = this.copyForDiscount(
      event,
      discountTitle || discount.displayTitle || 'tu descuento',
      aspect,
      reason,
    );
    const kind = notificationKindForDiscountEvent(event);
    const referenceKey = gastroDiscountNotificationReferenceKey(event, discountId, aspect);
    const href = `/gastro/descuentos/${discountId}`;
    await this.deliverToProfileMembers({
      tenantId,
      profileId: discount.gastroProfileId,
      kind,
      referenceKey,
      title: copy.title,
      body: copy.body,
      href,
    });
  }

  private async dispatchProfile(
    tenantId: string,
    profileId: string,
    displayName: string,
    status: 'approved' | 'rejected',
    reason?: string,
  ): Promise<void> {
    const name = displayName.trim() || 'tu local';
    const kind = notificationKindForProfileEvent(status);
    const referenceKey = gastroProfileNotificationReferenceKey(status, profileId);
    const copy =
      status === 'approved'
        ? {
            title: 'Local gastronómico aprobado',
            body: `«${name}» fue aprobado y ya puede publicarse.`,
          }
        : {
            title: 'Local gastronómico rechazado',
            body: `«${name}» fue rechazado.${reason?.trim() ? ` Motivo: ${reason.trim()}` : ''}`,
          };
    await this.deliverToProfileMembers({
      tenantId,
      profileId,
      kind,
      referenceKey,
      title: copy.title,
      body: copy.body,
      href: `/gastro/local?profileId=${encodeURIComponent(profileId)}`,
    });
  }

  private async deliverToProfileMembers(input: {
    tenantId: string;
    profileId: string;
    kind: NotificationKind;
    referenceKey: string;
    title: string;
    body: string;
    href: string;
  }): Promise<void> {
    const memberships = await this.prisma.userGastroMembership.findMany({
      where: { tenantId: input.tenantId, profileId: input.profileId, status: 'ACTIVE' },
      select: { userId: true, profileId: true, status: true },
    });
    const userIds = uniqueActiveMembershipUserIds(memberships, input.profileId);
    const appUrl = getAppUrl();

    for (const userId of userIds) {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, tenantId: input.tenantId, deletedAt: null },
        select: { email: true, preferences: true, firstName: true, lastName: true },
      });
      if (!user) continue;
      const prefs = readPortalPreferences(userId, user.preferences);
      const email = user.email?.trim() || null;
      const sendEmail = shouldSendGastroLifecycleEmail(email, prefs.emailNotificationsEnabled);
      const sendPush = shouldSendPushForKind(prefs, input.kind);
      const recipientName =
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Hola';

      await this.notifications.deliver({
        tenantId: input.tenantId,
        userId,
        userEmail: email,
        kind: input.kind,
        referenceKey: input.referenceKey,
        title: input.title,
        body: input.body,
        href: input.href,
        sendInApp: true,
        sendEmail,
        sendPush,
        preferences: prefs,
        ...(sendEmail
          ? {
              emailTemplateId: 'GASTRO_LIFECYCLE',
              emailTemplateVariables: {
                recipientName,
                subject: input.title,
                previewText: input.body,
                body: input.body,
                ctaLabel: 'Ver en el portal',
                ctaUrl: `${appUrl}${input.href}`,
                supportEmail: getDefaultSupportEmail(),
              },
            }
          : {}),
      });
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { NotificationKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  readPortalPreferences,
  shouldSendPushForKind,
} from '../me/user-portal-preferences.util';
import { getAppUrl, getDefaultSupportEmail } from '../../email/templates/email-template.util';
import { isCourtesyOnlyVisibility } from '@yo-te-invito/shared';
import { UserNotificationsService } from './user-notifications.service';
import {
  buildDiscountLifecycleContent,
  type DiscountLifecycleEvent,
  type LifecycleAgreement,
  type LifecycleDetail,
} from './gastro-lifecycle-email-content';
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

  /**
   * `opts.agreement` is the CURRENT BenefitCommercialAgreement resolved by the caller at
   * approval time (G8.8). It is only rendered in the email; never persisted on the discount.
   */
  notifyDiscountApproved(
    tenantId: string,
    discountId: string,
    title: string,
    aspect: GastroDiscountNotifyAspect,
    opts?: { agreement?: LifecycleAgreement | null },
  ): void {
    void this.dispatchDiscount(
      tenantId,
      discountId,
      title,
      'approved',
      aspect,
      undefined,
      opts?.agreement ?? null,
    ).catch((err) => {
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

  private async dispatchDiscount(
    tenantId: string,
    discountId: string,
    discountTitle: string,
    event: DiscountLifecycleEvent,
    aspect: GastroDiscountNotifyAspect,
    reason?: string,
    agreement?: LifecycleAgreement | null,
  ): Promise<void> {
    const discount = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId },
      include: {
        courtesyCampaign: true,
        gastroProfile: { select: { displayName: true } },
      },
    });
    if (!discount?.gastroProfileId) return;
    const isCourtesy = isCourtesyOnlyVisibility(discount.visibility);
    const recipientCount = isCourtesy
      ? await this.prisma.gastroDiscountClaim.count({
          where: { tenantId, discountId, type: 'COURTESY' },
        })
      : null;
    const title =
      discountTitle ||
      discount.courtesyCampaign?.title ||
      discount.displayTitle ||
      (isCourtesy ? 'tu cortesía' : 'tu descuento');
    const content = buildDiscountLifecycleContent({
      event,
      aspect,
      isCourtesy,
      title,
      localName: discount.gastroProfile?.displayName ?? null,
      courtesyLabel: discount.courtesyCampaign?.discountLabel ?? null,
      discountType: discount.type === 'FIXED' ? 'FIXED' : 'PERCENT',
      discountValue: discount.value != null ? Number(discount.value) : null,
      recipientCount,
      validityMode: discount.validityMode,
      validWeekday: discount.validWeekday,
      validFrom: discount.courtesyCampaign?.validFrom ?? discount.validFrom,
      validTo: discount.courtesyCampaign?.validTo ?? discount.validTo,
      discountDate: discount.discountDate,
      // Only an already-persisted reason; never invented.
      reason: reason ?? discount.rejectionReason ?? null,
      agreement,
    });
    const kind = notificationKindForDiscountEvent(event);
    const referenceKey = gastroDiscountNotificationReferenceKey(event, discountId, aspect);
    const href = `/gastro/descuentos/${discountId}`;
    await this.deliverToProfileMembers({
      tenantId,
      profileId: discount.gastroProfileId,
      kind,
      referenceKey,
      title: content.title,
      body: content.body,
      href,
      details: content.details,
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
    details?: LifecycleDetail[];
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
                details: input.details ?? [],
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

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateProducerProfileInput } from '@yo-te-invito/shared';

@Injectable()
export class ProducerProfileService {
    constructor(private readonly prisma: PrismaService) { }

    async getMyProfile(tenantId: string, userId: string) {
        // Find the active profile membership for the user
        const membership = await this.prisma.userProducerMembership.findFirst({
            where: {
                tenantId,
                userId,
                status: 'ACTIVE',
                profile: { status: { in: ['ACTIVE', 'PENDING'] } },
            },
            include: {
                profile: true,
            },
        });

        if (!membership) {
            throw new NotFoundException('No active producer profile found for this user');
        }

        return membership.profile;
    }

    async updateMyProfile(tenantId: string, userId: string, data: UpdateProducerProfileInput) {
        const membership = await this.prisma.userProducerMembership.findFirst({
            where: {
                tenantId,
                userId,
                status: 'ACTIVE',
                profile: { status: { in: ['ACTIVE', 'PENDING'] } },
            },
        });

        if (!membership) {
            throw new NotFoundException('No active producer profile found for this user');
        }

        // Prisma update
        return this.prisma.producerProfile.update({
            where: { id: membership.profileId },
            data: {
                slug: data.slug,
                displayName: data.displayName,
                legalName: data.legalName,
                shortDescription: data.shortDescription,
                longDescription: data.longDescription,
                logoUrl: data.logoUrl,
                coverImageUrl: data.coverImageUrl,
                primaryPhone: data.primaryPhone,
                secondaryPhone: data.secondaryPhone,
                primaryEmail: data.primaryEmail,
                secondaryEmail: data.secondaryEmail,
                whatsapp: data.whatsapp,
                city: data.city,
                country: data.country,
                socialLinks: data.socialLinks ? (data.socialLinks as any) : undefined,
            },
        });
    }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPending(tenantId: string) {
    const apps = await this.prisma.roleApplication.findMany({
      where: { tenantId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    return apps.map((a) => ({
      id: a.id,
      email: a.email,
      firstName: a.firstName,
      lastName: a.lastName,
      phone: a.phone,
      businessName: a.businessName,
      role: a.role,
      createdAt: a.createdAt,
    }));
  }

  async approve(tenantId: string, applicationId: string, adminUserId: string) {
    const app = await this.prisma.roleApplication.findFirst({
      where: { id: applicationId, tenantId, status: 'PENDING' },
    });
    if (!app) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Application not found or already processed',
      });
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { tenantId, email: app.email, deletedAt: null },
    });

    let user;
    if (existingUser) {
      if (
        existingUser.role === 'PRODUCER_OWNER' ||
        existingUser.role === 'GASTRO_OWNER'
      ) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: 'User already has this role',
        });
      }
      user = await this.prisma.user.update({
        where: { id: existingUser.id },
        data: { role: app.role },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          tenantId,
          email: app.email,
          passwordHash: app.passwordHash,
          firstName: app.firstName,
          lastName: app.lastName,
          phone: app.phone,
          role: app.role,
          status: 'ACTIVE',
        },
      });
    }

    await this.prisma.roleApplication.update({
      where: { id: applicationId },
      data: { status: 'APPROVED', reviewedAt: new Date(), reviewedByUserId: adminUserId },
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      message: 'Application approved',
    };
  }

  async reject(tenantId: string, applicationId: string, adminUserId: string) {
    const app = await this.prisma.roleApplication.findFirst({
      where: { id: applicationId, tenantId, status: 'PENDING' },
    });
    if (!app) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Application not found or already processed',
      });
    }

    await this.prisma.roleApplication.update({
      where: { id: applicationId },
      data: { status: 'REJECTED', reviewedAt: new Date(), reviewedByUserId: adminUserId },
    });

    return { message: 'Application rejected' };
  }
}

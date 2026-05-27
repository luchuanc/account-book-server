import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../shared/prisma.service';
import { ApiException } from '../../shared/api-exception';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  create(bookId: string, createdById: string, dto: CreateInvitationDto) {
    const expiresAt = new Date(Date.now() + (dto.expiresInHours ?? 72) * 60 * 60 * 1000);
    return this.prisma.invitation.create({
      data: {
        bookId,
        createdById,
        role: dto.role,
        code: randomBytes(4).toString('hex'),
        expiresAt,
      },
    });
  }

  async detail(code: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { code },
      include: {
        book: true,
        createdBy: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
    });
    if (!invitation) {
      throw new ApiException('邀请不存在', 404);
    }
    return invitation;
  }

  async accept(code: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { code },
    });
    if (!invitation) {
      throw new ApiException('邀请不存在', 404);
    }
    if (invitation.status !== 'pending') {
      throw new ApiException('邀请已失效', 400);
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      throw new ApiException('邀请已过期', 400);
    }

    await this.prisma.bookMember.upsert({
      where: {
        bookId_userId: {
          bookId: invitation.bookId,
          userId,
        },
      },
      create: {
        bookId: invitation.bookId,
        userId,
        role: invitation.role,
      },
      update: {
        role: invitation.role,
      },
    });

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'accepted',
        acceptedById: userId,
      },
    });

    return {
      success: true,
      bookId: invitation.bookId,
    };
  }

  async reject(code: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { code },
    });
    if (!invitation) {
      throw new ApiException('邀请不存在', 404);
    }
    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'rejected' },
    });
    return { success: true };
  }
}

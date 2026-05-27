import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  findByBook(bookId: string) {
    return this.prisma.bookMember.findMany({
      where: { bookId },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            nickname: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });
  }

  update(bookId: string, memberId: string, dto: UpdateMemberDto) {
    return this.prisma.bookMember.update({
      where: { id: memberId, bookId },
      data: { role: dto.role },
      include: {
        user: true,
      },
    });
  }

  async remove(memberId: string) {
    await this.prisma.bookMember.delete({
      where: { id: memberId },
    });
    return { success: true };
  }
}

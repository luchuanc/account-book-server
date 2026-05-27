import { Injectable } from '@nestjs/common';
import { BookRole, Prisma } from '@prisma/client';
import { ApiException } from './api-exception';
import { PrismaService } from './prisma.service';

const bookMemberInclude = {
  members: {
    include: {
      user: true,
    },
  },
} satisfies Prisma.BookInclude;

@Injectable()
export class BookAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccessibleBook(bookId: string, userId: string) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: bookMemberInclude,
    });

    if (!book) {
      throw new ApiException('账本不存在', 404);
    }

    const member = book.members.find((item) => item.userId === userId);
    if (!member) {
      throw new ApiException('你暂无权限访问这个账本', 403);
    }

    return {
      book,
      membership: member,
    };
  }

  ensureRole(role: BookRole, allowed: BookRole[]) {
    if (!allowed.includes(role)) {
      throw new ApiException('你暂无权限执行该操作', 403);
    }
  }
}

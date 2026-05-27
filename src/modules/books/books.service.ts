import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '../../shared/constants';
import { PrismaService } from '../../shared/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

const bookInclude = {
  members: {
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
  },
} satisfies Prisma.BookInclude;

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBookDto) {
    const book = await this.prisma.book.create({
      data: {
        name: dto.name,
        icon: dto.icon,
        color: dto.color,
        description: dto.description,
        ownerUserId: userId,
        members: {
          create: {
            userId,
            role: 'owner',
          },
        },
        categories: {
          create: [
            ...DEFAULT_EXPENSE_CATEGORIES.map((item, index) => ({
              ...item,
              type: 'expense' as const,
              sortOrder: index,
              isSystem: true,
            })),
            ...DEFAULT_INCOME_CATEGORIES.map((item, index) => ({
              ...item,
              type: 'income' as const,
              sortOrder: index,
              isSystem: true,
            })),
          ],
        },
      },
      include: bookInclude,
    });

    return this.serializeBook(book);
  }

  async findMine(userId: string) {
    const books = await this.prisma.book.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: true,
        transactions: {
          where: {
            type: 'expense',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return books.map((book) => {
      const role = book.members.find((item) => item.userId === userId)?.role ?? 'viewer';
      const monthlyExpense = book.transactions.reduce((sum, item) => sum + item.amount, 0);
      return {
        id: book.id,
        name: book.name,
        icon: book.icon,
        color: book.color,
        description: book.description,
        role,
        memberCount: book.members.length,
        monthlyExpense,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
      };
    });
  }

  async findOne(bookId: string, userId: string) {
    const book = await this.prisma.book.findFirst({
      where: {
        id: bookId,
        members: {
          some: { userId },
        },
      },
      include: bookInclude,
    });
    return book ? this.serializeBook(book, userId) : null;
  }

  async update(bookId: string, dto: UpdateBookDto) {
    const book = await this.prisma.book.update({
      where: { id: bookId },
      data: dto,
      include: bookInclude,
    });
    return this.serializeBook(book);
  }

  async remove(bookId: string) {
    await this.prisma.book.delete({
      where: { id: bookId },
    });
    return { success: true };
  }

  private serializeBook(book: Prisma.BookGetPayload<{ include: typeof bookInclude }>, currentUserId?: string) {
    const currentRole =
      currentUserId ? book.members.find((item) => item.userId === currentUserId)?.role : undefined;
    return {
      id: book.id,
      name: book.name,
      icon: book.icon,
      color: book.color,
      description: book.description,
      ownerUserId: book.ownerUserId,
      role: currentRole,
      memberCount: book.members.length,
      members: book.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        role: member.role,
        nickname: member.nickname ?? member.user.nickname,
        joinedAt: member.joinedAt,
        user: member.user,
      })),
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  }
}

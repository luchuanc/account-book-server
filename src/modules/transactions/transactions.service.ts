import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ApiException } from '../../shared/api-exception';
import { PrismaService } from '../../shared/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

const transactionInclude = {
  category: true,
  creator: {
    select: { id: true, nickname: true },
  },
  recorder: {
    select: { id: true, nickname: true },
  },
} satisfies Prisma.TransactionInclude;

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(bookId: string, userId: string, dto: CreateTransactionDto) {
    const recorderUserId = dto.recorderUserId ?? userId;
    return this.prisma.transaction.create({
      data: {
        bookId,
        type: dto.type,
        amount: dto.amount,
        categoryId: dto.categoryId,
        title: dto.title,
        note: dto.note,
        transactionDate: new Date(dto.transactionDate),
        creatorUserId: userId,
        recorderUserId,
        paymentAccount: dto.paymentAccount,
      },
      include: transactionInclude,
    });
  }

  async findAll(bookId: string, query: TransactionQueryDto) {
    const where: Prisma.TransactionWhereInput = {
      bookId,
      type: query.type,
      categoryId: query.categoryId,
      recorderUserId: query.recorderUserId,
      transactionDate:
        query.startDate || query.endDate
          ? {
              gte: query.startDate ? new Date(query.startDate) : undefined,
              lte: query.endDate ? new Date(query.endDate) : undefined,
            }
          : undefined,
      OR: query.keyword
        ? [
            { title: { contains: query.keyword, mode: 'insensitive' } },
            { note: { contains: query.keyword, mode: 'insensitive' } },
          ]
        : undefined,
    };

    const [list, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: transactionInclude,
        orderBy: {
          transactionDate: 'desc',
        },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      list,
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async findOne(bookId: string, transactionId: string) {
    const item = await this.prisma.transaction.findFirst({
      where: { id: transactionId, bookId },
      include: transactionInclude,
    });
    if (!item) {
      throw new ApiException('流水不存在', 404);
    }
    return item;
  }

  async update(bookId: string, transactionId: string, dto: UpdateTransactionDto) {
    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...dto,
        transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : undefined,
      },
      include: transactionInclude,
    });
  }

  async remove(bookId: string, transactionId: string) {
    await this.prisma.transaction.delete({ where: { id: transactionId } });
    return { success: true };
  }
}

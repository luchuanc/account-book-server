import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma.service';
import { StatisticsQueryDto } from './dto/statistics-query.dto';

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(bookId: string, query: StatisticsQueryDto) {
    const period = this.createPeriod(query);
    const where = this.createDateFilter(bookId, query);
    const list = await this.prisma.transaction.findMany({ where });
    const income = list.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
    const expense = list.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
    const days = Math.max(period.end.diff(period.start, 'day') + 1, 1);
    return {
      income,
      expense,
      balance: income - expense,
      transactionCount: list.length,
      avgDailyExpense: Math.round(expense / days),
    };
  }

  async trend(bookId: string, query: StatisticsQueryDto) {
    const where = this.createDateFilter(bookId, query);
    const list = await this.prisma.transaction.findMany({ where, orderBy: { transactionDate: 'asc' } });
    const map = new Map<string, { date: string; income: number; expense: number; balance: number }>();
    list.forEach((item) => {
      const date = dayjs(item.transactionDate).format('YYYY-MM-DD');
      const current = map.get(date) ?? { date, income: 0, expense: 0, balance: 0 };
      if (item.type === 'income') {
        current.income += item.amount;
      } else {
        current.expense += item.amount;
      }
      current.balance = current.income - current.expense;
      map.set(date, current);
    });
    return Array.from(map.values());
  }

  async category(bookId: string, query: StatisticsQueryDto) {
    const where = this.createDateFilter(bookId, query);
    const list = await this.prisma.transaction.findMany({
      where,
      include: { category: true },
    });
    const map = new Map<string, { categoryId: string; categoryName: string; type: string; amount: number }>();
    list.forEach((item) => {
      const key = item.categoryId ?? 'uncategorized';
      const current = map.get(key) ?? {
        categoryId: key,
        categoryName: item.category?.name ?? '未分类',
        type: item.type,
        amount: 0,
      };
      current.amount += item.amount;
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }

  async member(bookId: string, query: StatisticsQueryDto) {
    const where = this.createDateFilter(bookId, query);
    const list = await this.prisma.transaction.findMany({
      where,
      include: {
        recorder: {
          select: {
            id: true,
            nickname: true,
          },
        },
      },
    });
    const map = new Map<string, { recorderUserId: string; recorderNickname: string; income: number; expense: number; count: number }>();
    list.forEach((item) => {
      const key = item.recorderUserId;
      const current = map.get(key) ?? {
        recorderUserId: item.recorderUserId,
        recorderNickname: item.recorder.nickname,
        income: 0,
        expense: 0,
        count: 0,
      };
      if (item.type === 'income') {
        current.income += item.amount;
      } else {
        current.expense += item.amount;
      }
      current.count += 1;
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.expense - a.expense);
  }

  private createDateFilter(bookId: string, query: StatisticsQueryDto): Prisma.TransactionWhereInput {
    const period = this.createPeriod(query);
    return {
      bookId,
      transactionDate: {
        gte: period.start.toDate(),
        lte: period.end.toDate(),
      },
    };
  }

  private createPeriod(query: StatisticsQueryDto) {
    const base = query.date ? dayjs(query.date) : dayjs();
    const start =
      query.period === 'day'
        ? base.startOf('day')
        : query.period === 'week'
          ? base.startOf('week')
          : base.startOf('month');
    const end =
      query.period === 'day'
        ? base.endOf('day')
        : query.period === 'week'
          ? base.endOf('week')
          : base.endOf('month');
    return { start, end };
  }
}

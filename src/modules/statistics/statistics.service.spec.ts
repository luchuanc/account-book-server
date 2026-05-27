import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
  it('computes overview totals from transaction list', async () => {
    const prisma = {
      transaction: {
        findMany: jest.fn().mockResolvedValue([
          { type: 'income', amount: 1000 },
          { type: 'expense', amount: 250 },
          { type: 'expense', amount: 150 },
        ]),
      },
    } as any;

    const service = new StatisticsService(prisma);
    const result = await service.overview('book-1', { period: 'month' });

    expect(result.income).toBe(1000);
    expect(result.expense).toBe(400);
    expect(result.balance).toBe(600);
    expect(result.transactionCount).toBe(3);
  });
});

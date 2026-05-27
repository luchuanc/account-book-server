import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiException } from '../../shared/api-exception';
import { CurrentUser } from '../../shared/auth-user.decorator';
import { BookAccessService } from '../../shared/book-access.service';
import { JwtAuthGuard } from '../../shared/jwt-auth.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@UseGuards(JwtAuthGuard)
@Controller('books/:bookId/transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly bookAccessService: BookAccessService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Query() query: TransactionQueryDto,
  ) {
    await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    return this.transactionsService.findAll(bookId, query);
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    const { membership } = await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    this.bookAccessService.ensureRole(membership.role, ['owner', 'admin', 'editor']);
    return this.transactionsService.create(bookId, user.userId, dto);
  }

  @Get(':transactionId')
  async findOne(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Param('transactionId') transactionId: string,
  ) {
    await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    return this.transactionsService.findOne(bookId, transactionId);
  }

  @Put(':transactionId')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Param('transactionId') transactionId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    const { membership } = await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    const transaction = await this.transactionsService.findOne(bookId, transactionId);
    this.bookAccessService.ensureRole(membership.role, ['owner', 'admin', 'editor']);
    if (membership.role === 'editor' && transaction.creatorUserId !== user.userId) {
      throw new ApiException('编辑者只能修改自己创建的流水', 403);
    }
    return this.transactionsService.update(bookId, transactionId, dto);
  }

  @Delete(':transactionId')
  async remove(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Param('transactionId') transactionId: string,
  ) {
    const { membership } = await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    const transaction = await this.transactionsService.findOne(bookId, transactionId);
    this.bookAccessService.ensureRole(membership.role, ['owner', 'admin', 'editor']);
    if (membership.role === 'editor' && transaction.creatorUserId !== user.userId) {
      throw new ApiException('编辑者只能删除自己创建的流水', 403);
    }
    return this.transactionsService.remove(bookId, transactionId);
  }
}

import { Module } from '@nestjs/common';
import { BookAccessService } from '../../shared/book-access.service';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, BookAccessService],
  exports: [TransactionsService],
})
export class TransactionsModule {}

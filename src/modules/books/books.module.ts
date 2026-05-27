import { Module } from '@nestjs/common';
import { BookAccessService } from '../../shared/book-access.service';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  controllers: [BooksController],
  providers: [BooksService, BookAccessService],
  exports: [BooksService],
})
export class BooksModule {}

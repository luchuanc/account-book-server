import { Module } from '@nestjs/common';
import { BookAccessService } from '../../shared/book-access.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, BookAccessService],
})
export class CategoriesModule {}

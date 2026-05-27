import { Module } from '@nestjs/common';
import { BookAccessService } from '../../shared/book-access.service';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';

@Module({
  controllers: [StatisticsController],
  providers: [StatisticsService, BookAccessService],
})
export class StatisticsModule {}

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../shared/auth-user.decorator';
import { BookAccessService } from '../../shared/book-access.service';
import { JwtAuthGuard } from '../../shared/jwt-auth.guard';
import { StatisticsQueryDto } from './dto/statistics-query.dto';
import { StatisticsService } from './statistics.service';

@UseGuards(JwtAuthGuard)
@Controller('books/:bookId/statistics')
export class StatisticsController {
  constructor(
    private readonly statisticsService: StatisticsService,
    private readonly bookAccessService: BookAccessService,
  ) {}

  @Get('overview')
  async overview(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Query() query: StatisticsQueryDto,
  ) {
    await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    return this.statisticsService.overview(bookId, query);
  }

  @Get('trend')
  async trend(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Query() query: StatisticsQueryDto,
  ) {
    await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    return this.statisticsService.trend(bookId, query);
  }

  @Get('category')
  async category(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Query() query: StatisticsQueryDto,
  ) {
    await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    return this.statisticsService.category(bookId, query);
  }

  @Get('member')
  async member(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Query() query: StatisticsQueryDto,
  ) {
    await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    return this.statisticsService.member(bookId, query);
  }
}

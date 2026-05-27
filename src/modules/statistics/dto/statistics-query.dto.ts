import { IsIn, IsOptional } from 'class-validator';

export class StatisticsQueryDto {
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  period: 'day' | 'week' | 'month' = 'month';

  @IsOptional()
  date?: string;
}

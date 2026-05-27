import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class TransactionQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize = 20;

  @IsOptional()
  @IsIn(['expense', 'income'])
  type?: 'expense' | 'income';

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  recorderUserId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}

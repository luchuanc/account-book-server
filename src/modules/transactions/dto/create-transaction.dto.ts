import { IsDateString, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsIn(['expense', 'income'])
  type!: 'expense' | 'income';

  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;

  @IsDateString()
  transactionDate!: string;

  @IsOptional()
  @IsString()
  recorderUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  paymentAccount?: string;
}

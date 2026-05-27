import { IsBoolean, IsHexColor, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateCategoryDto {
  @IsIn(['expense', 'income'])
  type!: 'expense' | 'income';

  @IsString()
  @Length(1, 20)
  name!: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  sortOrder?: number;
}

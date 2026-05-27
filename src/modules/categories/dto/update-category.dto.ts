import { IsBoolean, IsHexColor, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsIn(['expense', 'income'])
  type?: 'expense' | 'income';

  @IsOptional()
  @IsString()
  @Length(1, 20)
  name?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isDisabled?: boolean;

  @IsOptional()
  sortOrder?: number;
}

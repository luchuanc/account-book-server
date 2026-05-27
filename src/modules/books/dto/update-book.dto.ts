import { IsHexColor, IsOptional, IsString, Length } from 'class-validator';

export class UpdateBookDto {
  @IsOptional()
  @IsString()
  @Length(1, 32)
  name?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsString()
  @Length(0, 120)
  description?: string;
}

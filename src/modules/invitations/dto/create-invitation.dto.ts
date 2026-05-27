import { IsIn, IsOptional, IsNumber } from 'class-validator';
import { BOOK_ROLES } from '../../../shared/roles';

export class CreateInvitationDto {
  @IsIn(BOOK_ROLES)
  role!: (typeof BOOK_ROLES)[number];

  @IsOptional()
  @IsNumber()
  expiresInHours?: number;
}

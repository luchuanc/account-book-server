import { IsIn } from 'class-validator';
import { BOOK_ROLES } from '../../../shared/roles';

export class UpdateMemberDto {
  @IsIn(BOOK_ROLES)
  role!: (typeof BOOK_ROLES)[number];
}

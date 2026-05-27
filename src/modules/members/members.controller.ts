import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../shared/auth-user.decorator';
import { BookAccessService } from '../../shared/book-access.service';
import { JwtAuthGuard } from '../../shared/jwt-auth.guard';
import { MembersService } from './members.service';
import { UpdateMemberDto } from './dto/update-member.dto';

@UseGuards(JwtAuthGuard)
@Controller('books/:bookId/members')
export class MembersController {
  constructor(
    private readonly membersService: MembersService,
    private readonly bookAccessService: BookAccessService,
  ) {}

  @Get()
  async findByBook(@CurrentUser() user: { userId: string }, @Param('bookId') bookId: string) {
    await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    return this.membersService.findByBook(bookId);
  }

  @Put(':memberId')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    const { membership } = await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    this.bookAccessService.ensureRole(membership.role, ['owner', 'admin']);
    return this.membersService.update(bookId, memberId, dto);
  }

  @Delete(':memberId')
  async remove(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Param('memberId') memberId: string,
  ) {
    const { membership } = await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    this.bookAccessService.ensureRole(membership.role, ['owner', 'admin']);
    return this.membersService.remove(memberId);
  }
}

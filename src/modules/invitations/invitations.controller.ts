import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../shared/auth-user.decorator';
import { BookAccessService } from '../../shared/book-access.service';
import { JwtAuthGuard } from '../../shared/jwt-auth.guard';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationsService } from './invitations.service';

@Controller()
export class InvitationsController {
  constructor(
    private readonly invitationsService: InvitationsService,
    private readonly bookAccessService: BookAccessService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('books/:bookId/invitations')
  async create(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    const { membership } = await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    this.bookAccessService.ensureRole(membership.role, ['owner', 'admin']);
    return this.invitationsService.create(bookId, user.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invitations/:inviteCode')
  detail(@Param('inviteCode') inviteCode: string) {
    return this.invitationsService.detail(inviteCode);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invitations/:inviteCode/accept')
  accept(@CurrentUser() user: { userId: string }, @Param('inviteCode') inviteCode: string) {
    return this.invitationsService.accept(inviteCode, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('invitations/:inviteCode/reject')
  reject(@Param('inviteCode') inviteCode: string) {
    return this.invitationsService.reject(inviteCode);
  }
}

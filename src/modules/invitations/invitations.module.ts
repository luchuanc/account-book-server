import { Module } from '@nestjs/common';
import { BookAccessService } from '../../shared/book-access.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  controllers: [InvitationsController],
  providers: [InvitationsService, BookAccessService],
})
export class InvitationsModule {}

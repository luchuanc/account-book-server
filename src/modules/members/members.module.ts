import { Module } from '@nestjs/common';
import { BookAccessService } from '../../shared/book-access.service';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  controllers: [MembersController],
  providers: [MembersService, BookAccessService],
})
export class MembersModule {}

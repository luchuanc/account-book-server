import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { BooksModule } from './modules/books/books.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { MembersModule } from './modules/members/members.module';
import { StatisticsModule } from './modules/statistics/statistics.module';
import { SystemModule } from './modules/system/system.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './shared/prisma.module';
import { RedisModule } from './shared/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    UsersModule,
    AuthModule,
    BooksModule,
    MembersModule,
    InvitationsModule,
    CategoriesModule,
    TransactionsModule,
    StatisticsModule,
    SystemModule,
  ],
})
export class AppModule {}

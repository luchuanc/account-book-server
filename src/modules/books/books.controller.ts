import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../shared/auth-user.decorator';
import { BookAccessService } from '../../shared/book-access.service';
import { JwtAuthGuard } from '../../shared/jwt-auth.guard';
import { ApiException } from '../../shared/api-exception';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

@UseGuards(JwtAuthGuard)
@Controller('books')
export class BooksController {
  constructor(
    private readonly booksService: BooksService,
    private readonly bookAccessService: BookAccessService,
  ) {}

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateBookDto) {
    return this.booksService.create(user.userId, dto);
  }

  @Get()
  findMine(@CurrentUser() user: { userId: string }) {
    return this.booksService.findMine(user.userId);
  }

  @Get(':bookId')
  async findOne(@CurrentUser() user: { userId: string }, @Param('bookId') bookId: string) {
    const book = await this.booksService.findOne(bookId, user.userId);
    if (!book) {
      throw new ApiException('账本不存在', 404);
    }
    return book;
  }

  @Put(':bookId')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Body() dto: UpdateBookDto,
  ) {
    const { membership } = await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    this.bookAccessService.ensureRole(membership.role, ['owner', 'admin']);
    return this.booksService.update(bookId, dto);
  }

  @Delete(':bookId')
  async remove(@CurrentUser() user: { userId: string }, @Param('bookId') bookId: string) {
    const { membership } = await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    this.bookAccessService.ensureRole(membership.role, ['owner']);
    return this.booksService.remove(bookId);
  }
}

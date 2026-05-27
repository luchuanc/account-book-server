import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../shared/auth-user.decorator';
import { BookAccessService } from '../../shared/book-access.service';
import { JwtAuthGuard } from '../../shared/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@UseGuards(JwtAuthGuard)
@Controller('books/:bookId/categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly bookAccessService: BookAccessService,
  ) {}

  @Get()
  async findByBook(@CurrentUser() user: { userId: string }, @Param('bookId') bookId: string) {
    await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    return this.categoriesService.findByBook(bookId);
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    const { membership } = await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    this.bookAccessService.ensureRole(membership.role, ['owner', 'admin']);
    return this.categoriesService.create(bookId, dto);
  }

  @Put(':categoryId')
  async update(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    const { membership } = await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    this.bookAccessService.ensureRole(membership.role, ['owner', 'admin']);
    return this.categoriesService.update(bookId, categoryId, dto);
  }

  @Delete(':categoryId')
  async remove(
    @CurrentUser() user: { userId: string },
    @Param('bookId') bookId: string,
    @Param('categoryId') categoryId: string,
  ) {
    const { membership } = await this.bookAccessService.getAccessibleBook(bookId, user.userId);
    this.bookAccessService.ensureRole(membership.role, ['owner', 'admin']);
    return this.categoriesService.remove(categoryId);
  }
}

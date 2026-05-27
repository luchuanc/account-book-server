import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findByBook(bookId: string) {
    return this.prisma.category.findMany({
      where: { bookId },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  create(bookId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        ...dto,
        sortOrder: dto.sortOrder ?? 0,
        bookId,
      },
    });
  }

  update(bookId: string, categoryId: string, dto: UpdateCategoryDto) {
    return this.prisma.category.update({
      where: {
        id: categoryId,
      },
      data: dto,
    });
  }

  async remove(categoryId: string) {
    await this.prisma.category.delete({
      where: { id: categoryId },
    });
    return { success: true };
  }
}

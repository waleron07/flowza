import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/**
 * Admin API для категорий меню.
 *
 * Все маршруты закрыты JWT + RolesGuard и доступны только staff-ролям,
 * которые могут управлять меню организаций. Проверка доступа к конкретному
 * tenant выполняется в `CategoriesService` через `TenantAccessService`.
 */
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** Возвращает категории выбранной организации, отсортированные для меню. */
  @Get()
  findAll(
    @Req() req: { user: JwtPayload },
    @Query('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.categoriesService.findAll(
      {
        role: req.user.role,
        organizationIds: req.user.organizationIds,
      },
      tenantId,
    );
  }

  /** Создает новую категорию в организации из `CreateCategoryDto.tenantId`. */
  @Post()
  create(@Req() req: { user: JwtPayload }, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(
      {
        role: req.user.role,
        organizationIds: req.user.organizationIds,
      },
      dto,
    );
  }

  /** Частично обновляет категорию по ID. */
  @Patch(':categoryId')
  update(
    @Req() req: { user: JwtPayload },
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(
      {
        role: req.user.role,
        organizationIds: req.user.organizationIds,
      },
      categoryId,
      dto,
    );
  }

  /** Soft-delete категории: запись остается в БД, но `isActive=false`. */
  @Delete(':categoryId')
  remove(
    @Req() req: { user: JwtPayload },
    @Param('categoryId', ParseIntPipe) categoryId: number,
  ) {
    return this.categoriesService.remove(
      {
        role: req.user.role,
        organizationIds: req.user.organizationIds,
      },
      categoryId,
    );
  }
}

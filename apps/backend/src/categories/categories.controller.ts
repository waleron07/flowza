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

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

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

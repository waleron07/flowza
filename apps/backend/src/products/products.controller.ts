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
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Req() req: { user: JwtPayload },
    @Query('tenantId', ParseIntPipe) tenantId: number,
  ) {
    return this.productsService.findAll(
      {
        role: req.user.role,
        organizationIds: req.user.organizationIds,
      },
      tenantId,
    );
  }

  @Post()
  create(@Req() req: { user: JwtPayload }, @Body() dto: CreateProductDto) {
    return this.productsService.create(
      {
        role: req.user.role,
        organizationIds: req.user.organizationIds,
      },
      dto,
    );
  }

  @Patch(':productId')
  update(
    @Req() req: { user: JwtPayload },
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(
      {
        role: req.user.role,
        organizationIds: req.user.organizationIds,
      },
      productId,
      dto,
    );
  }

  @Delete(':productId')
  remove(
    @Req() req: { user: JwtPayload },
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.productsService.remove(
      {
        role: req.user.role,
        organizationIds: req.user.organizationIds,
      },
      productId,
    );
  }
}

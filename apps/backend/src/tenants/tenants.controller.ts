import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

/**
 * HTTP-контроллер организаций.
 *
 * Содержит публичные endpoints каталога и защищенные endpoints управления
 * организациями для staff-пользователей.
 */
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /** Возвращает публичный каталог активной организации по slug. */
  @Get(':slug/catalog')
  getPublicCatalog(@Param('slug') slug: string) {
    return this.tenantsService.findPublicCatalogBySlug(slug);
  }

  /** Возвращает активные организации, доступные текущему staff-пользователю. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MODERATOR,
    UserRole.OPERATOR,
  )
  @Get('accessible')
  getAccessibleTenants(@Req() req: { user: JwtPayload }) {
    return this.tenantsService.findAccessibleTenantsForActor({
      role: req.user.role,
      organizationIds: req.user.organizationIds,
    });
  }

  /** Возвращает организации, которыми текущий actor может управлять. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('manageable')
  getManageableTenants(@Req() req: { user: JwtPayload }) {
    return this.tenantsService.findManageableTenantsForActor({
      role: req.user.role,
      organizationIds: req.user.organizationIds,
    });
  }

  /** Возвращает публичный список активных организаций. */
  @Get()
  getActiveTenants() {
    return this.tenantsService.findActiveTenants();
  }

  /** Возвращает управленческое представление организации с категориями и продуктами. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
  @Get(':tenantId/management')
  getManagementView(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Req() req: { user: JwtPayload },
  ) {
    return this.tenantsService.findManagementViewByTenantId(tenantId, {
      role: req.user.role,
      organizationIds: req.user.organizationIds,
    });
  }

  /** Создает новую организацию; доступно только superAdmin. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post()
  createTenant(@Body() dto: CreateTenantDto) {
    return this.tenantsService.createTenant(dto);
  }

  /** Обновляет настройки организации с учетом роли текущего пользователя. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch(':tenantId')
  updateTenant(
    @Param('tenantId', ParseIntPipe) tenantId: number,
    @Req() req: { user: JwtPayload },
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.updateTenant(
      tenantId,
      {
        role: req.user.role,
        organizationIds: req.user.organizationIds,
      },
      dto,
    );
  }

  /** Удаляет организацию; доступно только superAdmin. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':tenantId')
  removeTenant(@Param('tenantId', ParseIntPipe) tenantId: number) {
    return this.tenantsService.removeTenant(tenantId);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TenantAccessService } from '../tenants/tenant-access.service';
import { TenantActor } from '../tenants/types/tenant-actor.type';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/**
 * Доменный сервис категорий меню.
 *
 * Категории tenant-scoped: перед любым чтением/изменением сервис проверяет,
 * что текущий actor имеет право управлять организацией категории.
 */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantAccessService: TenantAccessService,
  ) {}

  /**
   * Возвращает категории организации в порядке отображения меню.
   *
   * @throws ForbiddenException внутри `TenantAccessService`, если actor не имеет доступа.
   */
  async findAll(actor: TenantActor, tenantId: number) {
    this.tenantAccessService.assertCanManageOrganization(actor, tenantId);

    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Создает категорию в указанной организации.
   *
   * `sortOrder` и `isActive` имеют backend-default'ы, чтобы frontend мог
   * отправлять минимальный payload.
   */
  async create(actor: TenantActor, dto: CreateCategoryDto) {
    this.tenantAccessService.assertCanManageOrganization(actor, dto.tenantId);

    return this.prisma.category.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /**
   * Частично обновляет категорию.
   *
   * Сначала перечитывает категорию, чтобы получить `tenantId` для проверки
   * доступа. Не найденная категория возвращает 404.
   */
  async update(actor: TenantActor, categoryId: number, dto: UpdateCategoryDto) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, tenantId: true },
    });

    if (!existingCategory) {
      throw new NotFoundException('Категория не найдена');
    }

    this.tenantAccessService.assertCanManageOrganization(
      actor,
      existingCategory.tenantId,
    );

    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
  }

  /**
   * Soft-delete категории.
   *
   * Физически запись не удаляется: выставляется `isActive=false`, чтобы
   * сохранить историю связей и избежать потери данных меню.
   */
  async remove(actor: TenantActor, categoryId: number) {
    const existingCategory = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, tenantId: true },
    });

    if (!existingCategory) {
      throw new NotFoundException('Категория не найдена');
    }

    this.tenantAccessService.assertCanManageOrganization(
      actor,
      existingCategory.tenantId,
    );

    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        isActive: false,
      },
    });
  }
}

import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Payload создания категории меню внутри конкретной организации.
 *
 * Категория всегда tenant-scoped: backend проверяет, что текущий staff-actor
 * может управлять `tenantId`, прежде чем создавать запись.
 */
export class CreateCategoryDto {
  /** ID организации/tenant, в которой создается категория. */
  @Type(() => Number)
  @IsInt({ message: 'ID организации должен быть целым числом' })
  tenantId!: number;

  /** Название категории, отображаемое в меню. */
  @IsNotEmpty({ message: 'Название категории обязательно' })
  name!: string;

  /** Необязательное описание категории для админки/клиентского UI. */
  @IsOptional()
  description?: string;

  /** URL изображения категории. */
  @IsOptional()
  @IsString({ message: 'URL изображения должен быть строкой' })
  imageUrl?: string;

  /** Позиция сортировки: меньшее значение выводится выше. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Порядок сортировки должен быть целым числом' })
  sortOrder?: number;

  /** Флаг активности категории; неактивные категории скрываются из публичного меню. */
  @IsOptional()
  @IsBoolean({ message: 'Активность категории должна быть boolean-значением' })
  isActive?: boolean;
}

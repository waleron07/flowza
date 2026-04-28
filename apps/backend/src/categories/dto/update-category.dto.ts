import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * Payload частичного обновления категории.
 *
 * Все поля опциональны: `PATCH /categories/:categoryId` меняет только
 * переданные свойства. Доступ к tenant проверяется по существующей категории.
 */
export class UpdateCategoryDto {
  /** Новое название категории. */
  @IsOptional()
  name?: string;

  /** Новое описание категории. */
  @IsOptional()
  description?: string;

  /** Новый URL изображения категории. */
  @IsOptional()
  @IsString({ message: 'URL изображения должен быть строкой' })
  imageUrl?: string;

  /** Новая позиция сортировки. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Порядок сортировки должен быть целым числом' })
  sortOrder?: number;

  /** Активность категории: `false` скрывает ее без физического удаления. */
  @IsOptional()
  @IsBoolean({ message: 'Активность категории должна быть boolean-значением' })
  isActive?: boolean;
}

import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

/**
 * Payload обновления продукта.
 *
 * Все поля опциональны: админ может изменить только часть карточки продукта,
 * не отправляя неизменившиеся значения.
 */
export class UpdateProductDto {
  /** Новый ID категории продукта. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID категории должен быть целым числом' })
  categoryId?: number;

  /** Новое название продукта. */
  @IsOptional()
  name?: string;

  /** Новое описание продукта. */
  @IsOptional()
  description?: string;

  /** Новый URL изображения продукта. */
  @IsOptional()
  @IsString({ message: 'URL изображения должен быть строкой' })
  imageUrl?: string;

  /** Новый текст бейджа на карточке продукта. */
  @IsOptional()
  @IsString({ message: 'Текст бейджа должен быть строкой' })
  badgeText?: string;

  /** Новая цена продукта в минимальных единицах валюты. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Цена должна быть целым числом' })
  price?: number;

  /** Новый код валюты цены. */
  @IsOptional()
  currency?: string;

  /** Новый статус активности продукта в меню. */
  @IsOptional()
  @IsBoolean({ message: 'Статус активности должен быть булевым значением' })
  isActive?: boolean;
}

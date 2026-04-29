import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * Payload создания продукта в меню организации.
 *
 * Продукт создается внутри конкретной организации и категории; цена и
 * отображаемые метаданные сохраняются как актуальная карточка товара.
 */
export class CreateProductDto {
  /** ID организации, в которой создается продукт. */
  @Type(() => Number)
  @IsInt({ message: 'ID организации должен быть целым числом' })
  tenantId!: number;

  /** ID категории, к которой относится продукт. */
  @Type(() => Number)
  @IsInt({ message: 'ID категории должен быть целым числом' })
  categoryId!: number;

  /** Название продукта, отображаемое клиенту. */
  @IsNotEmpty({ message: 'Название продукта обязательно' })
  name!: string;

  /** Описание продукта для карточки меню. */
  @IsOptional()
  description?: string;

  /** URL изображения продукта. */
  @IsOptional()
  @IsString({ message: 'URL изображения должен быть строкой' })
  imageUrl?: string;

  /** Короткий бейдж на карточке продукта, например "Хит" или "Новинка". */
  @IsOptional()
  @IsString({ message: 'Текст бейджа должен быть строкой' })
  badgeText?: string;

  /** Цена продукта в минимальных единицах валюты. */
  @Type(() => Number)
  @IsInt({ message: 'Цена должна быть целым числом' })
  price!: number;

  /** Код валюты цены, если отличается от валюты организации по умолчанию. */
  @IsOptional()
  currency?: string;

  /** Признак активности продукта в меню. */
  @IsOptional()
  @IsBoolean({ message: 'Статус активности должен быть булевым значением' })
  isActive?: boolean;
}

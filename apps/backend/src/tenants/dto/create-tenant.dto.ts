import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

/**
 * Payload создания организации.
 *
 * Используется superAdmin для заведения новой организации, ее публичного
 * каталога, SEO-метаданных и базовых условий доставки.
 */
export class CreateTenantDto {
  /** Название организации, отображаемое в публичном каталоге и админке. */
  @IsNotEmpty({ message: 'Название организации обязательно' })
  name!: string;

  /** URL-friendly идентификатор организации. */
  @IsNotEmpty({ message: 'Slug организации обязателен' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug должен содержать только строчные латинские буквы, цифры и дефисы',
  })
  slug!: string;

  /** Краткое описание организации. */
  @IsOptional()
  description?: string;

  /** Заголовок hero-блока публичной страницы. */
  @IsOptional()
  @IsString({ message: 'Hero-заголовок должен быть строкой' })
  heroTitle?: string;

  /** Подзаголовок hero-блока публичной страницы. */
  @IsOptional()
  @IsString({ message: 'Hero-подзаголовок должен быть строкой' })
  heroSubtitle?: string;

  /** Описание hero-блока публичной страницы. */
  @IsOptional()
  @IsString({ message: 'Hero-описание должно быть строкой' })
  heroDescription?: string;

  /** URL изображения hero-блока. */
  @IsOptional()
  @IsString({ message: 'URL hero-изображения должен быть строкой' })
  heroImageUrl?: string;

  /** SEO-заголовок публичной страницы организации. */
  @IsOptional()
  @IsString({ message: 'SEO-заголовок должен быть строкой' })
  seoTitle?: string;

  /** SEO-описание публичной страницы организации. */
  @IsOptional()
  @IsString({ message: 'SEO-описание должно быть строкой' })
  seoDescription?: string;

  /** Дата окончания подписки организации в ISO-формате. */
  @IsOptional()
  @IsDateString({}, { message: 'Дата подписки должна быть валидной ISO-датой' })
  subscription?: string;

  /** Контактный телефон организации. */
  @IsOptional()
  @IsString({ message: 'Телефон должен быть строкой' })
  phone?: string;

  /** Адрес организации в свободной форме. */
  @IsOptional()
  @IsString({ message: 'Адрес должен быть строкой' })
  address?: string;

  /** Часовой пояс организации, например `Europe/Moscow`. */
  @IsOptional()
  @IsString({ message: 'Часовой пояс должен быть строкой' })
  timezone?: string;

  /** Расписание работы организации в JSON-формате. */
  @IsOptional()
  @IsObject({ message: 'Расписание работы должно быть объектом' })
  workingHours?: Record<string, unknown>;

  /** Стоимость доставки в минимальных единицах валюты. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Стоимость доставки должна быть целым числом' })
  deliveryFee?: number;

  /** Минимальная сумма заказа в минимальных единицах валюты. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Минимальная сумма заказа должна быть целым числом' })
  minOrderAmount?: number;
}

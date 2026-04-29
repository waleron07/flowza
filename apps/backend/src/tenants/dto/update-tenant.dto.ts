import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

/**
 * Payload обновления организации.
 *
 * Все поля опциональны: админ может отправить только изменившиеся настройки
 * организации, витрины или условий доставки.
 */
export class UpdateTenantDto {
  /** Новое название организации. */
  @IsOptional()
  name?: string;

  /** Новый URL-friendly идентификатор организации. */
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug должен содержать только строчные латинские буквы, цифры и дефисы',
  })
  slug?: string;

  /** Новое краткое описание организации. */
  @IsOptional()
  description?: string;

  /** Новый заголовок hero-блока публичной страницы. */
  @IsOptional()
  @IsString({ message: 'Hero-заголовок должен быть строкой' })
  heroTitle?: string;

  /** Новый подзаголовок hero-блока публичной страницы. */
  @IsOptional()
  @IsString({ message: 'Hero-подзаголовок должен быть строкой' })
  heroSubtitle?: string;

  /** Новое описание hero-блока публичной страницы. */
  @IsOptional()
  @IsString({ message: 'Hero-описание должно быть строкой' })
  heroDescription?: string;

  /** Новый URL изображения hero-блока. */
  @IsOptional()
  @IsString({ message: 'URL hero-изображения должен быть строкой' })
  heroImageUrl?: string;

  /** Новый SEO-заголовок публичной страницы. */
  @IsOptional()
  @IsString({ message: 'SEO-заголовок должен быть строкой' })
  seoTitle?: string;

  /** Новое SEO-описание публичной страницы. */
  @IsOptional()
  @IsString({ message: 'SEO-описание должно быть строкой' })
  seoDescription?: string;

  /** Новый статус активности организации. */
  @IsOptional()
  @IsBoolean({ message: 'Статус активности должен быть булевым значением' })
  isActive?: boolean;

  /** Новая дата окончания подписки в ISO-формате. */
  @IsOptional()
  @IsDateString({}, { message: 'Дата подписки должна быть валидной ISO-датой' })
  subscription?: string;

  /** Новый контактный телефон организации. */
  @IsOptional()
  @IsString({ message: 'Телефон должен быть строкой' })
  phone?: string;

  /** Новый адрес организации. */
  @IsOptional()
  @IsString({ message: 'Адрес должен быть строкой' })
  address?: string;

  /** Новый часовой пояс организации. */
  @IsOptional()
  @IsString({ message: 'Часовой пояс должен быть строкой' })
  timezone?: string;

  /** Новое расписание работы организации в JSON-формате. */
  @IsOptional()
  @IsObject({ message: 'Расписание работы должно быть объектом' })
  workingHours?: Record<string, unknown>;

  /** Новая стоимость доставки в минимальных единицах валюты. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Стоимость доставки должна быть целым числом' })
  deliveryFee?: number;

  /** Новая минимальная сумма заказа в минимальных единицах валюты. */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Минимальная сумма заказа должна быть целым числом' })
  minOrderAmount?: number;
}

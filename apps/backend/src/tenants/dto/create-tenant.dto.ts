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

type WorkingHoursRangeDto = {
  from?: string;
  to?: string;
};

/**
 * Payload создания организации.
 *
 * Используется superAdmin для заведения новой организации, ее публичного
 * каталога, SEO-метаданных и базовых условий доставки.
 */
export class CreateTenantDto {
  /** Существующий admin-пользователь, который будет управлять организацией. */
  @Type(() => Number)
  @IsInt({ message: 'Администратор организации обязателен' })
  adminUserId!: number;

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
  @IsNotEmpty({ message: 'Описание организации обязательно' })
  @IsString({ message: 'Описание организации должно быть строкой' })
  description!: string;

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
  @IsNotEmpty({ message: 'Дата окончания подписки обязательна' })
  @IsDateString({}, { message: 'Дата подписки должна быть валидной ISO-датой' })
  subscription!: string;

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

  /** Диапазон рабочих часов организации. */
  @IsOptional()
  @IsObject({ message: 'Расписание работы должно быть объектом' })
  workingHours?: WorkingHoursRangeDto;

  /** Стоимость доставки в строковом формате. */
  @IsOptional()
  @IsString({ message: 'Стоимость доставки должна быть строкой' })
  deliveryFee?: string;

  /** Минимальная сумма заказа в строковом формате. */
  @IsOptional()
  @IsString({ message: 'Минимальная сумма заказа должна быть строкой' })
  minOrderAmount?: string;
}

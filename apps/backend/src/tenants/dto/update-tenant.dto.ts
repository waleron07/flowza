import {
  IsBoolean,
  IsDateString,
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

  /** Новый диапазон рабочих часов организации. */
  @IsOptional()
  @IsObject({ message: 'Расписание работы должно быть объектом' })
  workingHours?: WorkingHoursRangeDto;

  /** Новая стоимость доставки в строковом формате. */
  @IsOptional()
  @IsString({ message: 'Стоимость доставки должна быть строкой' })
  deliveryFee?: string;

  /** Новая минимальная сумма заказа в строковом формате. */
  @IsOptional()
  @IsString({ message: 'Минимальная сумма заказа должна быть строкой' })
  minOrderAmount?: string;
}

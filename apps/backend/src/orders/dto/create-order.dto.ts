import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

/**
 * Позиция создаваемого заказа.
 *
 * Цена и название товара берутся из БД на момент оформления, чтобы клиент не
 * мог подменить стоимость в payload.
 */
export class CreateOrderItemDto {
  /** ID активного товара в выбранной организации. */
  @Type(() => Number)
  @IsInt({ message: 'ID товара должен быть целым числом' })
  productId!: number;

  /** Количество единиц товара в заказе. */
  @Type(() => Number)
  @IsInt({ message: 'Количество должно быть целым числом' })
  @Min(1, { message: 'Количество должно быть не меньше 1' })
  quantity!: number;
}

/**
 * Payload создания клиентского заказа.
 *
 * Заказ создается в контексте конкретной организации, с snapshot-ценами товаров
 * и адресом доставки, указанным пользователем.
 */
export class CreateOrderDto {
  /** ID организации, в которой оформляется заказ. */
  @Type(() => Number)
  @IsInt({ message: 'ID организации должен быть целым числом' })
  tenantId!: number;

  /** Адрес доставки в свободной форме. */
  @IsNotEmpty({ message: 'Адрес доставки обязателен' })
  deliveryAddress!: string;

  /** Способ оплаты из enum Prisma `PaymentMethod`. */
  @IsEnum(PaymentMethod, { message: 'Некорректный способ оплаты' })
  paymentMethod!: PaymentMethod;

  /** Список товаров заказа; пустой заказ запрещен. */
  @IsArray({ message: 'Список товаров должен быть массивом' })
  @ArrayMinSize(1, { message: 'Заказ должен содержать хотя бы один товар' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

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

export class CreateOrderItemDto {
  @Type(() => Number)
  @IsInt()
  productId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @Type(() => Number)
  @IsInt()
  tenantId!: number;

  @IsNotEmpty()
  deliveryAddress!: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

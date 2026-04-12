import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProductDto {
  @Type(() => Number)
  @IsInt()
  tenantId!: number;

  @Type(() => Number)
  @IsInt()
  categoryId!: number;

  @IsNotEmpty()
  name!: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  badgeText?: string;

  @Type(() => Number)
  @IsInt()
  price!: number;

  @IsOptional()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  name?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  badgeText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  price?: number;

  @IsOptional()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

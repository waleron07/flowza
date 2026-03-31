import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional } from 'class-validator';

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
  @Type(() => Number)
  @IsInt()
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  discountAll?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  discountStaff?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  discountDay?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  discountWeek?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  discountMonth?: number;

  @IsOptional()
  currency?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

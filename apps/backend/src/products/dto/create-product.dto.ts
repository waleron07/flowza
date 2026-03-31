import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProductDto {
  @Type(() => Number)
  @IsInt()
  tenantId: number;

  @Type(() => Number)
  @IsInt()
  categoryId: number;

  @IsNotEmpty()
  name: string;

  @IsOptional()
  description?: string;

  @Type(() => Number)
  @IsInt()
  price: number;

  @IsOptional()
  currency?: string;
}

import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @Type(() => Number)
  @IsInt()
  tenantId: number;

  @IsNotEmpty()
  name: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

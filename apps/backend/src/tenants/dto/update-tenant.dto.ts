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

export class UpdateTenantDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must contain lowercase latin letters, numbers and hyphens only',
  })
  slug?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  @IsString()
  heroTitle?: string;

  @IsOptional()
  @IsString()
  heroSubtitle?: string;

  @IsOptional()
  @IsString()
  heroDescription?: string;

  @IsOptional()
  @IsString()
  heroImageUrl?: string;

  @IsOptional()
  @IsString()
  seoTitle?: string;

  @IsOptional()
  @IsString()
  seoDescription?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  subscription?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsObject()
  workingHours?: Record<string, unknown>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  deliveryFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minOrderAmount?: number;
}

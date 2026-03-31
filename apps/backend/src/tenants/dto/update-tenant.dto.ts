import { IsBoolean, IsDateString, IsOptional, Matches } from 'class-validator';

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
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  subscription?: string;
}

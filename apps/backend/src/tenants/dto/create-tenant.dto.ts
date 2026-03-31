import { IsDateString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class CreateTenantDto {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message:
      'Slug must contain lowercase latin letters, numbers and hyphens only',
  })
  slug: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  @IsDateString()
  subscription?: string;
}

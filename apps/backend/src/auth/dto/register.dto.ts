import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @Matches(/^\+7\d{10}$/, {
    message: 'Phone must be a valid RU number in +79XXXXXXXXX format',
  })
  phone: string;

  @IsNotEmpty()
  firstName: string;

  @MinLength(8)
  password: string;

  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  consentToPrivacyPolicy: boolean;
}

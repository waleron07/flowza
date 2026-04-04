import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  Matches,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @Matches(/^\+7\d{10}$/, {
    message: 'Phone must be a valid RU number in +79XXXXXXXXX format',
  })
  phone: string;

  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Login must contain only Latin letters, digits, underscore and hyphen',
  })
  login: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  consentToPrivacyPolicy: boolean;

  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  consentToPersonalData: boolean;

  @IsNotEmpty()
  agreementVersion: string;

  @IsNotEmpty()
  captchaToken: string;
}

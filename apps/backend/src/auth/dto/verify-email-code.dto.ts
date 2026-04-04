import { IsEmail, Matches } from 'class-validator';

export class VerifyEmailCodeDto {
  @IsEmail()
  email: string;

  @Matches(/^\d{6}$/, {
    message: 'Verification code must contain 6 digits',
  })
  code: string;
}

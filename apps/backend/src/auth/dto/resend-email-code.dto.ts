import { IsEmail } from 'class-validator';

export class ResendEmailCodeDto {
  @IsEmail()
  email: string;
}

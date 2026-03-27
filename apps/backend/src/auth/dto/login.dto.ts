import { IsNotEmpty, Matches } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @Matches(/^\+7\d{10}$/, {
    message: 'Phone must be a valid RU number in +79XXXXXXXXX format',
  })
  phone: string;

  @IsNotEmpty()
  password: string;
}

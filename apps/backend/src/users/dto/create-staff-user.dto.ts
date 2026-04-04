import {
  ArrayNotEmpty,
  IsEmail,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../common/enums/user-role.enum';

export class CreateStaffUserDto {
  @Matches(/^\+7\d{10}$/, {
    message: 'Phone must be a valid RU number in +79XXXXXXXXX format',
  })
  phone: string;

  @IsNotEmpty()
  login: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsInt()
  primaryTenantId?: number;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  organizationIds?: number[];
}

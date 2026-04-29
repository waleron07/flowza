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

/**
 * Payload создания staff-пользователя через админку.
 *
 * Используется администраторами для заведения сотрудников организации:
 * админов, модераторов и операторов.
 */
export class CreateStaffUserDto {
  /** Российский номер телефона сотрудника в формате `+79XXXXXXXXX`. */
  @Matches(/^\+7\d{10}$/, {
    message: 'Телефон должен быть российским номером в формате +79XXXXXXXXX',
  })
  phone: string;

  /** Логин сотрудника для входа в систему. */
  @IsNotEmpty({ message: 'Логин обязателен' })
  login: string;

  /** Email сотрудника для входа и служебных уведомлений. */
  @IsNotEmpty({ message: 'Email обязателен' })
  @IsEmail({}, { message: 'Email должен быть валидным адресом' })
  email: string;

  /** Временный или постоянный пароль сотрудника. */
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  password: string;

  /** Staff-роль, которую получит создаваемый пользователь. */
  @IsEnum(UserRole, { message: 'Некорректная роль пользователя' })
  role: UserRole;

  /** Основная организация сотрудника. */
  @IsOptional()
  @IsInt({ message: 'ID основной организации должен быть целым числом' })
  primaryTenantId?: number;

  /** Список организаций, доступных сотруднику. */
  @IsOptional()
  @IsArray({ message: 'Список организаций должен быть массивом' })
  @ArrayNotEmpty({ message: 'Список организаций не должен быть пустым' })
  @IsInt({ each: true, message: 'ID организации должен быть целым числом' })
  organizationIds?: number[];
}

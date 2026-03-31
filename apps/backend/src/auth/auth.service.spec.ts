import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserRole } from '../common/enums/user-role.enum';
import { UsersService } from '../users/users.service';

describe('Сервис авторизации', () => {
  const findByPhoneMock = jest.fn();
  const createUserMock = jest.fn();
  const findByIdMock = jest.fn();
  const deactivateByIdMock = jest.fn();

  const usersService = {
    findByPhone: findByPhoneMock,
    create: createUserMock,
    findById: findByIdMock,
    deactivateById: deactivateByIdMock,
  } as unknown as UsersService;

  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
  } as unknown as JwtService;

  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(usersService, jwtService);
  });

  it('регистрирует нового пользователя с ролью user', async () => {
    findByPhoneMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({
      id: 10,
      primaryTenantId: null,
      phone: '+79991234567',
      firstName: 'Ivan',
      role: UserRole.USER,
      passwordHash: 'hash',
      isActive: true,
    });

    const result = await authService.register({
      phone: '+79991234567',
      firstName: 'Ivan',
      password: 'password123',
      consentToPrivacyPolicy: true,
    });

    expect(result.accessToken).toBe('mock.jwt.token');
    expect(createUserMock).toHaveBeenCalledTimes(1);
    expect(result.user.role).toBe(UserRole.USER);
  });

  it('отклоняет регистрацию без согласия с политикой конфиденциальности', async () => {
    await expect(
      authService.register({
        phone: '+79991234567',
        firstName: 'Ivan',
        password: 'password123',
        consentToPrivacyPolicy: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('отклоняет регистрацию при невалидном российском номере телефона', async () => {
    await expect(
      authService.register({
        phone: '89991234567',
        firstName: 'Ivan',
        password: 'password123',
        consentToPrivacyPolicy: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('отклоняет регистрацию при дублирующемся номере телефона', async () => {
    findByPhoneMock.mockResolvedValue({ id: 1 });

    await expect(
      authService.register({
        phone: '+79991234567',
        firstName: 'Ivan',
        password: 'password123',
        consentToPrivacyPolicy: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('выполняет вход пользователя с валидными учетными данными', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    findByPhoneMock.mockResolvedValue({
      id: 11,
      primaryTenantId: null,
      phone: '+79991234567',
      firstName: 'Ivan',
      role: UserRole.USER,
      passwordHash,
      isActive: true,
    });

    const result = await authService.login({
      phone: '+79991234567',
      password: 'password123',
    });

    expect(result.accessToken).toBe('mock.jwt.token');
    expect(result.user.id).toBe(11);
  });

  it('отклоняет вход с неверным паролем', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    findByPhoneMock.mockResolvedValue({
      id: 11,
      primaryTenantId: null,
      phone: '+79991234567',
      firstName: 'Ivan',
      role: UserRole.USER,
      passwordHash,
      isActive: true,
    });

    await expect(
      authService.login({
        phone: '+79991234567',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('деактивирует собственный аккаунт', async () => {
    findByIdMock.mockResolvedValue({
      id: 15,
      phone: '+79991234567',
      firstName: 'Ivan',
      role: UserRole.USER,
      isActive: true,
      primaryTenantId: null,
    });
    deactivateByIdMock.mockResolvedValue({
      id: 15,
      isActive: false,
    });

    const result = await authService.deleteMe(15);

    expect(deactivateByIdMock).toHaveBeenCalledTimes(1);
    expect(deactivateByIdMock).toHaveBeenCalledWith(15);
    expect(result).toEqual({ success: true });
  });

  it('не удаляет аккаунт, если пользователь не найден', async () => {
    findByIdMock.mockResolvedValue(null);

    await expect(authService.deleteMe(999)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('возвращает профиль активного пользователя', async () => {
    findByIdMock.mockResolvedValue({
      id: 17,
      primaryTenantId: null,
      phone: '+79990000017',
      firstName: 'Павел',
      lastName: 'Иванов',
      role: UserRole.USER,
      isActive: true,
    });

    const result = await authService.me(17);

    expect(result.id).toBe(17);
    expect(result.phone).toBe('+79990000017');
  });

  it('не возвращает профиль неактивного пользователя', async () => {
    findByIdMock.mockResolvedValue({
      id: 18,
      primaryTenantId: null,
      phone: '+79990000018',
      firstName: 'Сергей',
      lastName: null,
      role: UserRole.USER,
      isActive: false,
    });

    await expect(authService.me(18)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

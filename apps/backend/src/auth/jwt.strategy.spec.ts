import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums/user-role.enum';

describe('JWT стратегия', () => {
  const findByIdMock = jest.fn();

  const configService = {
    get: jest.fn().mockReturnValue('test_jwt_secret'),
  } as unknown as ConfigService;

  const usersService = {
    findById: findByIdMock,
  } as unknown as UsersService;

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(configService, usersService);
  });

  it('принимает токен активного пользователя', async () => {
    findByIdMock.mockResolvedValue({
      id: 11,
      primaryTenantId: 42,
      organizationIds: [42, 43],
      role: UserRole.ADMIN,
      isActive: true,
    });

    await expect(
      strategy.validate({
        userId: 11,
        primaryTenantId: 42,
        organizationIds: [42, 43],
        role: UserRole.ADMIN,
      }),
    ).resolves.toEqual({
      userId: 11,
      primaryTenantId: 42,
      organizationIds: [42, 43],
      role: UserRole.ADMIN,
    });
  });

  it('отклоняет токен без userId', async () => {
    await expect(
      strategy.validate({
        userId: 0,
        primaryTenantId: null,
        organizationIds: [],
        role: UserRole.USER,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('отклоняет токен для несуществующего пользователя', async () => {
    findByIdMock.mockResolvedValue(null);

    await expect(
      strategy.validate({
        userId: 404,
        primaryTenantId: null,
        organizationIds: [],
        role: UserRole.USER,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('отклоняет токен для неактивного пользователя', async () => {
    findByIdMock.mockResolvedValue({
      id: 12,
      primaryTenantId: null,
      organizationIds: [],
      role: UserRole.USER,
      isActive: false,
    });

    await expect(
      strategy.validate({
        userId: 12,
        primaryTenantId: null,
        organizationIds: [],
        role: UserRole.USER,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

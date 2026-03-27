import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../common/enums/user-role.enum';
import { UsersService } from './users.service';
import { UsersManagementService } from './users-management.service';

describe('Сервис управления пользователями админки', () => {
  const findByPhoneMock = jest.fn();
  const createUserMock = jest.fn();

  const usersService = {
    findByPhone: findByPhoneMock,
    create: createUserMock,
  } as unknown as UsersService;

  let service: UsersManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersManagementService(usersService);
  });

  it('разрешает admin создавать operator', async () => {
    findByPhoneMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({ id: 1, role: UserRole.OPERATOR });

    const result = await service.createByPrivilegedUser(
      { role: UserRole.ADMIN, tenantId: 10 },
      {
        phone: '+79990000010',
        firstName: 'Оператор',
        password: 'password123',
        role: UserRole.OPERATOR,
      },
    );

    expect(createUserMock).toHaveBeenCalledTimes(1);
    expect(result.role).toBe(UserRole.OPERATOR);
  });

  it('запрещает admin создавать admin', async () => {
    await expect(
      service.createByPrivilegedUser(
        { role: UserRole.ADMIN, tenantId: 10 },
        {
          phone: '+79990000011',
          firstName: 'Админ',
          password: 'password123',
          role: UserRole.ADMIN,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('разрешает superAdmin создавать admin', async () => {
    findByPhoneMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({ id: 2, role: UserRole.ADMIN });

    const result = await service.createByPrivilegedUser(
      { role: UserRole.SUPER_ADMIN, tenantId: null },
      {
        phone: '+79990000012',
        firstName: 'Новый админ',
        password: 'password123',
        role: UserRole.ADMIN,
        tenantId: 77,
      },
    );

    expect(createUserMock).toHaveBeenCalledTimes(1);
    expect(result.role).toBe(UserRole.ADMIN);
  });

  it('запрещает создавать роль user через админку', async () => {
    await expect(
      service.createByPrivilegedUser(
        { role: UserRole.ADMIN, tenantId: 10 },
        {
          phone: '+79990000013',
          firstName: 'Клиент',
          password: 'password123',
          role: UserRole.USER,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('возвращает ошибку при дублирующемся телефоне', async () => {
    findByPhoneMock.mockResolvedValue({ id: 99 });

    await expect(
      service.createByPrivilegedUser(
        { role: UserRole.ADMIN, tenantId: 10 },
        {
          phone: '+79990000014',
          firstName: 'Дубликат',
          password: 'password123',
          role: UserRole.MODERATOR,
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

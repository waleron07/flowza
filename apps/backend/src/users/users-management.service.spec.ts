import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '../common/enums/user-role.enum';
import { UsersService } from './users.service';
import { UsersManagementService } from './users-management.service';
import { TenantAccessService } from '../tenants/tenant-access.service';

describe('Сервис управления пользователями админки', () => {
  const findByPhoneMock = jest.fn();
  const findByEmailMock = jest.fn();
  const findByLoginMock = jest.fn();
  const createUserMock = jest.fn();

  const usersService = {
    findByPhone: findByPhoneMock,
    findByEmail: findByEmailMock,
    findByLogin: findByLoginMock,
    create: createUserMock,
  } as unknown as UsersService;

  const tenantAccessService = {
    normalizeOrganizationIds: jest.fn((organizationIds?: number[]) =>
      [...new Set(organizationIds ?? [])].sort((left, right) => left - right),
    ),
    assertCanAssignOrganizations: jest.fn(),
  } as unknown as TenantAccessService;

  let service: UsersManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    findByEmailMock.mockResolvedValue(null);
    findByLoginMock.mockResolvedValue(null);
    tenantAccessService.normalizeOrganizationIds = jest.fn(
      (organizationIds?: number[]) =>
        [...new Set(organizationIds ?? [])].sort((left, right) => left - right),
    ) as never;
    tenantAccessService.assertCanAssignOrganizations = jest.fn() as never;
    service = new UsersManagementService(usersService, tenantAccessService);
  });

  it('разрешает admin создавать operator', async () => {
    findByPhoneMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({
      id: 1,
      role: UserRole.OPERATOR,
      organizationIds: [10],
    });

    const result = await service.createByPrivilegedUser(
      {
        userId: 1,
        role: UserRole.ADMIN,
        primaryTenantId: 10,
        organizationIds: [10],
      },
      {
        phone: '+79990000010',
        email: 'operator-staff@example.com',
        login: 'operator_login',
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
        {
          userId: 1,
          role: UserRole.ADMIN,
          primaryTenantId: 10,
          organizationIds: [10],
        },
        {
          phone: '+79990000011',
          email: 'admin-staff@example.com',
          login: 'admin_login',
          password: 'password123',
          role: UserRole.ADMIN,
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('разрешает superAdmin создавать admin', async () => {
    findByPhoneMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({
      id: 2,
      role: UserRole.ADMIN,
      organizationIds: [77, 88],
    });

    const result = await service.createByPrivilegedUser(
      {
        userId: 100,
        role: UserRole.SUPER_ADMIN,
          primaryTenantId: null,
        organizationIds: [10, 77, 88],
      },
      {
        phone: '+79990000012',
        email: 'new-admin@example.com',
        login: 'new_admin_login',
        password: 'password123',
        role: UserRole.ADMIN,
        organizationIds: [77, 88],
      },
    );

    expect(createUserMock).toHaveBeenCalledTimes(1);
    expect(result.role).toBe(UserRole.ADMIN);
    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryTenantId: 77,
        organizationIds: [77, 88],
      }),
    );
  });

  it('запрещает создавать роль user через админку', async () => {
    await expect(
      service.createByPrivilegedUser(
        {
          userId: 1,
          role: UserRole.ADMIN,
          primaryTenantId: 10,
          organizationIds: [10],
        },
        {
          phone: '+79990000013',
          email: 'user-staff@example.com',
          login: 'client_login',
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
        {
          userId: 1,
          role: UserRole.ADMIN,
          primaryTenantId: 10,
          organizationIds: [10],
        },
        {
          phone: '+79990000014',
          email: 'duplicate-staff@example.com',
          login: 'duplicate_login',
          password: 'password123',
          role: UserRole.MODERATOR,
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('запрещает admin назначать сотрудника в недоступную организацию', async () => {
    findByPhoneMock.mockResolvedValue(null);
    tenantAccessService.assertCanAssignOrganizations = jest.fn(() => {
      throw new ForbiddenException('Нельзя назначить сотрудника в недоступную организацию');
    }) as never;

    await expect(
      service.createByPrivilegedUser(
        {
          userId: 1,
          role: UserRole.ADMIN,
          primaryTenantId: 10,
          organizationIds: [10],
        },
        {
          phone: '+79990000015',
          email: 'forbidden-staff@example.com',
          login: 'forbidden_login',
          password: 'password123',
          role: UserRole.MODERATOR,
          organizationIds: [11],
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('использует доступные организации admin по умолчанию', async () => {
    findByPhoneMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({
      id: 3,
      role: UserRole.MODERATOR,
      organizationIds: [10, 20],
    });

    await service.createByPrivilegedUser(
      {
        userId: 1,
        role: UserRole.ADMIN,
          primaryTenantId: 10,
        organizationIds: [10, 20],
      },
      {
        phone: '+79990000016',
        email: 'moderator-staff@example.com',
        login: 'moderator_login',
        password: 'password123',
        role: UserRole.MODERATOR,
      },
    );

    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        primaryTenantId: 10,
        organizationIds: [10, 20],
      }),
    );
  });
});

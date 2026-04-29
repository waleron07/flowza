import { ForbiddenException } from '@nestjs/common';
import { TenantAccessService } from './tenant-access.service';
import { UserRole } from '../common/enums/user-role.enum';

/**
 * Unit-тесты сервиса tenant-доступа.
 *
 * Проверяют нормализацию списка организаций и запреты для staff-пользователей,
 * которые пытаются работать с недоступной организацией.
 */
describe('Сервис tenant-доступа', () => {
  let service: TenantAccessService;

  beforeEach(() => {
    service = new TenantAccessService();
  });

  it('нормализует список доступных организаций', () => {
    expect(service.normalizeOrganizationIds([20, 10, 20])).toEqual([10, 20]);
  });

  it('разрешает superAdmin доступ к любой организации', () => {
    expect(
      service.hasOrganizationAccess(
        { role: UserRole.SUPER_ADMIN, organizationIds: [] },
        999,
      ),
    ).toBe(true);
  });

  it('разрешает доступ к своей организации', () => {
    expect(
      service.hasOrganizationAccess(
        { role: UserRole.ADMIN, organizationIds: [10, 20] },
        20,
      ),
    ).toBe(true);
  });

  it('запрещает доступ к чужой организации', () => {
    expect(() =>
      service.assertCanManageOrganization(
        { role: UserRole.ADMIN, organizationIds: [10, 20] },
        30,
      ),
    ).toThrow(ForbiddenException);
  });

  it('запрещает назначать сотрудника в недоступную организацию', () => {
    expect(() =>
      service.assertCanAssignOrganizations(
        { role: UserRole.ADMIN, organizationIds: [10, 20] },
        [10, 30],
      ),
    ).toThrow(ForbiddenException);
  });
});

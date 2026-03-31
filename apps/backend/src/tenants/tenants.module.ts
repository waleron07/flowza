import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TenantAccessService } from './tenant-access.service';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, TenantAccessService],
  exports: [TenantsService, TenantAccessService],
})
export class TenantsModule {}

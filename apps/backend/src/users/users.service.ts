import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserInput } from './types/create-user.type';
import { UserRecord } from './types/user-record.type';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPhone(phone: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    return user as UserRecord | null;
  }

  async findById(id: number): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user as UserRecord | null;
  }

  async deactivateById(id: number): Promise<UserRecord> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return user as UserRecord;
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const user = await this.prisma.user.create({
      data: {
        tenantId: input.tenantId,
        email: input.email,
        phone: input.phone,
        passwordHash: input.passwordHash,
        role: input.role,
        firstName: input.firstName,
        lastName: input.lastName,
        isActive: input.isActive ?? true,
      },
    });
    return user as UserRecord;
  }
}

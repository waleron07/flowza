import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private createPayload(user: {
    id: number;
    tenantId: number | null;
    organizationIds?: number[];
    role: string;
  }): JwtPayload {
    return {
      userId: user.id,
      tenantId: user.tenantId,
      organizationIds: user.organizationIds ?? [],
      role: user.role as UserRole,
    };
  }

  async register(dto: RegisterDto) {
    if (!dto.consentToPrivacyPolicy) {
      throw new BadRequestException('Privacy policy consent is required');
    }

    if (!/^\+7\d{10}$/.test(dto.phone)) {
      throw new BadRequestException('Phone must be a valid RU number');
    }

    const existingUser = await this.usersService.findByPhone(dto.phone);
    if (existingUser) {
      throw new ConflictException('User with this phone already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      phone: dto.phone,
      firstName: dto.firstName,
      passwordHash,
      role: UserRole.USER,
      isActive: true,
    });

    const payload = this.createPayload(user);

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        role: user.role,
        tenantId: user.tenantId,
        organizationIds: user.organizationIds ?? [],
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    const payload = this.createPayload(user);

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        role: user.role,
        tenantId: user.tenantId,
        organizationIds: user.organizationIds ?? [],
      },
    };
  }

  async me(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    return {
      id: user.id,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tenantId: user.tenantId,
      organizationIds: user.organizationIds ?? [],
      isActive: user.isActive,
    };
  }

  async deleteMe(userId: number) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.usersService.deactivateById(userId);

    return { success: true };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Nest wrapper над `PrismaClient`.
 *
 * Сервис внедряется через DI и используется всеми доменными сервисами для
 * работы с БД. Если позже понадобится lifecycle hook (`onModuleInit`,
 * graceful shutdown, query logging), его стоит добавлять здесь, а не в
 * отдельных модулях.
 */
@Injectable()
export class PrismaService extends PrismaClient {}

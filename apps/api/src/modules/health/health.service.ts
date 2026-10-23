import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@stumatch/shared';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    const databaseUp = await this.prisma.$queryRaw`SELECT 1`.then(
      () => true,
      () => false,
    );

    return {
      status: databaseUp ? 'ok' : 'error',
      database: databaseUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }
}

import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { API_ROUTES, type HealthResponse } from '@stumatch/shared';
import type { Response } from 'express';
import { HealthService } from './health.service.js';

@SkipThrottle()
@Controller(API_ROUTES.health)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** ใช้กับ health check ของ DigitalOcean — ตอบ 503 ถ้าต่อ database ไม่ได้ */
  @Get()
  async check(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const result = await this.healthService.check();
    if (result.status !== 'ok') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return result;
  }
}

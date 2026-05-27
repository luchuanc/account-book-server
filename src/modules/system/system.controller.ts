import { Controller, Get } from '@nestjs/common';

@Controller('system')
export class SystemController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'account-book-server',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('version')
  version() {
    return {
      name: 'account-book-server',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}

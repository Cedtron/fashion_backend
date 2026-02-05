import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { S3Service } from './s3.service';

@ApiTags('s3')
@Controller('s3')
export class S3Controller {
  constructor(private readonly s3Service: S3Service) {}

  @Get('status')
  @ApiOperation({ summary: 'Get S3 service status' })
  getStatus() {
    const status = this.s3Service.getStatus();
    return {
      ...status,
      message: status.s3Available 
        ? 'S3 is available and ready' 
        : 'S3 is disabled, using local storage',
    };
  }
}
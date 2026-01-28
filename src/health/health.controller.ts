import { Controller, Get } from '@nestjs/common';
import { join } from 'path';
import { existsSync, readdirSync } from 'fs';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('uploads')
  checkUploads() {
    const uploadsPath = process.env.NODE_ENV === 'production' 
      ? join(process.cwd(), 'uploads')
      : join(__dirname, '..', '..', 'uploads');
    
    const stockPath = join(uploadsPath, 'stock');
    
    return {
      uploadsPath,
      stockPath,
      uploadsExists: existsSync(uploadsPath),
      stockExists: existsSync(stockPath),
      stockFiles: existsSync(stockPath) ? readdirSync(stockPath).slice(0, 5) : [],
      sampleImageUrl: existsSync(stockPath) && readdirSync(stockPath).length > 0 
        ? `/uploads/stock/${readdirSync(stockPath)[0]}`
        : null
    };
  }
}
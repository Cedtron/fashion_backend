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
    
    let stockFiles = [];
    if (existsSync(stockPath)) {
      stockFiles = readdirSync(stockPath);
    }
    
    return {
      uploadsPath,
      stockPath,
      uploadsExists: existsSync(uploadsPath),
      stockExists: existsSync(stockPath),
      stockFiles: stockFiles.slice(0, 10), // Show first 10 files
      totalStockFiles: stockFiles.length,
      sampleImageUrl: stockFiles.length > 0 
        ? `/uploads/stock/${stockFiles[0]}`
        : null,
      testUrls: stockFiles.slice(0, 3).map(file => `/uploads/stock/${file}`)
    };
  }
}
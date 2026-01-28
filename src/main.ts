import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS for cross-instance access
  const corsOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:3000', 'http://localhost:3001'];
    
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Serve static files for uploaded images - PUBLIC ACCESS
  const uploadsPath = process.env.NODE_ENV === 'production' 
    ? join(process.cwd(), 'uploads')
    : join(__dirname, '..', 'uploads');
    
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`Current working directory: ${process.cwd()}`);
  console.log(`__dirname: ${__dirname}`);
  console.log(`Serving static files from: ${uploadsPath}`);
  console.log(`CORS enabled for origins: ${corsOrigins.join(', ')}`);
  
  // Check if uploads directory exists
  const fs = require('fs');
  if (fs.existsSync(uploadsPath)) {
    console.log(`✅ Uploads directory exists: ${uploadsPath}`);
    const stockPath = join(uploadsPath, 'stock');
    if (fs.existsSync(stockPath)) {
      const files = fs.readdirSync(stockPath);
      console.log(`✅ Stock directory has ${files.length} files`);
      console.log(`Sample files: ${files.slice(0, 3).join(', ')}`);
    } else {
      console.log(`❌ Stock directory not found: ${stockPath}`);
    }
  } else {
    console.log(`❌ Uploads directory not found: ${uploadsPath}`);
  }
  
  // Make uploads publicly accessible
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
    index: false,
    setHeaders: (res, path) => {
      console.log(`📁 Serving static file: ${path}`);
      // Set cache headers for images
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      // Allow cross-origin access
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
    },
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: false, // Set to false to allow extra fields like createdBy
    forbidNonWhitelisted: false, // Set to false to not throw error for extra fields
    transform: true, // Enable transformation
    transformOptions: {
      enableImplicitConversion: true, // Enable implicit conversion
    },
  }));

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Fashion House API')
    .setDescription('API documentation for Fashion House Database Management')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('users', 'User management endpoints')
    .addTag('suppliers', 'Supplier management endpoints')
    .addTag('categories', 'Category management endpoints')
    .addTag('subcategories', 'SubCategory management endpoints')
    .addTag('auth', 'Authentication endpoints')
    .addTag('logs', 'Log management endpoints')
    .addTag('sql', 'Raw SQL execution endpoints')
    .addTag('stock', 'Stock management endpoints')
    .addTag('shades', 'Shade management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION', reason);
});

const port = process.env.PORT || 3000;
await app.listen(port,'0.0.0.0');

console.log(`Application is running on: http://0.0.0.0:${port}`);
console.log(`Swagger documentation available at: http://0.0.0.0:${port}/api`);
}
bootstrap();


import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /* =========================
     CORS CONFIGURATION
  ========================== */
  app.enableCors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'x-username'],
  });


  /* =========================
     STATIC FILES (UPLOADS)
     ✅ SERVE IMAGES PUBLICLY
  ========================== */

  // ALWAYS resolve uploads relative to dist/
  const uploadsPath = join(__dirname, '..', 'uploads');

  console.log('================ UPLOADS DEBUG ================');
  console.log('__dirname:', __dirname);
  console.log('Resolved uploads path:', uploadsPath);

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  // Create stock directory if it doesn't exist
  const stockPath = join(uploadsPath, 'stock');
  if (!fs.existsSync(stockPath)) {
    fs.mkdirSync(stockPath, { recursive: true });
  }

  // Simple static file serving - NO COMPLEX HEADERS
  app.use('/uploads', express.static(uploadsPath));

  console.log('✅ Static files served from:', uploadsPath);
  console.log('✅ Images accessible at: http://3.91.48.66:3000/uploads/stock/filename.jpg');



  /* =========================
     GLOBAL VALIDATION
  ========================== */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  /* =========================
     SWAGGER SETUP
  ========================== */
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
    .addTag('users')
    .addTag('suppliers')
    .addTag('categories')
    .addTag('subcategories')
    .addTag('auth')
    .addTag('logs')
    .addTag('sql')
    .addTag('stock')
    .addTag('shades')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  /* =========================
     SAFETY HANDLERS
  ========================== */
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
  });

  /* =========================
     START SERVER
  ========================== */
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API running on http://0.0.0.0:${port}`);
  console.log(`📘 Swagger at http://0.0.0.0:${port}/api`);
  console.log(`🖼️  Images served at http://0.0.0.0:${port}/uploads/...`);
}

bootstrap();

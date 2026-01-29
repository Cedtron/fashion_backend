import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  /* =========================
     CORS CONFIGURATION
  ========================== */
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
      ];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  /* =========================
     STATIC FILES (UPLOADS)
     ✅ FIXED — THIS IS THE KEY
  ========================== */

  // ALWAYS resolve uploads relative to dist/
  const uploadsPath = join(__dirname, '..', 'uploads');

  console.log('================ UPLOADS DEBUG ================');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('__dirname:', __dirname);
  console.log('Resolved uploads path:', uploadsPath);

  if (fs.existsSync(uploadsPath)) {
    console.log('✅ uploads directory exists');

    const stockPath = join(uploadsPath, 'stock');
    if (fs.existsSync(stockPath)) {
      const files = fs.readdirSync(stockPath);
      console.log(`✅ stock folder found (${files.length} files)`);
      console.log('Sample files:', files.slice(0, 3));
    } else {
      console.log('❌ stock folder NOT found:', stockPath);
    }
  } else {
    console.log('❌ uploads directory NOT found');
  }

  // Make uploads PUBLIC
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads',
    index: false,
  });

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

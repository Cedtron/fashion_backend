import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { S3Service } from './s3/s3.service';
import { join } from 'path';

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
     STATIC FILE SERVING
  ========================== */
  // Serve uploaded files statically
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  console.log('📁 Static file serving enabled for /uploads');

  /* =========================
     S3 INITIALIZATION
  ========================== */
  try {
    const s3Service = app.get(S3Service);
    const s3Status = await s3Service.createBucketIfNotExists();
    
    if (s3Status.success) {
      console.log('✅ S3 Service initialized and bucket ready');
    } else {
      console.log('⚠️ S3 Service disabled:', s3Status.error);
      console.log('📁 Using local file storage instead');
    }
  } catch (error) {
    console.warn('⚠️ S3 initialization failed:', error.message);
    console.log('📁 Application will continue with local file storage');
  }



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

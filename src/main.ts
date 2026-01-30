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
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001', 
        'http://localhost:5173',
        'http://3.238.50.138:5173', // Frontend EC2 IP
        'http://3.238.50.138',      // Frontend without port
        'https://3.238.50.138:5173', // HTTPS version
        'https://3.238.50.138',      // HTTPS without port
        // Add any other frontend URLs you might have
        '*' // Allow all origins for now (you can restrict this later)
      ];

      console.log('🌐 CORS Request from origin:', origin);
      
      // For now, allow all origins to debug the issue
      console.log('✅ CORS: Allowing all origins for debugging');
      callback(null, true);
      
      /* Uncomment this block once images are working:
      if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        console.log('✅ CORS: Origin allowed');
        callback(null, true);
      } else {
        console.log('❌ CORS: Origin blocked:', origin);
        console.log('❌ Allowed origins:', allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
      */
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'Accept', 
      'Origin', 
      'X-Requested-With',
      'x-username'
    ],
    exposedHeaders: ['Content-Length', 'Content-Type'],
  });


  /* =========================
     STATIC FILES (UPLOADS)
     ✅ SERVE IMAGES PUBLICLY
  ========================== */

  // ALWAYS resolve uploads relative to dist/
  const uploadsPath = join(__dirname, '..', 'uploads');

  console.log('================ UPLOADS DEBUG ================');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('__dirname:', __dirname);
  console.log('Resolved uploads path:', uploadsPath);

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsPath)) {
    console.log('📁 Creating uploads directory...');
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  if (fs.existsSync(uploadsPath)) {
    console.log('✅ uploads directory exists');

    const stockPath = join(uploadsPath, 'stock');
    if (!fs.existsSync(stockPath)) {
      console.log('📁 Creating stock directory...');
      fs.mkdirSync(stockPath, { recursive: true });
    }
    
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

  // Serve static files with proper headers
  app.use(
    '/uploads',
    express.static(uploadsPath, {
      setHeaders: (res, path) => {
        console.log('📁 Serving static file:', path);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        res.setHeader('Content-Type', 'image/jpeg'); // Default to JPEG, Express will override if needed
      },
    }),
  );

  // Add a test route to check if static serving works
  app.use('/test-uploads', (req, res) => {
    const stockPath = join(uploadsPath, 'stock');
    if (fs.existsSync(stockPath)) {
      const files = fs.readdirSync(stockPath);
      res.json({
        message: 'Uploads directory accessible',
        uploadsPath,
        stockPath,
        files: files.slice(0, 10), // Show first 10 files
        sampleUrl: files.length > 0 ? `/uploads/stock/${files[0]}` : 'No files found',
        fullSampleUrl: files.length > 0 ? `http://3.91.48.66:3000/uploads/stock/${files[0]}` : 'No files found'
      });
    } else {
      res.status(404).json({
        message: 'Stock directory not found',
        uploadsPath,
        stockPath
      });
    }
  });

  // Add CORS test endpoint
  app.use('/test-cors', (req, res) => {
    res.json({
      message: 'CORS is working!',
      origin: req.headers.origin,
      timestamp: new Date().toISOString(),
      headers: req.headers
    });
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

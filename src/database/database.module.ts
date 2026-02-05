import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as mysql from 'mysql2/promise';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const nodeEnv = configService.get('NODE_ENV', 'production');
        
        // Skip database connection in development mode
        if (nodeEnv === 'development') {
          console.log('⚠️  Running in development mode - database connection skipped');
          console.log('💡 To enable database: set NODE_ENV=production in .env');
          
          // Return a minimal configuration that won't try to connect
          return {
            type: 'mysql',
            host: 'localhost',
            port: 3306,
            username: 'root',
            password: '',
            database: 'test',
            entities: [],
            synchronize: false,
            logging: false,
            autoLoadEntities: false,
          };
        }

        // Production MySQL configuration
        const host = configService.get('DB_HOST', 'localhost');
        const port = configService.get<number>('DB_PORT', 3306);
        const username = configService.get('DB_USERNAME', 'fashion_user');
        const password = configService.get('DB_PASSWORD', 'Pass123');
        const database = configService.get('DB_DATABASE', 'fashion_house');

        console.log(`🗄️  Connecting to MySQL database: ${database}@${host}:${port}`);

        // Try to create database if it doesn't exist
        try {
          const connection = await mysql.createConnection({
            host,
            port,
            user: username,
            password,
            multipleStatements: true,
          });
          await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`);
          await connection.end();
          console.log(`✅ Database '${database}' is ready`);
        } catch (err) {
          console.error('❌ Database connection failed:', err?.message || err);
          throw new Error(`Database connection failed: ${err?.message || err}`);
        }

        return {
          type: 'mysql',
          host,
          port,
          username,
          password,
          database,
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          synchronize: configService.get('DB_SYNCHRONIZE', 'true') === 'true',
          logging: configService.get('DB_LOGGING', 'false') === 'true',
          charset: 'utf8mb4',
          timezone: '+00:00',
        };
      },
    }),
  ],
})
export class DatabaseModule {}


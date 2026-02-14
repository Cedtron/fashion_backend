import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RekognitionService } from './rekognition.service';
import { RekognitionController } from './rekognition.controller';
import { StockModule } from '../stock/stock.module';

@Module({
  imports: [ConfigModule, StockModule],
  controllers: [RekognitionController],
  providers: [RekognitionService],
  exports: [RekognitionService],
})
export class RekognitionModule {}
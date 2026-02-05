import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  UseInterceptors,
  UploadedFile,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { StockService } from './stock.service';
import { StockTrackingService } from './stock-tracking.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { SearchStockDto } from './dto/search-stock.dto';
import { Stock } from '../entities/stock.entity';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import type { Express } from 'express';
import { S3Service } from '../s3/s3.service';


@ApiTags('stock')
@Controller('stock')
export class StockController {
  constructor(
    private readonly stockService: StockService,
    private readonly trackingService: StockTrackingService,
    private readonly s3Service: S3Service,
  ) {}

  // Ensure upload directory exists
  private ensureUploadDirectory() {
    const uploadPath = './uploads/stock';
    if (!existsSync(uploadPath)) {
      mkdirSync(uploadPath, { recursive: true });
    }
  }

  // ============================================================
  // CREATE STOCK
  // ============================================================
  @Post()
  @ApiOperation({ summary: 'Create a new stock item' })
  @ApiResponse({ status: 201, description: 'Stock created successfully', type: Stock })
  @ApiHeader({ name: 'x-username', required: false })
  async create(
    @Body() dto: CreateStockDto,
    @Headers('x-username') username?: string,
  ) {
    return await this.stockService.create(dto, username || 'system');
  }

  // ============================================================
  // IMAGE UPLOAD - NOW USING S3
  // ============================================================
  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(), // Keep in memory for S3 upload
    }),
  )
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Headers('x-username') username?: string,
  ) {
    console.log('[UPLOAD] File =>', file?.originalname, file?.size);

    // 1️⃣ Validate upload
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedExt = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = extname(file.originalname).toLowerCase();

    if (!allowedExt.includes(ext)) {
      throw new BadRequestException(
        'Invalid image type. Allowed: png, jpg, jpeg, webp',
      );
    }

    if (file.size < 100) {
      throw new BadRequestException('File too small or corrupted');
    }

    try {
      // 2️⃣ Get current stock to check for old image
      const stock = await this.stockService.findOne(id);

      // 3️⃣ Upload new image to S3 or local storage
      console.log('📤 Uploading image...');
      const uploadResult = await this.s3Service.uploadFile(file, 'stock');
      
      let responseMessage = 'Image uploaded successfully';
      if (uploadResult.error) {
        responseMessage += ` (${uploadResult.error})`;
      }
      
      console.log('✅ Upload successful:', uploadResult.url);

      // 4️⃣ Delete old image if exists
      if (stock.imagePath) {
        try {
          console.log('🗑️ Deleting old image...');
          const deleteResult = await this.s3Service.deleteFile(stock.imagePath);
          if (!deleteResult.success) {
            console.warn('Failed to delete old image:', deleteResult.error);
          }
        } catch (e) {
          console.warn('Failed to delete old image:', e.message);
        }
      }

      // 5️⃣ Update stock with new URL
      const updatedStock = await this.stockService.uploadImage(
        id,
        uploadResult.url,
        username || 'system',
      );

      // 6️⃣ Return response
      return {
        message: responseMessage,
        imagePath: updatedStock.imagePath,
        imageHash: updatedStock.imageHash,
        stock: updatedStock,
        storageType: uploadResult.isS3 ? 'S3' : 'Local',
      };
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  // ============================================================
  // SEARCH BY IMAGE - SIMPLIFIED FOR NOW
  // ============================================================
  @Post('search-by-photo')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(), // Keep in memory for S3 upload
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async searchByPhoto(@UploadedFile() file: Express.Multer.File) {
    console.log('[SEARCH-BY-PHOTO] File:', file?.originalname, file?.size);

    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const allowedExt = ['.png', '.jpg', '.jpeg', '.webp'];
    const ext = extname(file.originalname).toLowerCase();

    if (!allowedExt.includes(ext)) {
      throw new BadRequestException(
        'Unsupported image type. Allowed: png, jpg, jpeg, webp',
      );
    }

    try {
      // For now, return a simple message that S3 search is being implemented
      return {
        message: 'Image search with S3 is being implemented',
        uploadedFile: file.originalname,
        fileSize: file.size,
        // TODO: Implement actual image search using S3 URLs
        results: []
      };
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw new BadRequestException(`Search failed: ${error.message}`);
    }
  }


  @Get('alerts')
  async getAlerts() {
    return this.stockService.getStockAlerts();
  }

  @Get('summary/overview')
  async getInventorySummary() {
    return this.stockService.getInventorySummary();
  }

  @Get(':id/activity-summary')
  async getStockActivitySummary(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.getStockActivitySummary(id);
  }

  // ============================================================
  // GET ALL / SEARCH
  // ============================================================
  @Get()
  @ApiOperation({ summary: 'Get all stocks or search filters' })
  @ApiQuery({ name: 'name', required: false })
  @ApiQuery({ name: 'stockId', required: false })
  @ApiQuery({ name: 'category', required: false })
  findAll(@Query() searchDto: SearchStockDto) {
    if (Object.keys(searchDto).length > 0) {
      return this.stockService.search(searchDto);
    }
    return this.stockService.findAll();
  }

  // LOW STOCK
  @Get('low-stock')
  @ApiOperation({ summary: 'Get low stock items' })
  getLowStock() {
    return this.stockService.getLowStock();
  }

  // GET ONE STOCK
  @Get(':id')
  @ApiOperation({ summary: 'Get single stock item' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.findOne(id);
  }

  // GET STOCK HISTORY
  @Get(':id/history')
  @ApiOperation({ summary: 'Get stock inventory history' })
  async getHistory(@Param('id', ParseIntPipe) id: number) {
    const stock = await this.stockService.findOne(id);
    return stock.history;
  }

  // TRACKING (ALL)
  @Get('tracking/all')
  @ApiOperation({ summary: 'Get full tracking list (paginated)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getAllTracking(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return await this.trackingService.getAllTracking(
      limit ? Math.min(Number(limit), 1000) : 1000,
      offset ? Number(offset) : 0,
    );
  }

  // TRACKING STATS
  @Get('tracking/stats')
  @ApiOperation({ summary: 'Get tracking statistics' })
  getTrackingStats() {
    return this.trackingService.getTrackingStats();
  }

  // TRACKING BY ACTION TYPE
  @Get('tracking/by-action/:action')
  @ApiOperation({ summary: 'Filter tracking by action type' })
  @ApiQuery({ name: 'limit', required: false })
  async getTrackingByAction(
    @Param('action') action: string,
    @Query('limit') limit?: number,
  ) {
    return await this.trackingService.getTrackingByAction(action.toUpperCase() as any, limit || 50);
  }

  // TRACKING BY USER
  @Get('tracking/by-user/:username')
  @ApiOperation({ summary: 'Filter tracking by username' })
  @ApiQuery({ name: 'limit', required: false })
  async getTrackingByUser(
    @Param('username') username: string,
    @Query('limit') limit?: number,
  ) {
    return await this.trackingService.getTrackingByUser(username, limit || 50);
  }

  // STOCK TRACKING (ONE)
  @Get(':id/tracking')
  @ApiOperation({ summary: 'Get tracking for a specific stock item' })
  async getTracking(@Param('id', ParseIntPipe) id: number) {
    return this.stockService.getStockTracking(id);
  }

  // ============================================================
  // UPDATE STOCK
  // ============================================================
  @Patch(':id')
  @ApiOperation({ summary: 'Update stock info' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStockDto,
    @Headers('x-username') username?: string,
  ) {
    return await this.stockService.update(id, dto, username || 'system');
  }

  // ============================================================
  // COMPLETE UPDATE (WITH SHADES) - ADD THIS!
  // ============================================================
  @Patch(':id/complete')
  @ApiOperation({ summary: 'Complete stock update including shades' })
  async completeUpdate(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: any,
    @Headers('x-username') username?: string,
  ) {
    return await this.stockService.completeUpdate(id, updateData, username || 'system');
  }

  // ============================================================
  // ADJUST STOCK
  // ============================================================
  @Patch(':id/adjust')
  @ApiOperation({ summary: 'Increase or decrease stock quantity' })
  async adjustStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdjustStockDto,
    @Headers('x-username') username?: string,
  ) {
    return await this.stockService.adjustStock(id, dto, username || 'system');
  }

  // ============================================================
  // DELETE STOCK
  // ============================================================
  @Delete(':id')
  @ApiOperation({ summary: 'Delete stock item' })
  async remove(@Param('id', ParseIntPipe) id: number, @Headers('x-username') username?: string) {
    return await this.stockService.remove(id, username || 'system');
  }
}
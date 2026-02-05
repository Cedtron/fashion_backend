import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private s3Available: boolean = false;
  private uploadsDir: string;

  constructor(private configService: ConfigService) {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadsDirectory();

    // Check if S3 is disabled
    const disableS3 = this.configService.get<string>('DISABLE_S3', 'false') === 'true';
    if (disableS3) {
      console.log('⚠️ S3 disabled by configuration (DISABLE_S3=true)');
      console.log('📁 Using local file storage only');
      this.s3Available = false;
      return;
    }

    try {
      const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
      const region = this.configService.get<string>('AWS_REGION');

      if (!accessKeyId || !secretAccessKey || !region) {
        throw new Error('Missing AWS credentials or region');
      }

      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      
      this.bucketName = this.configService.get<string>('S3_BUCKET_NAME', 'fashion-house-images');
      console.log('✅ S3 Service initialized');
      console.log('📦 Bucket:', this.bucketName);
      console.log('🌍 Region:', region);
    } catch (error) {
      console.warn('⚠️ S3 Service initialization failed:', error.message);
      console.log('📁 Will use local file storage instead');
      this.s3Available = false;
    }
  }

  private ensureUploadsDirectory(): void {
    const stockDir = path.join(this.uploadsDir, 'stock');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(stockDir)) {
      fs.mkdirSync(stockDir, { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'stock'): Promise<{ url: string; isS3: boolean; error?: string }> {
    // Try S3 first if available
    if (this.s3Available) {
      try {
        const s3Url = await this.uploadToS3(file, folder);
        return { url: s3Url, isS3: true };
      } catch (error) {
        console.error('❌ S3 Upload failed, falling back to local storage:', error.message);
        // Fall through to local storage
      }
    }

    // Fallback to local storage
    try {
      const localUrl = await this.saveToLocal(file, folder);
      return { 
        url: localUrl, 
        isS3: false, 
        error: this.s3Available ? 'S3 upload failed, using local storage' : 'S3 not available, using local storage'
      };
    } catch (error) {
      console.error('❌ Local storage also failed:', error.message);
      throw new Error(`Both S3 and local storage failed: ${error.message}`);
    }
  }

  private async uploadToS3(file: Express.Multer.File, folder: string): Promise<string> {
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    });

    console.log('📤 Uploading to S3:', fileName);
    await this.s3Client.send(command);
    
    const publicUrl = `https://${this.bucketName}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${fileName}`;
    console.log('✅ S3 Upload successful:', publicUrl);
    return publicUrl;
  }

  private async saveToLocal(file: Express.Multer.File, folder: string): Promise<string> {
    const fileName = `${Date.now()}-${file.originalname}`;
    const folderPath = path.join(this.uploadsDir, folder);
    const filePath = path.join(folderPath, fileName);

    // Ensure folder exists
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Save file
    fs.writeFileSync(filePath, file.buffer);
    
    const localUrl = `/uploads/${folder}/${fileName}`;
    console.log('📁 Local storage successful:', localUrl);
    return localUrl;
  }

  async deleteFile(fileUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (fileUrl.includes('s3.amazonaws.com')) {
        // S3 file
        if (!this.s3Available) {
          return { success: false, error: 'S3 not available' };
        }

        const url = new URL(fileUrl);
        const key = url.pathname.substring(1);
        
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });

        console.log('🗑️ Deleting from S3:', key);
        await this.s3Client.send(command);
        console.log('✅ S3 Delete successful');
        return { success: true };
      } else {
        // Local file
        const filePath = path.join(process.cwd(), fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('✅ Local file deleted:', filePath);
          return { success: true };
        } else {
          return { success: false, error: 'File not found' };
        }
      }
    } catch (error) {
      console.error('❌ Delete failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async createBucketIfNotExists(): Promise<{ success: boolean; error?: string }> {
    if (!this.s3Available) {
      return { success: false, error: 'S3 not initialized' };
    }

    try {
      const headCommand = new HeadBucketCommand({ Bucket: this.bucketName });
      await this.s3Client.send(headCommand);
      console.log('✅ S3 Bucket exists:', this.bucketName);
      this.s3Available = true;
      return { success: true };
    } catch (error) {
      console.error('❌ S3 Bucket access failed:', error.message);
      console.log('⚠️ S3 will be disabled. Images will use local storage fallback.');
      this.s3Available = false;
      return { success: false, error: error.message };
    }
  }

  getPublicUrl(key: string): string {
    if (this.s3Available) {
      return `https://${this.bucketName}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${key}`;
    }
    return `/uploads/${key}`;
  }

  isS3Available(): boolean {
    return this.s3Available;
  }

  getStatus(): { s3Available: boolean; bucketName: string; uploadsDir: string } {
    return {
      s3Available: this.s3Available,
      bucketName: this.bucketName,
      uploadsDir: this.uploadsDir,
    };
  }
}
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;
  private s3Enabled: boolean = true;
  private region: string;

  constructor(private configService: ConfigService) {
    const useIamRole = this.configService.get<string>('USE_IAM_ROLE', 'true') === 'true';
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME', 'fashion-house-images');
    
    try {
      if (useIamRole) {
        // Use IAM role credentials (automatic on EC2)
        this.s3Client = new S3Client({
          region: this.region,
          // No credentials needed - will use IAM role attached to EC2 instance
        });
        console.log('✅ S3 Service initialized with IAM Role');
      } else {
        // Use access keys (fallback for local development)
        const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
        const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
        
        if (!accessKeyId || !secretAccessKey) {
          throw new Error('AWS credentials not configured');
        }
        
        this.s3Client = new S3Client({
          region: this.region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
        console.log('✅ S3 Service initialized with Access Keys');
      }
      
      console.log('📦 Bucket:', this.bucketName);
      console.log('🌍 Region:', this.region);
    } catch (error) {
      console.error('❌ S3 initialization failed:', error.message);
      console.log('⚠️ S3 disabled - using local storage only');
      this.s3Enabled = false;
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'stock'): Promise<{ url: string; isS3: boolean; error?: string }> {
    // If S3 is disabled, save locally
    if (!this.s3Enabled) {
      const localUrl = this.saveFileLocally(file, folder);
      return { url: localUrl, isS3: false };
    }

    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
     
    });

    try {
      console.log('📤 Uploading to S3:', fileName);
      await this.s3Client.send(command);
      
      // Return the public URL
      const publicUrl = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${fileName}`;
      console.log('✅ Upload successful:', publicUrl);
      return { url: publicUrl, isS3: true };
    } catch (error) {
      console.error('❌ S3 Upload failed:', error.message);
      console.log('⚠️ Falling back to local storage');
      
      // Fallback to local storage
      const localUrl = this.saveFileLocally(file, folder);
      return { url: localUrl, isS3: false, error: error.message };
    }
  }

  private saveFileLocally(file: Express.Multer.File, folder: string): string {
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads', folder);
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const fileName = `${Date.now()}-${file.originalname}`;
      const filePath = path.join(uploadsDir, fileName);
      
      // Save file
      fs.writeFileSync(filePath, file.buffer);
      
      const localUrl = `/uploads/${folder}/${fileName}`;
      console.log('💾 Saved locally:', localUrl);
      return localUrl;
    } catch (error) {
      console.error('❌ Local save failed:', error.message);
      throw new Error('Failed to save file');
    }
  }

  async deleteFile(fileUrl: string): Promise<{ success: boolean; error?: string }> {
    // If it's a local file, delete locally
    if (fileUrl.startsWith('/uploads/')) {
      try {
        const filePath = path.join(process.cwd(), fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('✅ Local file deleted:', fileUrl);
        }
        return { success: true };
      } catch (error) {
        console.error('❌ Local delete failed:', error.message);
        return { success: false, error: error.message };
      }
    }

    // If S3 is disabled, skip
    if (!this.s3Enabled) {
      console.log('⚠️ S3 disabled - skipping delete');
      return { success: false, error: 'S3 disabled' };
    }

    try {
      // Extract key from S3 URL
      const url = new URL(fileUrl);
      const key = url.pathname.substring(1); // Remove leading slash
      
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      console.log('🗑️ Deleting from S3:', key);
      await this.s3Client.send(command);
      console.log('✅ Delete successful');
      return { success: true };
    } catch (error) {
      console.error('❌ S3 Delete failed:', error.message);
      return { success: false, error: error.message };
    }
  }


  getPublicUrl(key: string): string {
    if (!this.s3Enabled) {
      return `/uploads/${key}`;
    }
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  isS3Enabled(): boolean {
    return this.s3Enabled;
  }

  getStatus(): { enabled: boolean; bucket: string; region: string } {
    return {
      enabled: this.s3Enabled,
      bucket: this.bucketName,
      region: this.region,
    };
  }
}

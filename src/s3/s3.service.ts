import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
    
    this.bucketName = this.configService.get<string>('S3_BUCKET_NAME', 'fashion-house-images');
    console.log('✅ S3 Service initialized');
    console.log('📦 Bucket:', this.bucketName);
    console.log('🌍 Region:', this.configService.get<string>('AWS_REGION'));
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'stock'): Promise<string> {
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read', // Make it publicly accessible
    });

    try {
      console.log('📤 Uploading to S3:', fileName);
      await this.s3Client.send(command);
      
      // Return the public URL
      const publicUrl = `https://${this.bucketName}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${fileName}`;
      console.log('✅ Upload successful:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('❌ S3 Upload failed:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
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
    } catch (error) {
      console.error('❌ S3 Delete failed:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }

  async createBucketIfNotExists(): Promise<void> {
    try {
      const headCommand = new HeadBucketCommand({ Bucket: this.bucketName });
      await this.s3Client.send(headCommand);
      console.log('✅ S3 Bucket exists:', this.bucketName);
    } catch (error) {
      if (error.name === 'NotFound') {
        console.log('📦 Creating S3 bucket:', this.bucketName);
        
        const createCommand = new CreateBucketCommand({ 
          Bucket: this.bucketName,
          CreateBucketConfiguration: {
            LocationConstraint: this.configService.get<string>('AWS_REGION')
          }
        });
        await this.s3Client.send(createCommand);
        
        // Set bucket policy to allow public read access to images
        const bucketPolicy = {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'PublicReadGetObject',
              Effect: 'Allow',
              Principal: '*',
              Action: 's3:GetObject',
              Resource: `arn:aws:s3:::${this.bucketName}/*`
            }
          ]
        };

        const policyCommand = new PutBucketPolicyCommand({
          Bucket: this.bucketName,
          Policy: JSON.stringify(bucketPolicy)
        });
        await this.s3Client.send(policyCommand);

        console.log('✅ S3 Bucket created and configured:', this.bucketName);
      } else {
        throw error;
      }
    }
  }

  getPublicUrl(key: string): string {
    return `https://${this.bucketName}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${key}`;
  }
}
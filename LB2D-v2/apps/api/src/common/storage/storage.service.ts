import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private bucket: string;
  private region: string;
  private useS3: boolean;

  constructor(private configService: ConfigService) {
    this.useS3 = this.configService.get('NODE_ENV') === 'production';
    this.bucket = this.configService.get('AWS_S3_BUCKET') || 'lb2d-assets';
    this.region = this.configService.get('AWS_REGION') || 'us-east-1';

    if (this.useS3) {
      const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

      if (!accessKeyId || !secretAccessKey) {
        this.logger.warn('AWS credentials not found, falling back to local storage');
        this.useS3 = false;
      } else {
        this.s3Client = new S3Client({
          region: this.region,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
        this.logger.log('S3 Storage initialized');
      }
    }

    if (!this.useS3) {
      this.logger.log('Using local file storage (development mode)');
    }
  }

  /**
   * Upload file to S3 or local storage
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
    const key = `${folder}/${fileName}`;

    if (this.useS3) {
      try {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
          }),
        );

        const cloudFrontUrl = this.configService.get('AWS_CLOUDFRONT_URL');
        const url = cloudFrontUrl
          ? `${cloudFrontUrl}/${key}`
          : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

        this.logger.log(`File uploaded to S3: ${key}`);
        return url;
      } catch (error) {
        this.logger.error('S3 upload failed:', error);
        throw new Error('File upload failed');
      }
    } else {
      // Local storage for development
      const fs = require('fs');
      const uploadPath = this.configService.get('UPLOAD_DIR') || './uploads';
      const folderPath = path.join(uploadPath, folder);

      // Create folder if doesn't exist
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      const filePath = path.join(folderPath, fileName);
      fs.writeFileSync(filePath, file.buffer);

      this.logger.log(`File saved locally: ${filePath}`);
      return `/uploads/${folder}/${fileName}`;
    }
  }

  /**
   * Delete file from S3 or local storage
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (this.useS3) {
      // Extract key from URL
      const key = fileUrl.split('/').slice(3).join('/');

      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
          }),
        );
        this.logger.log(`File deleted from S3: ${key}`);
      } catch (error) {
        this.logger.error('S3 delete failed:', error);
      }
    } else {
      // Local storage deletion
      const fs = require('fs');
      const uploadPath = this.configService.get('UPLOAD_DIR') || './uploads';
      const filePath = path.join(uploadPath, fileUrl.replace('/uploads/', ''));

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`File deleted locally: ${filePath}`);
      }
    }
  }

  /**
   * Generate presigned URL for direct upload (for large files)
   */
  async getPresignedUploadUrl(
    folder: string,
    fileName: string,
    contentType: string,
  ): Promise<string> {
    if (!this.useS3) {
      throw new Error('Presigned URLs only available with S3');
    }

    const key = `${folder}/${uuidv4()}${path.extname(fileName)}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return url;
  }

  /**
   * Generate presigned URL for download
   */
  async getPresignedDownloadUrl(key: string): Promise<string> {
    if (!this.useS3) {
      return key; // Return original path for local files
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return url;
  }
}

import imageCompression from 'browser-image-compression';
import { ACTIVE_STORAGE_PROVIDER, STORAGE_SETTINGS, SUPABASE_CONFIG, R2_CONFIG } from './config';

// ============================================
// SUPABASE STORAGE IMPLEMENTATION
// ============================================
class SupabaseStorageService {
  supabase = null;

  constructor() {
    // Dynamically import Supabase client
    this.initClient();
  }

  async initClient() {
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
      console.warn('Supabase config not set. File uploads will not work.');
      return;
    }
    
    try {
      const { createClient } = await import('@supabase/supabase-js');
      this.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    } catch (error) {
      console.error('Failed to initialize Supabase client:', error);
    }
  }

  async uploadFile(file, options = {}) {
    if (!this.supabase) {
      await this.initClient();
    }

    if (!this.supabase) {
      throw new Error('Supabase client not initialized. Check your configuration.');
    }

    // Validate file
    this.validateFile(file);

    // Compress if image and compression enabled
    let fileToUpload = file;
    if (options.compress !== false && file.type.startsWith('image/')) {
      fileToUpload = await this.compressImage(file);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = options.roomId 
      ? `${options.roomId}/${timestamp}_${sanitizedName}`
      : `${options.folder || 'general'}/${timestamp}_${sanitizedName}`;

    // Upload to Supabase
    const { error } = await this.supabase
      .storage
      .from(SUPABASE_CONFIG.bucketName)
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = this.supabase
      .storage
      .from(SUPABASE_CONFIG.bucketName)
      .getPublicUrl(fileName);

    return {
      url: publicUrl,
      fileName: file.name,
      fileSize: fileToUpload.size,
      mimeType: file.type,
    };
  }

  async deleteFile(filePath) {
    if (!this.supabase) return;

    const { error } = await this.supabase
      .storage
      .from(SUPABASE_CONFIG.bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Failed to delete file:', error);
    }
  }

  validateFile(file) {
    // Check file size
    if (file.size > STORAGE_SETTINGS.maxFileSize) {
      throw new Error(`File too large. Max size: ${STORAGE_SETTINGS.maxFileSize / 1024 / 1024}MB`);
    }

    // Check file type
    if (!STORAGE_SETTINGS.allowedFileTypes.includes(file.type)) {
      throw new Error(`File type not allowed: ${file.type}`);
    }
  }

  async compressImage(file) {
    if (!file.type.startsWith('image/')) return file;

    try {
      const compressedFile = await imageCompression(file, {
        maxWidthOrHeight: STORAGE_SETTINGS.imageCompression.maxWidthOrHeight,
        useWebWorker: STORAGE_SETTINGS.imageCompression.useWebWorker,
        maxIteration: STORAGE_SETTINGS.imageCompression.maxIteration,
        fileType: file.type,
      });

      return compressedFile;
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
      return file;
    }
  }
}

// ============================================
// CLOUDFLARE R2 IMPLEMENTATION (S3-Compatible)
// ============================================
class R2StorageService {
  s3Client = null;

  constructor() {
    this.initClient();
  }

  async initClient() {
    if (!R2_CONFIG.accessKeyId || !R2_CONFIG.secretAccessKey) {
      console.warn('R2 config not set. File uploads will not work.');
      return;
    }

    try {
      const { S3Client } = await import('@aws-sdk/client-s3');
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: R2_CONFIG.accessKeyId,
          secretAccessKey: R2_CONFIG.secretAccessKey,
        },
      });
    } catch (error) {
      console.error('Failed to initialize R2 client:', error);
    }
  }

  async uploadFile(file, options = {}) {
    if (!this.s3Client) {
      await this.initClient();
    }

    if (!this.s3Client) {
      throw new Error('R2 client not initialized. Check your configuration.');
    }

    // Validate file
    this.validateFile(file);

    // Compress if image
    let fileToUpload = file;
    if (options.compress !== false && file.type.startsWith('image/')) {
      fileToUpload = await this.compressImage(file);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = options.roomId 
      ? `rooms/${options.roomId}/${timestamp}_${sanitizedName}`
      : `${options.folder || 'general'}/${timestamp}_${sanitizedName}`;

    // Upload to R2
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    
    const arrayBuffer = await fileToUpload.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    await this.s3Client.send(new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: key,
      Body: uint8Array,
      ContentType: file.type,
      ContentLength: fileToUpload.size,
    }));

    // Construct public URL
    const publicUrl = R2_CONFIG.publicUrl 
      ? `${R2_CONFIG.publicUrl}/${key}`
      : `https://${R2_CONFIG.bucketName}.${R2_CONFIG.accountId}.r2.dev/${key}`;

    return {
      url: publicUrl,
      fileName: file.name,
      fileSize: fileToUpload.size,
      mimeType: file.type,
    };
  }

  async deleteFile(key) {
    if (!this.s3Client) return;

    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      await this.s3Client.send(new DeleteObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: key,
      }));
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }

  validateFile(file) {
    if (file.size > STORAGE_SETTINGS.maxFileSize) {
      throw new Error(`File too large. Max size: ${STORAGE_SETTINGS.maxFileSize / 1024 / 1024}MB`);
    }

    if (!STORAGE_SETTINGS.allowedFileTypes.includes(file.type)) {
      throw new Error(`File type not allowed: ${file.type}`);
    }
  }

  async compressImage(file) {
    if (!file.type.startsWith('image/')) return file;

    try {
      const compressedFile = await imageCompression(file, {
        maxWidthOrHeight: STORAGE_SETTINGS.imageCompression.maxWidthOrHeight,
        useWebWorker: STORAGE_SETTINGS.imageCompression.useWebWorker,
        maxIteration: STORAGE_SETTINGS.imageCompression.maxIteration,
        fileType: file.type,
      });

      return compressedFile;
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
      return file;
    }
  }
}

// ============================================
// STORAGE SERVICE FACTORY
// ============================================
class StorageService {
  provider;
  service;

  constructor() {
    this.provider = ACTIVE_STORAGE_PROVIDER;
    
    if (this.provider === 'r2') {
      this.service = new R2StorageService();
    } else {
      this.service = new SupabaseStorageService();
    }
  }

  async uploadFile(file, options) {
    return this.service.uploadFile(file, options);
  }

  async deleteFile(path) {
    return this.service.deleteFile(path);
  }

  getProvider() {
    return this.provider;
  }
}

// Export singleton instance
export const storageService = new StorageService();

// Export individual services for testing
export { SupabaseStorageService, R2StorageService };

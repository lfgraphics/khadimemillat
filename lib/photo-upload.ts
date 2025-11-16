import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  success: boolean;
  error?: string;
}

export async function uploadPhotoToCloudinary(
  file: File,
  folder: string = 'survey-photos'
): Promise<UploadResult> {
  try {
    // Convert File to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // Limit size to reduce storage
        { quality: 'auto:good' } // Optimize quality
      ]
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      success: true
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      url: '',
      publicId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed'
    };
  }
}

export async function uploadMultiplePhotos(
  files: File[],
  folder: string = 'survey-photos'
): Promise<UploadResult[]> {
  const uploadPromises = files.map(file => uploadPhotoToCloudinary(file, folder));
  return Promise.all(uploadPromises);
}
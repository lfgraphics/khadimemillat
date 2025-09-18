// DEPRECATED: Use '@/lib/cloudinary-server' for server uploads and '@/lib/cloudinary-client' for URL generation.
// This file remains temporarily to avoid breaking older imports; it will be removed after migration cleanup.
export { uploadImage, cloudinary } from './cloudinary-server'
export { getCloudinaryUrl } from './cloudinary-client'

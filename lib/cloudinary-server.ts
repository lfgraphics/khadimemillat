import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export async function uploadImage(bufferOrPath: string | Buffer, options: any = {}) {
  return cloudinary.uploader.upload(bufferOrPath as any, { folder: 'kmwf/products', ...options })
}

export { cloudinary }

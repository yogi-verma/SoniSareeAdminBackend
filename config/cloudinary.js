import { v2 as cloudinary } from 'cloudinary';

export function configureCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });

  return cloudinary;
}

export function uploadProductPhoto(fileBuffer) {
  const client = configureCloudinary();

  return new Promise((resolve, reject) => {
    const upload = client.uploader.upload_stream({
      folder: 'soni-saree-showroom/products',
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 1600, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    }, (error, result) => {
      if (error) return reject(error);
      if (!result?.secure_url || !result.public_id) {
        return reject(new Error('Cloudinary did not return the uploaded image details.'));
      }
      return resolve({ url: result.secure_url, publicId: result.public_id });
    });

    upload.end(fileBuffer);
  });
}

export async function deleteProductPhoto(publicId) {
  if (!publicId) return;
  const client = configureCloudinary();
  await client.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
}

import 'server-only';
import { v2 as cloudinary } from 'cloudinary';
import { randomToken, sign, unsign } from './server';
function cloud() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) throw new Error('Document uploads are not configured yet.');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  return cloudinary;
}
export type StoredFile = {
  publicId: string;
  name: string;
  resourceType: string;
  bytes: number;
};
export async function upload(file: File): Promise<StoredFile> {
  if (file.size > 10 * 1024 * 1024 || !file.size) throw new Error('Each file must be between 1 byte and 10 MB.');
  const buffer = Buffer.from(await file.arrayBuffer());
  const pdf = buffer.subarray(0, 5).toString() === '%PDF-',
    jpg = buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255,
    png = buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (!pdf && !jpg && !png) throw new Error('Only valid PDF, JPG and PNG files are allowed.');
  const c = cloud();
  const ext = pdf ? 'pdf' : jpg ? 'jpg' : 'png';
  const result = await new Promise<{
    public_id: string;
    bytes: number;
  }>((resolve, reject) => {
    const stream = c.uploader.upload_stream({
      resource_type: 'raw',
      type: 'authenticated',
      public_id: `sureway/${randomToken()}.${ext}`,
      overwrite: false
    }, (error, result) => {
      if (error || !result) reject(new Error('Document upload failed. Please try again.'));else resolve(result);
    });
    stream.end(buffer);
  });
  return {
    publicId: result.public_id,
    name: file.name.slice(0, 150),
    resourceType: 'raw',
    bytes: result.bytes
  };
}
export function uploadToken(file: StoredFile) {
  return sign({
    ...file,
    purpose: 'upload',
    exp: Date.now() + 3600000
  });
}
export function resolveUpload(token: string): StoredFile {
  const data = unsign(token);
  if (data.purpose !== 'upload' || typeof data.publicId !== 'string') throw new Error('Invalid upload token');
  return {
    publicId: String(data.publicId),
    name: String(data.name),
    resourceType: 'raw',
    bytes: Number(data.bytes)
  };
}
export function download(file: StoredFile) {
  return {
    name: file.name,
    url: cloud().utils.private_download_url(file.publicId, '', {
      type: 'authenticated',
      resource_type: 'raw',
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      attachment: true
    })
  };
}

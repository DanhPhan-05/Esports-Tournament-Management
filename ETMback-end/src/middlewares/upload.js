import multer from 'multer';
import { randomUUID } from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { HttpError } from './errorHandler.js';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return callback(new HttpError(415, 'Unsupported file type', 'INVALID_FILE'));
    callback(null, true);
  },
});

export async function uploadImage(file, folder = 'uploads') {
  if (!file) throw new HttpError(400, 'Image is required', 'MISSING_FILE');
  const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!credentials || !bucketName) throw new Error('Firebase storage is not configured');
  if (!getApps().length) initializeApp({ credential: cert(JSON.parse(credentials)), storageBucket: bucketName });
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.mimetype];
  const object = getStorage().bucket().file(`${folder}/${randomUUID()}.${extension}`);
  await object.save(file.buffer, { contentType: file.mimetype, resumable: false });
  return { bucket: bucketName, path: object.name };
}

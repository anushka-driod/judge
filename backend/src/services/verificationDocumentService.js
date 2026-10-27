import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serviceDirectory = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = path.resolve(
  process.env.VIDHISETU_UPLOAD_DIR || path.resolve(serviceDirectory, '../../uploads/verification-docs')
);
const allowedTypes = new Map([
  ['.pdf', 'application/pdf'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
]);
const maximumSize = 20 * 1024 * 1024;

export function validateVerificationDocument(doc) {
  const { filename, base64Data, documentType } = doc || {};
  let filetype = doc?.filetype;

  if (!filename || !base64Data || !documentType) {
    throw new Error('Document name, verification document type, and file contents are required.');
  }

  const extension = path.extname(filename).toLowerCase();
  const expectedType = allowedTypes.get(extension);
  if (!filetype && expectedType) {
    filetype = expectedType;
    doc.filetype = expectedType;
  }

  if (!expectedType || (filetype && expectedType !== filetype.toLowerCase())) {
    throw new Error('Only matching PDF, PNG, or JPEG verification documents are accepted.');
  }

  const encoded = String(base64Data).replace(/^data:[^;]+;base64,/, '');
  if (!encoded || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new Error('Document data is not valid base64.');
  }
  const buffer = Buffer.from(encoded, 'base64');
  if (!buffer.length || buffer.length > maximumSize) {
    throw new Error('Verification documents must be smaller than 20 MB and contain data.');
  }

  return buffer;
}

export async function storeVerificationDocument(document) {
  const buffer = validateVerificationDocument(document);
  const extension = path.extname(document.filename).toLowerCase();
  const uniqueId = crypto.randomBytes(12).toString('hex');
  const safeBase = path.basename(document.filename, extension).replace(/[^a-zA-Z0-9_-]/g, '_');
  const savedFilename = `${safeBase}_${uniqueId}${extension}`;

  await fs.mkdir(uploadDirectory, { recursive: true });
  await fs.writeFile(path.join(uploadDirectory, savedFilename), buffer, { flag: 'wx' });

  return {
    id: `vdoc_${uniqueId}`,
    name: path.basename(document.filename),
    type: document.documentType,
    filetype: document.filetype.toLowerCase(),
    sizeBytes: buffer.length,
    sizeFormatted: buffer.length > 1024 * 1024
      ? `${(buffer.length / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(buffer.length / 1024))} KB`,
    url: `/api/uploads/verification-docs/${savedFilename}`,
    uploadedAt: new Date().toISOString(),
  };
}

export async function readVerificationDocument(filename) {
  const safeFilename = path.basename(filename || '');
  if (!safeFilename || safeFilename !== filename) {
    throw new Error('Invalid document reference.');
  }
  return fs.readFile(path.join(uploadDirectory, safeFilename));
}

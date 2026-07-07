const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const isS3Configured = !!(
  process.env.S3_KEY &&
  process.env.S3_SECRET &&
  process.env.S3_BUCKET
);

let s3Client = null;
if (isS3Configured) {
  const config = {
    credentials: {
      accessKeyId: process.env.S3_KEY,
      secretAccessKey: process.env.S3_SECRET,
    },
    region: process.env.S3_REGION || 'us-east-1',
  };
  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT;
    // For services like DO Spaces, forcePathStyle might be required.
    config.forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
  }
  s3Client = new S3Client(config);
}

const localUploadRoot = path.join(__dirname, '..', 'uploads');

const sanitizeBaseName = (filename) => {
  const extIndex = filename.lastIndexOf('.');
  const baseName = extIndex >= 0 ? filename.substring(0, extIndex) : filename;
  return baseName.replace(/[^a-zA-Z0-9-_]/g, '_') || 'file';
};

const getFileExtension = (filename) => {
  const extIndex = filename.lastIndexOf('.');
  return extIndex >= 0 ? filename.substring(extIndex) : '';
};

const buildStorageKey = (filename) => {
  const extension = getFileExtension(filename);
  const cleanBaseName = sanitizeBaseName(filename);
  return `uploads/${Date.now()}-${crypto.randomUUID()}-${cleanBaseName}${extension}`;
};

const getLocalFilePath = (key) => path.join(__dirname, '..', key.replace(/\//g, path.sep));

const ensureLocalUploadDir = async (key) => {
  const targetPath = getLocalFilePath(key);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  return targetPath;
};

/**
 * Uploads a file buffer to S3/Spaces
 * @param {string} filename Original filename
 * @param {Buffer} buffer File binary data
 * @param {string} contentType MIME type
 * @returns {Promise<string>} Storage key for S3 or local uploads
 */
const uploadToS3 = async (filename, buffer, contentType) => {
  const uniqueKey = buildStorageKey(filename);

  if (!isS3Configured) {
    const targetPath = await ensureLocalUploadDir(uniqueKey);
    await fs.writeFile(targetPath, buffer);
    return uniqueKey;
  }

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: uniqueKey,
    Body: buffer,
    ContentType: contentType || 'application/pdf',
  };

  await s3Client.send(new PutObjectCommand(params));
  return uniqueKey;
};

/**
 * Gets a file buffer from S3/Spaces
 * @param {string} key S3 key
 * @returns {Promise<Buffer|null>} File buffer
 */
const getFromS3 = async (key) => {
  if (!key) return null;

  if (!isS3Configured) {
    try {
      return await fs.readFile(getLocalFilePath(key));
    } catch {
      return null;
    }
  }

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
  };

  const response = await s3Client.send(new GetObjectCommand(params));
  
  // S3 SDK v3 returns readable stream in response.Body. We convert it to a Buffer.
  const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });

  return await streamToBuffer(response.Body);
};

/**
 * Deletes a file from S3/Spaces
 * @param {string} key S3 key
 * @returns {Promise<void>}
 */
const deleteFromS3 = async (key) => {
  if (!key) return;

  if (!isS3Configured) {
    try {
      await fs.unlink(getLocalFilePath(key));
    } catch {
      return;
    }
    return;
  }

  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: key,
  };

  try {
    await s3Client.send(new DeleteObjectCommand(params));
  } catch (err) {
    console.error(`Failed to delete S3 key ${key}:`, err.message);
  }
};

module.exports = {
  isS3Configured,
  uploadToS3,
  getFromS3,
  deleteFromS3,
  localUploadRoot,
};

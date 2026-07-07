const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const normalizeStorageEndpoint = (endpoint, bucket) => {
  if (!endpoint) return endpoint;

  try {
    const parsed = new URL(endpoint);
    if (bucket && parsed.hostname.toLowerCase().startsWith(`${bucket.toLowerCase()}.`)) {
      parsed.hostname = parsed.hostname.slice(bucket.length + 1);
      return parsed.toString().replace(/\/$/, '');
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return endpoint.replace(/\/$/, '');
  }
};

const storageConfig = {
  key: process.env.SPACES_KEY || process.env.S3_KEY,
  secret: process.env.SPACES_SECRET || process.env.S3_SECRET,
  bucket: process.env.SPACES_BUCKET || process.env.S3_BUCKET,
  region: process.env.SPACES_REGION || process.env.S3_REGION || 'sfo3',
  endpoint: normalizeStorageEndpoint(process.env.SPACES_ENDPOINT || process.env.S3_ENDPOINT, process.env.SPACES_BUCKET || process.env.S3_BUCKET),
  forcePathStyle: (process.env.SPACES_FORCE_PATH_STYLE || process.env.S3_FORCE_PATH_STYLE) === 'true',
};

const shouldFallbackToBufferStorage = (error) => {
  const code = String(error?.Code || error?.code || '');
  const message = String(error?.message || '');

  return code === 'InvalidAccessKeyId'
    || code === 'SignatureDoesNotMatch'
    || code === 'CredentialsProviderError'
    || message.includes('The access key ID you provided does not exist in our records')
    || message.includes('Resolved credential object is not valid');
};

const isS3Configured = !!(
  storageConfig.key &&
  storageConfig.secret &&
  storageConfig.bucket
);

let s3Client = null;
if (isS3Configured) {
  const config = {
    credentials: {
      accessKeyId: storageConfig.key,
      secretAccessKey: storageConfig.secret,
    },
    region: storageConfig.region,
  };
  if (storageConfig.endpoint) {
    config.endpoint = storageConfig.endpoint;
    // For services like DO Spaces, forcePathStyle might be required.
    config.forcePathStyle = storageConfig.forcePathStyle;
  }
  s3Client = new S3Client(config);
}

const localUploadRoot = process.env.LOCAL_UPLOAD_ROOT
  ? path.resolve(process.env.LOCAL_UPLOAD_ROOT)
  : path.join(os.tmpdir(), 'usm-boardhub-uploads');

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

const getLocalFilePath = (key) => path.join(localUploadRoot, key.replace(/^uploads\//, '').replace(/\//g, path.sep));

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
    Bucket: storageConfig.bucket,
    Key: uniqueKey,
    Body: buffer,
    ContentType: contentType || 'application/pdf',
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
  } catch (error) {
    if (shouldFallbackToBufferStorage(error)) {
      console.warn(`Remote storage upload failed; falling back to MongoDB buffer storage: ${error.message}`);
      return null;
    }
    throw error;
  }

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
    Bucket: storageConfig.bucket,
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
    Bucket: storageConfig.bucket,
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

const Document = require('../models/Document');
const multer   = require('multer');
const { uploadToS3, getFromS3, deleteFromS3 } = require('../utils/s3Storage');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are allowed'));
  },
});

exports.uploadMiddleware = upload.single('file');

const safe = (doc) => {
  const obj = doc.toObject();
  if (obj.file) delete obj.file.data;
  if (obj.fileHistory) obj.fileHistory.forEach((v) => delete v.data);
  return obj;
};

// GET /api/documents?sucId=&year=&pageType=
exports.getDocs = async (req, res) => {
  try {
    const { sucId, year, pageType } = req.query;
    if (!sucId || !year || !pageType)
      return res.status(400).json({ message: 'sucId, year and pageType are required' });
    const docs = await Document.find({ sucId, year: parseInt(year), pageType })
      .select('-file.data -fileHistory.data');
    res.json(docs);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/documents/:sucId/:pageType/:slot
exports.uploadFile = async (req, res) => {
  try {
    const { sucId, pageType, slot } = req.params;
    const year    = parseInt(req.body.year);
    const sucName = req.body.sucName || '';
    if (!year) return res.status(400).json({ message: 'year is required' });
    let doc = await Document.findOne({ sucId, year, pageType, slot });
    if (!doc) doc = new Document({ sucId, sucName, year, pageType, slot });
    if (req.file) {
      // Archive current version to history (do NOT delete S3 file)
      if (doc.file?.filename) {
        doc.fileHistory.push({ ...doc.file.toObject() });
      }
      const s3Key = await uploadToS3(req.file.originalname, req.file.buffer, req.file.mimetype);
      doc.file = {
        filename:    req.file.originalname,
        data:        s3Key ? undefined : req.file.buffer,
        s3Key:       s3Key || undefined,
        contentType: req.file.mimetype,
        uploadedAt:  new Date(),
        version:     (doc.file?.version || 0) + 1,
      };
    }
    await doc.save();
    res.json(safe(doc));
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// DELETE /api/documents/:sucId/:pageType/:slot?year=
exports.resetFile = async (req, res) => {
  try {
    const { sucId, pageType, slot } = req.params;
    const year = parseInt(req.query.year);
    if (!year) return res.status(400).json({ message: 'year is required' });
    
    const doc = await Document.findOne({ sucId, year, pageType, slot });
    if (doc) {
      // Delete all S3 files: current + history
      const allFiles = [doc.file, ...doc.fileHistory].filter(Boolean);
      for (const f of allFiles) {
        if (f.s3Key) await deleteFromS3(f.s3Key);
      }
      await doc.deleteOne();
    }
    
    res.json({ message: 'Reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/documents/file/:docId  (also accepts ?token= for window.open, ?v=N for historical version)
exports.serveFile = async (req, res) => {
  try {
    const vParam = req.query.v ? parseInt(req.query.v) : null;
    const doc = await Document.findById(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    let file;
    if (vParam !== null) {
      file = doc.fileHistory.find((h) => h.version === vParam);
    } else {
      file = doc.file;
    }

    if (!file || (!file.s3Key && !file.data)) {
      return res.status(404).json({ message: 'No file found for this version' });
    }

    res.set('Content-Type', file.contentType || 'application/pdf');
    res.set('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);

    if (file.s3Key) {
      const buffer = await getFromS3(file.s3Key);
      if (!buffer) return res.status(404).json({ message: 'File not found in storage bucket' });
      res.send(buffer);
    } else {
      res.send(file.data);
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

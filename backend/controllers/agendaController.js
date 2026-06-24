const Agenda = require('../models/Agenda');
const multer  = require('multer');
const { uploadToS3, getFromS3, deleteFromS3 } = require('../utils/s3Storage');

// Store uploads in memory so we can save the buffer to MongoDB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 }, // 16 MB max per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Only PDF files are allowed'));
  },
});

// Export the multer middleware so the router can use it
exports.uploadMiddleware = upload.fields([
  { name: 'oldAgenda', maxCount: 1 },
  { name: 'newAgenda', maxCount: 1 },
]);

// Helper: strip binary data before sending to client
const safe = (doc) => {
  const obj = doc.toObject();
  if (obj.oldAgenda) delete obj.oldAgenda.data;
  if (obj.newAgenda) delete obj.newAgenda.data;
  if (obj.oldAgendaHistory) obj.oldAgendaHistory.forEach((v) => delete v.data);
  if (obj.newAgendaHistory) obj.newAgendaHistory.forEach((v) => delete v.data);
  return obj;
};

// GET /api/agendas?sucId=&year=
// Returns all quarters for a given SUC + year (no file binary data)
exports.getAgendas = async (req, res) => {
  try {
    const { sucId, year } = req.query;
    if (!sucId || !year) return res.status(400).json({ message: 'sucId and year are required' });
    const docs = await Agenda.find({ sucId, year: parseInt(year) })
      .select('-oldAgenda.data -newAgenda.data -oldAgendaHistory.data -newAgendaHistory.data');
    res.json(docs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/agendas/:sucId/:quarter
// Upsert agenda files for a quarter. Body (multipart): year, sucName; Files: oldAgenda?, newAgenda?
exports.uploadFiles = async (req, res) => {
  try {
    const { sucId, quarter } = req.params;
    const year    = parseInt(req.body.year);
    const sucName = req.body.sucName || '';

    if (!year) return res.status(400).json({ message: 'year is required' });

    let doc = await Agenda.findOne({ sucId, year, quarter });
    if (!doc) doc = new Agenda({ sucId, sucName, year, quarter });

    if (req.files?.oldAgenda?.[0]) {
      const f = req.files.oldAgenda[0];
      // Archive current version to history (do NOT delete S3 file)
      if (doc.oldAgenda?.filename) {
        doc.oldAgendaHistory.push({ ...doc.oldAgenda.toObject() });
      }
      const s3Key = await uploadToS3(f.originalname, f.buffer, f.mimetype);
      doc.oldAgenda = {
        filename: f.originalname,
        data: s3Key ? undefined : f.buffer,
        s3Key: s3Key || undefined,
        contentType: f.mimetype,
        uploadedAt: new Date(),
        version: (doc.oldAgenda?.version || 0) + 1,
      };
    }
    if (req.files?.newAgenda?.[0]) {
      const f = req.files.newAgenda[0];
      // Archive current version to history (do NOT delete S3 file)
      if (doc.newAgenda?.filename) {
        doc.newAgendaHistory.push({ ...doc.newAgenda.toObject() });
      }
      const s3Key = await uploadToS3(f.originalname, f.buffer, f.mimetype);
      doc.newAgenda = {
        filename: f.originalname,
        data: s3Key ? undefined : f.buffer,
        s3Key: s3Key || undefined,
        contentType: f.mimetype,
        uploadedAt: new Date(),
        version: (doc.newAgenda?.version || 0) + 1,
      };
    }

    await doc.save();
    res.json(safe(doc));
  } catch (err) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

// DELETE /api/agendas/:sucId/:quarter?year=
// Clears both files and full history for a quarter
exports.resetFiles = async (req, res) => {
  try {
    const { sucId, quarter } = req.params;
    const year = parseInt(req.query.year);
    if (!year) return res.status(400).json({ message: 'year is required' });
    
    const doc = await Agenda.findOne({ sucId, year, quarter });
    if (doc) {
      // Delete all S3 files: current + history
      const allOld = [doc.oldAgenda, ...doc.oldAgendaHistory].filter(Boolean);
      const allNew = [doc.newAgenda, ...doc.newAgendaHistory].filter(Boolean);
      for (const f of [...allOld, ...allNew]) {
        if (f.s3Key) await deleteFromS3(f.s3Key);
      }
      await doc.deleteOne();
    }
    
    res.json({ message: 'Reset successful' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/agendas/status
// Returns uploaded agenda identifiers (sucAbbreviation, year, quarter/slot, type) for the requesting user's visible SUCs
exports.getAgendaStatus = async (req, res) => {
  try {
    const Suc      = require('../models/Suc');
    const Document = require('../models/Document');

    const sucFilter = {};
    if (req.user.role === 'admin' && req.user.occCode) {
      sucFilter.occCode = req.user.occCode;
    } else if (req.user.role === 'user' && req.user.sucAbbreviation) {
      sucFilter.abbreviation = req.user.sucAbbreviation;
    }

    const visibleSucs = await Suc.find(sucFilter).select('_id abbreviation');
    const sucIdMap = {};
    visibleSucs.forEach((s) => { sucIdMap[s._id.toString()] = s.abbreviation; });
    const sucIds = visibleSucs.map((s) => s._id);

    const [agendas, docs] = await Promise.all([
      Agenda.find({ sucId: { $in: sucIds } }).select('sucId year quarter'),
      Document.find({ sucId: { $in: sucIds }, pageType: 'special', slot: { $in: ['1st', '2nd'] } }).select('sucId year slot'),
    ]);

    const result = [
      ...agendas.map((a) => ({
        sucAbbreviation: sucIdMap[a.sucId.toString()],
        year: a.year,
        quarter: a.quarter,
        type: 'regular',
      })),
      ...docs.map((d) => ({
        sucAbbreviation: sucIdMap[d.sucId.toString()],
        year: d.year,
        slot: d.slot,
        type: 'special',
      })),
    ];

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/agendas/file/:agendaId/:type  (type = old | new)
// Supports ?v=N to serve a historical version; omit for current.
exports.serveFile = async (req, res) => {
  try {
    const { agendaId, type } = req.params;
    const vParam = req.query.v ? parseInt(req.query.v) : null;
    const doc = await Agenda.findById(agendaId);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    let file;
    if (vParam !== null) {
      // Find in history by version number
      const history = type === 'old' ? doc.oldAgendaHistory : doc.newAgendaHistory;
      file = history.find((h) => h.version === vParam);
    } else {
      file = type === 'old' ? doc.oldAgenda : doc.newAgenda;
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

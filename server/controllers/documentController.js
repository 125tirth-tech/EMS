const Document = require('../models/Document');

// ─── POST /api/documents/upload ─────────────────────────────
exports.upload = async (req, res) => {
  try {
    const { employeeId, name, type, fileName, mimeType, data, fileSize } = req.body;

    if (!employeeId || !name || !fileName || !data) {
      return res.status(400).json({ error: 'Employee ID, document name, file name, and file data are required.' });
    }

    // Limit file size (5MB in base64 ≈ 6.67MB string)
    if (data.length > 7000000) {
      return res.status(400).json({ error: 'File size exceeds 5MB limit.' });
    }

    const doc = await Document.create({
      employeeId,
      name,
      type: type || 'other',
      fileName,
      fileSize: fileSize || 0,
      mimeType: mimeType || 'application/octet-stream',
      data,
      uploadedBy: req.user.id
    });

    // Don't return data in response
    const result = doc.toJSON();

    res.status(201).json({ message: 'Document uploaded.', document: result });
  } catch (err) {
    console.error('Upload document error:', err);
    res.status(500).json({ error: 'Failed to upload document.' });
  }
};

// ─── GET /api/documents?employeeId=xxx ──────────────────────
exports.getAll = async (req, res) => {
  try {
    const filter = {};

    if (req.query.employeeId) {
      filter.employeeId = req.query.employeeId;
    }

    // Employees can only see their own documents
    if (req.user.role === 'employee') {
      filter.employeeId = req.user.employeeId;
    }

    if (req.query.type) {
      filter.type = req.query.type;
    }

    const documents = await Document.find(filter)
      .select('-data')
      .populate('employeeId', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({ documents });
  } catch (err) {
    console.error('Get documents error:', err);
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
};

// ─── GET /api/documents/:id/download ────────────────────────
exports.download = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Employees can only download their own documents
    if (req.user.role === 'employee' && doc.employeeId.toString() !== req.user.employeeId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({
      document: {
        id: doc._id,
        name: doc.name,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        data: doc.data
      }
    });
  } catch (err) {
    console.error('Download document error:', err);
    res.status(500).json({ error: 'Failed to download document.' });
  }
};

// ─── DELETE /api/documents/:id ──────────────────────────────
exports.remove = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted.' });
  } catch (err) {
    console.error('Delete document error:', err);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
};

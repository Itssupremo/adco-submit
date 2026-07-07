const Submission = require('../models/Submission');
const XLSX = require('xlsx');

const buildFilter = (query) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.councilId) filter.councilId = query.councilId;
  if (query.submittedFrom || query.submittedTo) {
    filter.submissionDate = {};
    if (query.submittedFrom) filter.submissionDate.$gte = query.submittedFrom;
    if (query.submittedTo) filter.submissionDate.$lte = query.submittedTo;
  }
  if (query.meetingDateFrom || query.meetingDateTo) {
    filter.meetingDate = {};
    if (query.meetingDateFrom) filter.meetingDate.$gte = query.meetingDateFrom;
    if (query.meetingDateTo) filter.meetingDate.$lte = query.meetingDateTo;
  }
  return filter;
};

exports.getSubmissionReports = async (req, res) => {
  try {
    const records = await Submission.find(buildFilter(req.query)).sort({ submissionDate: -1 });
    const reportRecords = records.map((item) => ({
      _id: item._id,
      councilName: item.councilName,
      collegeUnit: item.collegeUnit,
      documentTitle: item.documentTitle,
      proposalType: item.proposalType,
      forInformationType: item.forInformationType,
      meetingDate: item.meetingDate,
      submissionDate: item.submissionDate,
      status: item.status,
      remarks: item.remarks,
    }));
    const format = req.query.format || 'json';

    if (format === 'xlsx') {
      const rows = reportRecords.map((item) => ({
        Council: item.councilName,
        'College/Unit': item.collegeUnit,
        'Document Title': item.documentTitle,
        'Proposal Type': item.proposalType,
        'For Information Type': item.forInformationType || '',
        'Meeting Date': item.meetingDate,
        'Submission Date': item.submissionDate,
        Status: item.status,
        Remarks: item.remarks,
      }));
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.set('Content-Disposition', 'attachment; filename="submission-report.xlsx"');
      return res.send(buffer);
    }

    if (format === 'print') {
      const rows = reportRecords.map((item) => `<tr><td>${item.councilName}</td><td>${item.collegeUnit}</td><td>${item.documentTitle}</td><td>${item.proposalType}</td><td>${item.meetingDate}</td><td>${item.submissionDate}</td><td>${item.status}</td><td>${item.remarks || ''}</td></tr>`).join('');
      return res.send(`<!doctype html><html><head><title>Submission Report</title><style>body{font-family:Arial,sans-serif;padding:24px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f0f0f0}</style></head><body><h1>Submission Report</h1><table><thead><tr><th>Council</th><th>College/Unit</th><th>Document Title</th><th>Proposal Type</th><th>Meeting Date</th><th>Submission Date</th><th>Status</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    }

    res.json({
      summary: {
        total: reportRecords.length,
        pending: reportRecords.filter((item) => item.status === 'Pending').length,
        returned: reportRecords.filter((item) => item.status === 'Returned').length,
        approved: reportRecords.filter((item) => item.status === 'Approved').length,
        archived: reportRecords.filter((item) => item.status === 'Archived').length,
      },
      records: reportRecords,
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
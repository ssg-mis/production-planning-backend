const { getReportData } = require('../services/reportService');

exports.getReports = async (req, res) => {
  try {
    const data = await getReportData();
    res.json({
      status: 'success',
      data
    });
  } catch (error) {
    console.error('Error fetching report data:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

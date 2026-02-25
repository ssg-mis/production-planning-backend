const rawMaterialIssueService = require('../services/rawMaterialIssueService');

/**
 * Controller for Raw Material Issue operations
 */

const getPendingIssues = async (req, res, next) => {
    try {
        const pending = await rawMaterialIssueService.getPendingRawMaterialIssues();
        res.status(200).json({
            status: 'success',
            data: pending
        });
    } catch (error) {
        console.error('Error in getPendingIssues controller:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch pending issues' });
    }
};

const getIssueHistory = async (req, res, next) => {
    try {
        const history = await rawMaterialIssueService.getRawMaterialIssueHistory();
        res.status(200).json({
            status: 'success',
            data: history
        });
    } catch (error) {
        console.error('Error in getIssueHistory controller:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch issue history' });
    }
};

const createIssue = async (req, res, next) => {
    try {
        const result = await rawMaterialIssueService.createRawMaterialIssue(req.body);
        res.status(201).json({
            status: 'success',
            message: 'Raw material issue recorded successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in createIssue controller:', error);
        res.status(500).json({ status: 'error', message: 'Failed to create raw material issue' });
    }
};

module.exports = {
    getPendingIssues,
    getIssueHistory,
    createIssue
};

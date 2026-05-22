const LeaveRequest = require('../models/LeaveRequest');
const Trip = require('../models/Trip');
const { emitToRole, emitToUser } = require('../socket/emitter');


const createLeaveRequest = async (req, res) => {
  try {
    const { fromDate, toDate, reason } = req.body;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'fromDate, toDate and reason are required',
      });
    }

    const from = new Date(fromDate);
    const to   = new Date(toDate);

    if (from > to) {
      return res.status(400).json({ success: false, message: 'fromDate cannot be after toDate' });
    }

    if (from < new Date().setHours(0, 0, 0, 0)) {
      return res.status(400).json({ success: false, message: 'Cannot apply leave for past dates' });
    }


    const conflictingTrip = await Trip.findOne({
      driver:      req.user._id,
      scheduledAt: { $gte: from, $lte: new Date(to).setHours(23, 59, 59, 999) },
      status:      { $nin: ['completed', 'cancelled'] },
    }).populate('guest', 'name');

    if (conflictingTrip) {
      return res.status(400).json({
        success: false,
        message: 'You have an active trip during these dates. Ask admin to reassign it first.',
        conflictingTrip: {
          _id:         conflictingTrip._id,
          scheduledAt: conflictingTrip.scheduledAt,
          guest:       conflictingTrip.guest?.name,
        },
      });
    }

 
    const existing = await LeaveRequest.findOne({
      driver: req.user._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { fromDate: { $lte: to },   toDate: { $gte: from } },
      ],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `You already have a ${existing.status} leave request overlapping these dates`,
      });
    }

    const leave = await LeaveRequest.create({
      driver:   req.user._id,
      fromDate: from,
      toDate:   to,
      reason,
    });


    emitToRole('admin', 'leave_submitted', {
      message: `Leave request from Driver — ${req.user.name} (${from.toDateString()} to ${to.toDateString()})`,
      leave,
    });

    res.status(201).json({
      success: true,
      message: 'Leave request submitted. Waiting for admin approval.',
      data: leave,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getMyLeaveRequests = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ driver: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, count: leaves.length, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, driverId } = req.query;

    let query = {};
    if (status)   query.status = status;
    if (driverId) query.driver = driverId;

    const leaves = await LeaveRequest.find(query)
      .populate('driver',     'name phone vehicleNumber')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });


    const counts = {
      pending:  await LeaveRequest.countDocuments({ status: 'pending' }),
      approved: await LeaveRequest.countDocuments({ status: 'approved' }),
      rejected: await LeaveRequest.countDocuments({ status: 'rejected' }),
    };

    res.json({ success: true, counts, count: leaves.length, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const reviewLeaveRequest = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status must be approved or rejected' });
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Leave already ${leave.status}. Cannot review again.`,
      });
    }

    leave.status     = status;
    leave.adminNote  = adminNote || '';
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    await leave.save();

    const updated = await LeaveRequest.findById(leave._id)
      .populate('driver',     'name phone')
      .populate('reviewedBy', 'name');

    emitToUser(leave.driver, 'leave_reviewed', {
      message: `Your leave request has been ${status}${adminNote ? ` — Note: ${adminNote}` : ''}`,
      leave:   updated,
    });

    res.json({
      success: true,
      message: `Leave request ${status} successfully`,
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const deleteLeaveRequest = async (req, res) => {
  try {
    const leave = await LeaveRequest.findOne({
      _id:    req.params.id,
      driver: req.user._id,
    });

    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a leave that is already ${leave.status}`,
      });
    }

    await leave.deleteOne();

    res.json({ success: true, message: 'Leave request cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  reviewLeaveRequest,
  deleteLeaveRequest,
};

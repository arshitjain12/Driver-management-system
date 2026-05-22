const mongoose = require('mongoose');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Rating = require('../models/Rating');


const getAllDrivers = async (req, res) => {
  try {
    const { status, search, active } = req.query;

    let query = { role: 'driver' };
    if (status) query.status = status;
    if (active !== undefined) query.isActive = active === 'true';
    if (search) query.name = { $regex: search, $options: 'i' };

    const drivers = await User.find(query).select('-password');

    const driversWithStats = await Promise.all(
      drivers.map(async (driver) => {
        const totalTrips = await Trip.countDocuments({
          driver: driver._id,
          status: 'completed',
        });
        const ratings = await Rating.find({ driver: driver._id });
        const avgRating =
          ratings.length
            ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1)
            : null;

        return {
          ...driver.toJSON(),
          totalTrips,
          avgRating,
          totalRatings: ratings.length,
        };
      })
    );

    res.json({ success: true, count: driversWithStats.length, data: driversWithStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getDriverById = async (req, res) => {
  try {
    if (req.user.role === 'driver' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const driver = await User.findOne({ _id: req.params.id, role: 'driver' }).select('-password');
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const totalTrips = await Trip.countDocuments({ driver: driver._id, status: 'completed' });
    const ratings = await Rating.find({ driver: driver._id })
      .populate('guest', 'name')
      .populate('trip', 'scheduledAt pickupLocation dropLocation')
      .sort({ createdAt: -1 });

    const avgRating =
      ratings.length
        ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1)
        : null;

    const driverData = driver.toJSON();
    if (req.user.role !== 'admin') delete driverData.adminNotes; 

    res.json({
      success: true,
      data: { ...driverData, totalTrips, avgRating, totalRatings: ratings.length, ratings },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const addDriver = async (req, res) => {
  try {
    const { name, email, phone, password, vehicleNumber, vehicleType, licenseNumber } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'name, email, phone and password are required',
      });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const driver = await User.create({
      name, email, phone, password,
      role: 'driver',
      vehicleNumber, vehicleType, licenseNumber,
      status: 'available',
    });

    res.status(201).json({
      success: true,
      message: 'Driver added successfully',
      data: driver,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateDriver = async (req, res) => {
  try {
    const { password, role, adminNotes, ...updateData } = req.body; // block sensitive fields

    const driver = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'driver' },
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    res.json({ success: true, message: 'Driver updated', data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const deleteDriver = async (req, res) => {
  try {
  
    const activeTrip = await Trip.findOne({
      driver: req.params.id,
      status: { $in: ['assigned', 'acknowledged', 'en_route', 'arrived', 'in_progress'] },
    });

    if (activeTrip) {
      return res.status(400).json({
        success: false,
        message: 'Driver has active trips. Reassign those trips first before deactivating.',
      });
    }

    const driver = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'driver' },
      { isActive: false },
      { new: true }
    );

    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    res.json({ success: true, message: 'Driver deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateDriverStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['available', 'on_trip', 'off_duty'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be: available, on_trip, or off_duty',
      });
    }

    if (req.user.role === 'driver' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'You can only update your own status' });
    }

    const driver = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'driver' },
      { status },
      { new: true }
    ).select('-password -adminNotes');

    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    res.json({ success: true, message: 'Status updated', data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateAdminNotes = async (req, res) => {
  try {
    const { adminNotes } = req.body;

    const driver = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'driver' },
      { adminNotes },
      { new: true }
    ).select('name adminNotes');

    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    res.json({ success: true, message: 'Notes saved', data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getDriverHistory = async (req, res) => {
  try {
    if (req.user.role === 'driver' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const trips = await Trip.find({ driver: req.params.id })
      .populate('guest', 'name phone category company')
      .sort({ scheduledAt: -1 });

    const guestFrequency = await Trip.aggregate([
      {
        $match: {
          driver: new mongoose.Types.ObjectId(req.params.id),
          status: 'completed',
        },
      },
      { $group: { _id: '$guest', tripCount: { $sum: 1 } } },
      { $sort: { tripCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'guestInfo',
        },
      },
      { $unwind: '$guestInfo' },
      {
        $project: {
          tripCount: 1,
          'guestInfo.name': 1,
          'guestInfo.phone': 1,
          'guestInfo.category': 1,
        },
      },
    ]);

    res.json({ success: true, data: { trips, guestFrequency } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllDrivers,
  getDriverById,
  addDriver,
  updateDriver,
  deleteDriver,
  updateDriverStatus,
  updateAdminNotes,
  getDriverHistory,
};

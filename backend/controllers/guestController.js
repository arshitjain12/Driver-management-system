const mongoose = require('mongoose');
const User = require('../models/User');
const Trip = require('../models/Trip');


const getAllGuests = async (req, res) => {
  try {
    const { category, search } = req.query;

    let query = { role: 'guest' };
    if (category) query.category = category;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];

    const guests = await User.find(query).select('-password -adminNotes');


    const guestsWithStats = await Promise.all(
      guests.map(async (guest) => {
        const totalTrips = await Trip.countDocuments({ guest: guest._id });
        const lastTrip = await Trip.findOne({ guest: guest._id })
          .sort({ scheduledAt: -1 })
          .populate('driver', 'name vehicleNumber');

        return { ...guest.toJSON(), totalTrips, lastTrip };
      })
    );

    res.json({ success: true, count: guestsWithStats.length, data: guestsWithStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getGuestById = async (req, res) => {
  try {
    if (req.user.role === 'guest' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const guest = await User.findOne({ _id: req.params.id, role: 'guest' }).select('-password');
    if (!guest) return res.status(404).json({ success: false, message: 'Guest not found' });

    const totalTrips = await Trip.countDocuments({ guest: guest._id });


    const driverFrequency = await Trip.aggregate([
      {
        $match: {
          guest: new mongoose.Types.ObjectId(req.params.id),
          status: 'completed',
        },
      },
      { $group: { _id: '$driver', tripCount: { $sum: 1 } } },
      { $sort: { tripCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'driverInfo',
        },
      },
      { $unwind: '$driverInfo' },
      {
        $project: {
          tripCount: 1,
          'driverInfo.name': 1,
          'driverInfo.phone': 1,
          'driverInfo.vehicleNumber': 1,
          'driverInfo.vehicleType': 1,
          'driverInfo.status': 1,
        },
      },
    ]);

    res.json({
      success: true,
      data: { ...guest.toJSON(), totalTrips, driverFrequency },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const addGuest = async (req, res) => {
  try {
    const {
      name, email, phone, password,
      company, category,
      preferredPickupLocations, preferredDropLocations,
      specialNeeds, notes,
    } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'name, email, phone and password are required',
      });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const guest = await User.create({
      name, email, phone, password,
      role: 'guest',
      company, category,
      preferredPickupLocations: preferredPickupLocations || [],
      preferredDropLocations:   preferredDropLocations || [],
      specialNeeds, notes,
    });

    res.status(201).json({
      success: true,
      message: 'Guest added successfully',
      data: guest,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateGuest = async (req, res) => {
  try {
    const { password, role, ...updateData } = req.body;

    const guest = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'guest' },
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!guest) return res.status(404).json({ success: false, message: 'Guest not found' });

    res.json({ success: true, message: 'Guest updated', data: guest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const deleteGuest = async (req, res) => {
  try {
    const activeTrip = await Trip.findOne({
      guest: req.params.id,
      status: { $in: ['assigned', 'acknowledged', 'en_route', 'arrived', 'in_progress'] },
    });

    if (activeTrip) {
      return res.status(400).json({
        success: false,
        message: 'Guest has an active trip in progress. Cannot delete now.',
      });
    }

    const guest = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'guest' },
      { isActive: false },
      { new: true }
    );

    if (!guest) return res.status(404).json({ success: false, message: 'Guest not found' });

    res.json({ success: true, message: 'Guest deactivated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const addPreferredLocation = async (req, res) => {
  try {
    if (req.user.role === 'guest' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { type, label, address, city } = req.body;
    // type must be 'pickup' or 'drop'
    if (!['pickup', 'drop'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be pickup or drop' });
    }

    const field = type === 'pickup' ? 'preferredPickupLocations' : 'preferredDropLocations';

    const guest = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'guest' },
      { $push: { [field]: { label, address, city } } },
      { new: true }
    ).select('-password');

    if (!guest) return res.status(404).json({ success: false, message: 'Guest not found' });

    res.json({ success: true, message: 'Location added', data: guest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getGuestHistory = async (req, res) => {
  try {
    if (req.user.role === 'guest' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const trips = await Trip.find({ guest: req.params.id })
      .populate('driver', 'name phone vehicleNumber vehicleType')
      .sort({ scheduledAt: -1 });

    res.json({ success: true, data: trips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllGuests,
  getGuestById,
  addGuest,
  updateGuest,
  deleteGuest,
  addPreferredLocation,
  getGuestHistory,
};

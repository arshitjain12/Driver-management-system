const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { emitToUser, emitToRole, emitToUsers } = require('../socket/emitter');
const { processQueue } = require('./queueController');


const hasConflict = async (driverId, scheduledAt, excludeTripId = null) => {
  const tripTime = new Date(scheduledAt);
  const windowStart = new Date(tripTime.getTime() - 3 * 60 * 60 * 1000); // -3 hrs
  const windowEnd   = new Date(tripTime.getTime() + 3 * 60 * 60 * 1000); // +3 hrs

  const query = {
    driver: driverId,
    scheduledAt: { $gte: windowStart, $lte: windowEnd },
    status: { $nin: ['completed', 'cancelled'] },
  };

  if (excludeTripId) query._id = { $ne: excludeTripId };

  return await Trip.findOne(query).populate('guest', 'name');
};


const createTrip = async (req, res) => {
  try {
    const {
      guestId, driverId,
      pickupLocation, dropLocation,
      scheduledAt,
      travelMode, travelNumber,
      notes,
    } = req.body;


    if (!guestId || !driverId || !pickupLocation?.address || !dropLocation?.address || !scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'guestId, driverId, pickupLocation, dropLocation and scheduledAt are required',
      });
    }

   
    const guest = await User.findOne({ _id: guestId, role: 'guest', isActive: true });
    if (!guest) return res.status(404).json({ success: false, message: 'Guest not found or inactive' });


    const driver = await User.findOne({ _id: driverId, role: 'driver', isActive: true });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found or inactive' });

   
    const LeaveRequest = require('../models/LeaveRequest');
    const tripDate = new Date(scheduledAt);
    const onLeave = await LeaveRequest.findOne({
      driver: driverId,
      status: 'approved',
      fromDate: { $lte: tripDate },
      toDate:   { $gte: tripDate },
    });
    if (onLeave) {
      return res.status(400).json({
        success: false,
        message: `Driver is on approved leave on this date (${onLeave.fromDate.toDateString()} - ${onLeave.toDate.toDateString()})`,
      });
    }

   
    const conflict = await hasConflict(driverId, scheduledAt);
    if (conflict) {
      return res.status(400).json({
        success: false,
        message: `Driver already has a trip around this time`,
        conflictingTrip: {
          _id: conflict._id,
          scheduledAt: conflict.scheduledAt,
          guest: conflict.guest?.name,
          status: conflict.status,
        },
      });
    }

   
    const trip = await Trip.create({
      guest:          guestId,
      driver:         driverId,
      pickupLocation,
      dropLocation,
      scheduledAt,
      travelMode:     travelMode || 'other',
      travelNumber,
      passengerCount: passengerCount || 1,
      notes,
      createdBy:      req.user._id,
      
      status: driverId ? 'assigned' : 'queued',
      statusHistory: [{
        status:    driverId ? 'assigned' : 'queued',
        updatedBy: req.user._id,
        note:      driverId ? 'Trip created and driver assigned' : 'No driver available — added to queue',
      }],
    });

    const populated = await Trip.findById(trip._id)
      .populate('guest',  'name phone category company')
      .populate('driver', 'name phone vehicleNumber vehicleType');

   
    emitToUser(driverId, 'trip_assigned', {
      message: `New trip assigned — Guest: ${guest.name}`,
      trip:    populated,
    });

    res.status(201).json({
      success: true,
      message: 'Trip created and driver assigned',
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getAllTrips = async (req, res) => {
  try {
    const { status, driverId, guestId, date, travelMode } = req.query;

    let query = {};
    if (status)     query.status   = status;
    if (driverId)   query.driver   = driverId;
    if (guestId)    query.guest    = guestId;
    if (travelMode) query.travelMode = travelMode;

   
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.scheduledAt = { $gte: start, $lte: end };
    }

    const trips = await Trip.find(query)
      .populate('guest',  'name phone category company')
      .populate('driver', 'name phone vehicleNumber vehicleType status')
      .sort({ scheduledAt: -1 });

    res.json({ success: true, count: trips.length, data: trips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getTripById = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id)
      .populate('guest',  'name phone category company specialNeeds')
      .populate('driver', 'name phone vehicleNumber vehicleType')
      .populate('createdBy', 'name');

    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });


    if (req.user.role === 'driver' && trip.driver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (req.user.role === 'guest' && trip.guest._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateTripStatus = async (req, res) => {
  try {
    const { status, note } = req.body;

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

  
    if (req.user.role === 'driver' && trip.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'This trip is not assigned to you' });
    }

   
    const driverAllowed = ['acknowledged', 'en_route', 'arrived', 'in_progress', 'completed'];
    const adminAllowed  = ['delayed', 'cancelled', 'acknowledged', 'en_route', 'arrived', 'in_progress', 'completed'];

    const allowed = req.user.role === 'driver' ? driverAllowed : adminAllowed;

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Your role cannot set status to '${status}'`,
      });
    }

   
    const statusOrder = ['assigned', 'acknowledged', 'en_route', 'arrived', 'in_progress', 'completed'];
    const currentIdx  = statusOrder.indexOf(trip.status);
    const newIdx      = statusOrder.indexOf(status);

    if (newIdx !== -1 && currentIdx !== -1 && newIdx < currentIdx) {
      return res.status(400).json({
        success: false,
        message: `Cannot move trip back from '${trip.status}' to '${status}'`,
      });
    }

   
    if (status === 'completed') {
      await User.findByIdAndUpdate(trip.driver, { status: 'available' });
     
      if (trip.vehicle) {
        await Vehicle.findByIdAndUpdate(trip.vehicle, { status: 'available' });
      }
     
      setTimeout(() => processQueue(trip.driver.toString()), 1000);
    }

  
    if (status === 'en_route') {
      await User.findByIdAndUpdate(trip.driver, { status: 'on_trip' });
    }

   
    trip.status = status;
    trip.statusHistory.push({ status, updatedBy: req.user._id, note: note || '' });
    await trip.save();

    const updated = await Trip.findById(trip._id)
      .populate('guest',  'name phone')
      .populate('driver', 'name phone vehicleNumber');

  
    emitToRole('admin', 'trip_status_updated', {
      message: `Trip status → ${status}`,
      trip:    updated,
    });
    emitToUser(updated.guest._id, 'trip_status_updated', {
      message: `Your trip status is now: ${status}`,
      trip:    updated,
    });

    res.json({ success: true, message: `Trip status updated to '${status}'`, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const handleDelay = async (req, res) => {
  try {
    const { newScheduledAt, delayReason } = req.body;

    if (!newScheduledAt) {
      return res.status(400).json({ success: false, message: 'newScheduledAt is required' });
    }

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    if (['completed', 'cancelled'].includes(trip.status)) {
      return res.status(400).json({ success: false, message: 'Cannot delay a completed or cancelled trip' });
    }

 
    const conflict = await hasConflict(trip.driver, newScheduledAt, trip._id);
    if (conflict) {
      return res.status(400).json({
        success: false,
        message: 'New time conflicts with another trip for this driver',
        conflictingTrip: { _id: conflict._id, scheduledAt: conflict.scheduledAt },
      });
    }

    const oldTime = trip.scheduledAt;

    trip.updatedTime  = newScheduledAt;   
    trip.scheduledAt  = newScheduledAt;
    trip.status       = 'delayed';
    trip.delayReason  = delayReason || '';
    trip.statusHistory.push({
      status:    'delayed',
      updatedBy: req.user._id,
      note: `Delayed from ${oldTime.toISOString()} to ${new Date(newScheduledAt).toISOString()}. Reason: ${delayReason || 'N/A'}`,
    });

   
    if (!['en_route', 'arrived', 'in_progress'].includes(trip.status)) {
      await User.findByIdAndUpdate(trip.driver, { status: 'available' });
    }

    await trip.save();

    const updated = await Trip.findById(trip._id)
      .populate('guest',  'name phone')
      .populate('driver', 'name phone vehicleNumber');

 
    emitToUser(updated.driver._id, 'trip_delayed', {
      message: `Trip delayed — new time: ${new Date(newScheduledAt).toLocaleString()}`,
      trip:    updated,
    });
    emitToUser(updated.guest._id, 'trip_delayed', {
      message: `Your trip has been delayed — new time: ${new Date(newScheduledAt).toLocaleString()}`,
      trip:    updated,
    });

    res.json({
      success: true,
      message: 'Trip marked as delayed, driver notified',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const handleCancel = async (req, res) => {
  try {
    const { cancelReason } = req.body;

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    if (['completed', 'cancelled'].includes(trip.status)) {
      return res.status(400).json({ success: false, message: 'Trip is already completed or cancelled' });
    }

    trip.status       = 'cancelled';
    trip.cancelReason = cancelReason || '';
    trip.statusHistory.push({
      status:    'cancelled',
      updatedBy: req.user._id,
      note:      `Cancelled. Reason: ${cancelReason || 'N/A'}`,
    });


    await User.findByIdAndUpdate(trip.driver, { status: 'available' });

    await trip.save();

    const updated = await Trip.findById(trip._id)
      .populate('guest',  'name phone')
      .populate('driver', 'name phone vehicleNumber');

   
    emitToUser(updated.driver._id, 'trip_cancelled', {
      message: `Trip cancelled — Reason: ${cancelReason || 'N/A'}`,
      trip:    updated,
    });
    emitToUser(updated.guest._id, 'trip_cancelled', {
      message: `Your trip has been cancelled — Reason: ${cancelReason || 'N/A'}`,
      trip:    updated,
    });

    res.json({
      success: true,
      message: 'Trip cancelled, driver is now free',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const reassignDriver = async (req, res) => {
  try {
    const { newDriverId } = req.body;
    if (!newDriverId) return res.status(400).json({ success: false, message: 'newDriverId is required' });

    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    if (['completed', 'cancelled'].includes(trip.status)) {
      return res.status(400).json({ success: false, message: 'Cannot reassign a completed or cancelled trip' });
    }

    const newDriver = await User.findOne({ _id: newDriverId, role: 'driver', isActive: true });
    if (!newDriver) return res.status(404).json({ success: false, message: 'New driver not found or inactive' });

    
    const conflict = await hasConflict(newDriverId, trip.scheduledAt, trip._id);
    if (conflict) {
      return res.status(400).json({
        success: false,
        message: 'New driver has a conflicting trip at this time',
        conflictingTrip: { _id: conflict._id, scheduledAt: conflict.scheduledAt },
      });
    }

    const oldDriverId = trip.driver;
    trip.driver = newDriverId;
    trip.status = 'assigned';
    trip.statusHistory.push({
      status:    'assigned',
      updatedBy: req.user._id,
      note:      `Reassigned from driver ${oldDriverId} to driver ${newDriverId}`,
    });

  
    await User.findByIdAndUpdate(oldDriverId, { status: 'available' });

    await trip.save();

    const updated = await Trip.findById(trip._id)
      .populate('guest',  'name phone')
      .populate('driver', 'name phone vehicleNumber');


    emitToUser(oldDriverId, 'trip_reassigned', {
      message: 'Your trip has been reassigned to another driver',
      trip:    updated,
    });
    emitToUser(newDriverId, 'trip_assigned', {
      message: `New trip reassigned to you — Guest: ${updated.guest?.name}`,
      trip:    updated,
    });

    res.json({ success: true, message: 'Trip reassigned to new driver', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const suggestDriver = async (req, res) => {
  try {
    const { guestId } = req.query;
    if (!guestId) return res.status(400).json({ success: false, message: 'guestId is required' });

    const suggestions = await Trip.aggregate([
      {
        $match: {
          guest: new mongoose.Types.ObjectId(guestId),
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
          as: 'driver',
        },
      },
      { $unwind: '$driver' },
      {
        $project: {
          tripCount: 1,
          'driver._id': 1,
          'driver.name': 1,
          'driver.phone': 1,
          'driver.vehicleNumber': 1,
          'driver.vehicleType': 1,
          'driver.status': 1,
        },
      },
    ]);

    
    const allAvailableDrivers = await User.find({
      role: 'driver',
      isActive: true,
      status: 'available',
    }).select('name phone vehicleNumber vehicleType status');

    res.json({
      success: true,
      data: {
        suggestedDrivers: suggestions,     
        availableDrivers: allAvailableDrivers, 
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getMyTripsDriver = async (req, res) => {
  try {
    const { status, date } = req.query;

    let query = { driver: req.user._id };
    if (status) query.status = status;

    if (date) {
      const start = new Date(date); start.setHours(0, 0, 0, 0);
      const end   = new Date(date); end.setHours(23, 59, 59, 999);
      query.scheduledAt = { $gte: start, $lte: end };
    }

    const trips = await Trip.find(query)
      .populate('guest', 'name phone category company specialNeeds notes')
      .sort({ scheduledAt: 1 }); // upcoming first

    res.json({ success: true, count: trips.length, data: trips });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getMyTripsGuest = async (req, res) => {
  try {
    const trips = await Trip.find({ guest: req.user._id })
      .populate('driver', 'name phone vehicleNumber vehicleType')
      .sort({ scheduledAt: -1 });

    // Separate upcoming and past
    const now = new Date();
    const upcoming = trips.filter(t => new Date(t.scheduledAt) >= now && !['completed','cancelled'].includes(t.status));
    const past     = trips.filter(t => ['completed','cancelled'].includes(t.status));

    res.json({ success: true, data: { upcoming, past } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getTodayTrips = async (req, res) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);

    const trips = await Trip.find({ scheduledAt: { $gte: start, $lte: end } })
      .populate('guest',  'name phone category')
      .populate('driver', 'name phone vehicleNumber status')
      .sort({ scheduledAt: 1 });

    // Summary stats
    const stats = {
      total:     trips.length,
      completed: trips.filter(t => t.status === 'completed').length,
      ongoing:   trips.filter(t => ['en_route','arrived','in_progress'].includes(t.status)).length,
      upcoming:  trips.filter(t => ['assigned','acknowledged'].includes(t.status)).length,
      delayed:   trips.filter(t => t.status === 'delayed').length,
      cancelled: trips.filter(t => t.status === 'cancelled').length,
    };

    res.json({ success: true, data: { stats, trips } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createTrip,
  getAllTrips,
  getTripById,
  updateTripStatus,
  handleDelay,
  handleCancel,
  reassignDriver,
  suggestDriver,
  getMyTripsDriver,
  getMyTripsGuest,
  getTodayTrips,
};

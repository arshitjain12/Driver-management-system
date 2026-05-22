const User         = require('../models/User');
const Trip         = require('../models/Trip');
const Vehicle      = require('../models/Vehicle');
const LeaveRequest = require('../models/LeaveRequest');
const { emitToUser, emitToRole } = require('../socket/emitter');
const { getDistanceKm }          = require('./locationController');
const { getRequiredVehicleType } = require('./vehicleController');


const isDriverFreeAt = async (driverId, requestedTime) => {
  const time = new Date(requestedTime);
  const conflict = await Trip.findOne({
    driver: driverId,
    scheduledAt: {
      $gte: new Date(time.getTime() - 3 * 60 * 60 * 1000),
      $lte: new Date(time.getTime() + 3 * 60 * 60 * 1000),
    },
    status: { $nin: ['completed', 'cancelled', 'queued'] },
  });
  if (conflict) return false;
  const onLeave = await LeaveRequest.findOne({
    driver: driverId, status: 'approved',
    fromDate: { $lte: time }, toDate: { $gte: time },
  });
  return !onLeave;
};


const findBestDriver = async (guestId, scheduledAt, pickupLat, pickupLng) => {
  const allDrivers = await User.find({
    role: 'driver', isActive: true,
    status: { $in: ['available', 'off_duty'] },
  }).select('name status location vehicleNumber vehicleType');

  const freeDrivers = [];
  for (const driver of allDrivers) {
    const free = await isDriverFreeAt(driver._id, scheduledAt);
    if (!free) continue;
    let score = 0;
    let distance = null;
    if (driver.location?.lat && pickupLat && pickupLng) {
      distance = getDistanceKm(driver.location.lat, driver.location.lng, pickupLat, pickupLng);
      score += Math.max(0, 50 - distance);
    }
    const tripsTogether = await Trip.countDocuments({
      driver: driver._id, guest: guestId, status: 'completed',
    });
    score += tripsTogether * 10;
    freeDrivers.push({ driver, score, distance });
  }
  if (!freeDrivers.length) return null;
  freeDrivers.sort((a, b) => b.score - a.score);
  return freeDrivers[0].driver;
};


const guestRequestTrip = async (req, res) => {
  try {
    const {
      pickupAddress, pickupLat, pickupLng,
      dropAddress, dropLat, dropLng,
      scheduledAt, travelMode, travelNumber,
      passengerCount = 1, notes,
    } = req.body;

    if (!pickupAddress || !dropAddress || !scheduledAt) {
      return res.status(400).json({ success: false, message: 'pickupAddress, dropAddress and scheduledAt required' });
    }

    const vehicleType = getRequiredVehicleType(passengerCount);
    const bestDriver  = await findBestDriver(req.user._id, scheduledAt, pickupLat, pickupLng);
    const vehicle     = bestDriver
      ? await Vehicle.findOne({ vehicleType, status: 'available', isActive: true })
      : null;

    const isQueued = !bestDriver;

    const trip = await Trip.create({
      guest:   req.user._id,
      driver:  bestDriver?._id || null,
      vehicle: vehicle?._id    || null,
      pickupLocation: { address: pickupAddress, lat: pickupLat, lng: pickupLng },
      dropLocation:   { address: dropAddress,   lat: dropLat,   lng: dropLng   },
      scheduledAt, travelMode: travelMode || 'other', travelNumber,
      passengerCount, notes,
      createdBy: req.user._id,
      status:    isQueued ? 'queued' : 'assigned',
      statusHistory: [{
        status:    isQueued ? 'queued' : 'assigned',
        updatedBy: req.user._id,
        note: isQueued
          ? 'No driver available — added to queue'
          : `Auto-assigned to ${bestDriver.name} (${vehicleType})`,
      }],
    });

    if (vehicle && bestDriver) {
      await Vehicle.findByIdAndUpdate(vehicle._id, { status: 'in_use', currentDriver: bestDriver._id });
    }

    const populated = await Trip.findById(trip._id)
      .populate('driver',  'name phone vehicleNumber vehicleType')
      .populate('vehicle', 'plateNumber vehicleType capacity');

    if (!isQueued) {
      emitToUser(bestDriver._id, 'trip_assigned', {
        message: `New trip — Guest: ${req.user.name}`, trip: populated,
      });
      emitToRole('admin', 'trip_auto_assigned', {
        message: `Auto-assigned to ${bestDriver.name}`, trip: populated,
      });
    } else {
      emitToRole('admin', 'trip_queued', {
        message: `Trip queued — no driver for ${req.user.name}`, trip: populated,
      });
    }

    res.status(201).json({
      success: true,
      message: isQueued
        ? 'No driver available. Trip queued — you will be notified when assigned.'
        : `Driver ${populated.driver?.name} assigned!`,
      isQueued, data: populated,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};


const driverReportIssue = async (req, res) => {
  try {
    const { reason, issueType } = req.body;
    const trip = await Trip.findOne({
      _id: req.params.tripId, driver: req.user._id,
      status: { $nin: ['completed', 'cancelled'] },
    });
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });

    trip.statusHistory.push({
      status: trip.status, updatedBy: req.user._id,
      note: `⚠️ Issue: ${issueType} — ${reason}`,
    });
    await trip.save();

    emitToRole('admin', 'driver_issue_reported', {
      message: `⚠️ ${req.user.name} reported issue — ${issueType}: ${reason}`,
      tripId: trip._id, driverName: req.user.name, issueType, reason,
    });

    res.json({ success: true, message: 'Issue reported. Admin notified.' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};


const getAvailableDrivers = async (req, res) => {
  try {
    const { scheduledAt, passengers = 1, pickupLat, pickupLng } = req.query;
    const allDrivers = await User.find({ role: 'driver', isActive: true })
      .select('name status vehicleNumber vehicleType location');

    const result = await Promise.all(allDrivers.map(async (d) => {
      const free = await isDriverFreeAt(d._id, scheduledAt);
      const distance = (d.location?.lat && pickupLat && pickupLng)
        ? getDistanceKm(d.location.lat, d.location.lng, parseFloat(pickupLat), parseFloat(pickupLng)).toFixed(2)
        : null;
      return {
        _id: d._id, name: d.name, status: d.status,
        vehicleNumber: d.vehicleNumber, vehicleType: d.vehicleType,
        isAvailable: free, distanceKm: distance,
      };
    }));

    const available = result
      .filter(d => d.isAvailable)
      .sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));

    res.json({ success: true, data: { available, all: result } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { guestRequestTrip, driverReportIssue, getAvailableDrivers, findBestDriver, isDriverFreeAt };

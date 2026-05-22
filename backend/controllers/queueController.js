const Trip    = require('../models/Trip');
const User    = require('../models/User');
const Vehicle = require('../models/Vehicle');
const { emitToUser, emitToRole } = require('../socket/emitter');
const { getRequiredVehicleType } = require('./vehicleController');


const processQueue = async (freedDriverId) => {
  try {
    const driver = await User.findById(freedDriverId);
    if (!driver || !driver.isActive) return;

  
    const queuedTrip = await Trip.findOne({ status: 'queued' })
      .populate('guest', 'name category')
      .sort({ 'guest.category': -1, createdAt: 1 })
 
      ;

    if (!queuedTrip) return; 

 
    const conflict = await Trip.findOne({
      driver: freedDriverId,
      scheduledAt: {
        $gte: new Date(queuedTrip.scheduledAt.getTime() - 3 * 60 * 60 * 1000),
        $lte: new Date(queuedTrip.scheduledAt.getTime() + 3 * 60 * 60 * 1000),
      },
      status: { $nin: ['completed', 'cancelled'] },
    });

    if (conflict) return; 

    const requiredType = getRequiredVehicleType(queuedTrip.passengerCount || 1);
    const vehicle = await Vehicle.findOne({
      vehicleType: requiredType,
      status:      'available',
      isActive:    true,
    });

   
    queuedTrip.driver  = freedDriverId;
    queuedTrip.status  = 'assigned';
    if (vehicle) queuedTrip.vehicle = vehicle._id;
    queuedTrip.statusHistory.push({
      status:    'assigned',
      updatedBy: freedDriverId,
      note:      `Auto-assigned from queue to Driver ${driver.name}`,
    });
    await queuedTrip.save();

   
    if (vehicle) {
      await Vehicle.findByIdAndUpdate(vehicle._id, { status: 'in_use', currentDriver: freedDriverId });
    }

   s
    emitToUser(freedDriverId, 'trip_assigned', {
      message: `New trip from queue assigned — Guest: ${queuedTrip.guest?.name}`,
      trip:    queuedTrip,
    });
    emitToRole('admin', 'queue_dispatched', {
      message: `Queued trip auto-assigned to ${driver.name}`,
      trip:    queuedTrip,
    });

    console.log(`[Queue] Trip ${queuedTrip._id} auto-assigned to Driver ${driver.name}`);
  } catch (e) {
    console.error('[Queue] Error processing queue:', e.message);
  }
};


const getQueue = async (req, res) => {
  try {
    const queued = await Trip.find({ status: 'queued' })
      .populate('guest',  'name phone category company')
      .sort({ createdAt: 1 });

 
    const prioritized = queued.sort((a, b) => {
      const order = { VIP: 0, Corporate: 1, Regular: 2, Staff: 3 };
      return (order[a.guest?.category] || 2) - (order[b.guest?.category] || 2);
    });

    res.json({
      success: true,
      count:   prioritized.length,
      message: prioritized.length ? `${prioritized.length} trips waiting for driver` : 'Queue empty',
      data:    prioritized,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const manualDispatch = async (req, res) => {
  try {
    const { driverId } = req.body;
    if (!driverId) return res.status(400).json({ success: false, message: 'driverId required' });

    const trip = await Trip.findOne({ _id: req.params.tripId, status: 'queued' });
    if (!trip) return res.status(404).json({ success: false, message: 'Queued trip not found' });

    const driver = await User.findOne({ _id: driverId, role: 'driver', isActive: true });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    trip.driver = driverId;
    trip.status = 'assigned';
    trip.statusHistory.push({
      status:    'assigned',
      updatedBy: req.user._id,
      note:      `Manually dispatched from queue by admin`,
    });
    await trip.save();

    emitToUser(driverId, 'trip_assigned', {
      message: `Trip assigned — Guest: ${trip.guest?.name}`,
      trip,
    });

    res.json({ success: true, message: 'Trip dispatched from queue', data: trip });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { processQueue, getQueue, manualDispatch };

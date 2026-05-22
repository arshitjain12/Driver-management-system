const Vehicle = require('../models/Vehicle');
const Trip    = require('../models/Trip');


const getRequiredVehicleType = (passengerCount) => {
  if (passengerCount <= 2) return 'Sedan';
  if (passengerCount <= 4) return 'SUV';
  if (passengerCount <= 9) return 'Van';
  return 'Bus';
};


const getAllVehicles = async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = { isActive: true };
    if (status) query.status = status;
    if (type)   query.vehicleType = type;

    const vehicles = await Vehicle.find(query)
      .populate('currentDriver', 'name phone')
      .sort({ vehicleType: 1 });

    res.json({ success: true, count: vehicles.length, data: vehicles });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};


const addVehicle = async (req, res) => {
  try {
    const { plateNumber, vehicleType, capacity, brand, model, color, notes } = req.body;

    if (!plateNumber || !vehicleType) {
      return res.status(400).json({ success: false, message: 'plateNumber and vehicleType required' });
    }

    const exists = await Vehicle.findOne({ plateNumber: plateNumber.toUpperCase() });
    if (exists) return res.status(400).json({ success: false, message: 'Vehicle already exists' });

    const vehicle = await Vehicle.create({
      plateNumber, vehicleType, capacity, brand, model, color, notes,
    });

    res.status(201).json({ success: true, message: 'Vehicle added', data: vehicle });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};


const updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: vehicle });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};


const updateVehicleStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['available', 'in_use', 'maintenance'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: vehicle });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};


const assignDriverToVehicle = async (req, res) => {
  try {
    const { driverId } = req.body;

  
    await Vehicle.updateMany({ currentDriver: driverId }, { currentDriver: null });

    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { currentDriver: driverId || null },
      { new: true }
    ).populate('currentDriver', 'name phone');

    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    res.json({ success: true, message: 'Driver assigned to vehicle', data: vehicle });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};


const autoSelectVehicle = async (req, res) => {
  try {
    const { passengers = 1, scheduledAt } = req.query;
    const count       = parseInt(passengers);
    const requiredType = getRequiredVehicleType(count);

   
    const busyVehicleIds = await Trip.distinct('vehicle', {
      scheduledAt: {
        $gte: new Date(new Date(scheduledAt).getTime() - 3 * 60 * 60 * 1000),
        $lte: new Date(new Date(scheduledAt).getTime() + 3 * 60 * 60 * 1000),
      },
      status: { $nin: ['completed', 'cancelled', 'queued'] },
      vehicle: { $ne: null },
    });


    const vehicle = await Vehicle.findOne({
      vehicleType: requiredType,
      status:      'available',
      isActive:    true,
      _id:         { $nin: busyVehicleIds },
    }).populate('currentDriver', 'name phone status');

    if (!vehicle) {
   
      const types   = ['Sedan', 'SUV', 'Van', 'Bus'];
      const nextIdx = types.indexOf(requiredType) + 1;
      if (nextIdx < types.length) {
        const fallback = await Vehicle.findOne({
          vehicleType: types[nextIdx],
          status:      'available',
          isActive:    true,
          _id:         { $nin: busyVehicleIds },
        }).populate('currentDriver', 'name phone status');

        if (fallback) {
          return res.json({
            success: true,
            message: `No ${requiredType} available — suggesting ${fallback.vehicleType}`,
            data: fallback,
            recommended: requiredType,
          });
        }
      }

      return res.status(404).json({
        success: false,
        message: `No vehicle available for ${count} passengers at this time`,
        recommended: requiredType,
      });
    }

    res.json({
      success: true,
      message: `${requiredType} available`,
      data: vehicle,
      recommended: requiredType,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};


const deleteVehicle = async (req, res) => {
  try {
    const active = await Trip.findOne({
      vehicle: req.params.id,
      status: { $nin: ['completed', 'cancelled'] },
    });
    if (active) {
      return res.status(400).json({ success: false, message: 'Vehicle has active trips. Cannot deactivate.' });
    }
    await Vehicle.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Vehicle deactivated' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = {
  getAllVehicles,
  addVehicle,
  updateVehicle,
  updateVehicleStatus,
  assignDriverToVehicle,
  autoSelectVehicle,
  deleteVehicle,
  getRequiredVehicleType,
};

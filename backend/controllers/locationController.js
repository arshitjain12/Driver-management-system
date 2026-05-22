const User = require('../models/User');
const { emitToRole } = require('../socket/emitter');


const getDistanceKm = (lat1, lng1, lat2, lng2) => {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};


const updateLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat and lng required' });

    const driver = await User.findByIdAndUpdate(
      req.user._id,
      { location: { lat, lng, lastUpdatedAt: new Date() } },
      { new: true }
    ).select('name location status vehicleNumber vehicleType');

    emitToRole('admin', 'driver_location_updated', {
      driverId:      driver._id,
      driverName:    driver.name,
      vehicleNumber: driver.vehicleNumber,
      status:        driver.status,
      location:      { lat, lng },
    });

    res.json({ success: true, data: { lat, lng } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};


const getAllDriverLocations = async (req, res) => {
  try {
    const drivers = await User.find({
      role: 'driver', isActive: true,
      'location.lat': { $ne: null },
    }).select('name vehicleNumber vehicleType status location');

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const result = drivers.map(d => ({
      _id:           d._id,
      name:          d.name,
      vehicleNumber: d.vehicleNumber,
      vehicleType:   d.vehicleType,
      status:        d.status,
      location:      d.location,
      isStale:       d.location?.lastUpdatedAt < fiveMinAgo,
    }));

    res.json({ success: true, count: result.length, data: result });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { updateLocation, getAllDriverLocations, getDistanceKm };

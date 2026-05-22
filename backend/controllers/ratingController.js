const Rating = require('../models/Rating');
const Trip   = require('../models/Trip');
const User   = require('../models/User');


const createRating = async (req, res) => {
  try {
    const { tripId, stars, comment } = req.body;

    if (!tripId || !stars) {
      return res.status(400).json({ success: false, message: 'tripId and stars are required' });
    }

    if (stars < 1 || stars > 5) {
      return res.status(400).json({ success: false, message: 'stars must be between 1 and 5' });
    }


    const trip = await Trip.findOne({ _id: tripId, guest: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or not yours' });
    }


    if (trip.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'You can only rate a completed trip',
      });
    }

   
    const alreadyRated = await Rating.findOne({ trip: tripId });
    if (alreadyRated) {
      return res.status(400).json({ success: false, message: 'You have already rated this trip' });
    }

    const rating = await Rating.create({
      trip:   tripId,
      driver: trip.driver,
      guest:  req.user._id,
      stars:  Number(stars),
      comment,
    });

  
    await Trip.findByIdAndUpdate(tripId, { isRated: true });

    const populated = await Rating.findById(rating._id)
      .populate('driver', 'name vehicleNumber')
      .populate('guest',  'name');

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully. Thank you!',
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getDriverRatings = async (req, res) => {
  try {

    if (req.user.role === 'driver' && req.user._id.toString() !== req.params.driverId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const ratings = await Rating.find({ driver: req.params.driverId })
      .populate('guest', 'name company category')
      .populate('trip',  'scheduledAt pickupLocation dropLocation')
      .sort({ createdAt: -1 });

    const avgRating =
      ratings.length
        ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1)
        : null;

    
    const starBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratings.forEach((r) => { starBreakdown[r.stars] += 1; });

    res.json({
      success: true,
      data: {
        avgRating,
        totalRatings: ratings.length,
        starBreakdown,
        ratings,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getTripRating = async (req, res) => {
  try {
    const rating = await Rating.findOne({ trip: req.params.tripId })
      .populate('driver', 'name')
      .populate('guest',  'name');

    if (!rating) {
      return res.status(404).json({ success: false, message: 'No rating found for this trip' });
    }

    if (req.user.role === 'driver' && rating.driver._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (req.user.role === 'guest' && rating.guest._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: rating });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getRatingOverview = async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver', isActive: true }).select('name vehicleNumber vehicleType status');

    const overview = await Promise.all(
      drivers.map(async (driver) => {
        const ratings = await Rating.find({ driver: driver._id });
        const avgRating =
          ratings.length
            ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1)
            : null;

        const totalTrips = await Trip.countDocuments({
          driver: driver._id,
          status: 'completed',
        });

        return {
          driver: {
            _id:           driver._id,
            name:          driver.name,
            vehicleNumber: driver.vehicleNumber,
            vehicleType:   driver.vehicleType,
            status:        driver.status,
          },
          avgRating,
          totalRatings: ratings.length,
          totalTrips,
        };
      })
    );

   
    overview.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));

    res.json({ success: true, count: overview.length, data: overview });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getPendingRatings = async (req, res) => {
  try {
    const completedTrips = await Trip.find({
      guest:   req.user._id,
      status:  'completed',
      isRated: false,
    }).populate('driver', 'name vehicleNumber vehicleType');

    res.json({
      success: true,
      message: completedTrips.length
        ? `You have ${completedTrips.length} trip(s) to rate`
        : 'All trips are rated. Thank you!',
      count: completedTrips.length,
      data:  completedTrips,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createRating,
  getDriverRatings,
  getTripRating,
  getRatingOverview,
  getPendingRatings,
};

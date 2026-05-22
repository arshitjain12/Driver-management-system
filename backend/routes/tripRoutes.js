const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/tripController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/',                    authorize('admin'),                     createTrip);
router.get('/',                     authorize('admin'),                     getAllTrips);
router.get('/today',                authorize('admin'),                     getTodayTrips);
router.get('/suggest-driver',       authorize('admin'),                     suggestDriver);
router.patch('/:id/delay',          authorize('admin'),                     handleDelay);
router.patch('/:id/cancel',         authorize('admin'),                     handleCancel);
router.patch('/:id/reassign',       authorize('admin'),                     reassignDriver);


router.get('/my-trips',             authorize('driver'),                    getMyTripsDriver);


router.get('/my-bookings',          authorize('guest'),                     getMyTripsGuest);


router.get('/:id',                  authorize('admin','driver','guest'),    getTripById);
router.patch('/:id/status',         authorize('admin','driver'),            updateTripStatus);

module.exports = router;

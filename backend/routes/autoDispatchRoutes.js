const express = require('express');
const router  = express.Router();
const {
  guestRequestTrip,
  guestReportDelay,
  guestReady,
  driverReportIssue,
  getAvailableDrivers,
} = require('../controllers/autoDispatchController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);


router.post('/request',              authorize('guest'),  guestRequestTrip);


router.patch('/guest-delay/:tripId', authorize('guest'),  guestReportDelay);


router.patch('/guest-ready/:tripId', authorize('guest'),  guestReady);


router.post('/issue/:tripId',        authorize('driver'), driverReportIssue);


router.get('/available',             authorize('admin'),  getAvailableDrivers);

module.exports = router;

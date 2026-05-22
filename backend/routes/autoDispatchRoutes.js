const express = require('express');
const router  = express.Router();
const {
  guestRequestTrip,
  driverReportIssue,
  getAvailableDrivers,
} = require('../controllers/autoDispatchController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);


router.post('/request',          authorize('guest'),          guestRequestTrip);


router.post('/issue/:tripId',    authorize('driver'),         driverReportIssue);


router.get('/available',         authorize('admin'),          getAvailableDrivers);

module.exports = router;

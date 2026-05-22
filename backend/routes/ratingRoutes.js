const express = require('express');
const router  = express.Router();
const {
  createRating,
  getDriverRatings,
  getTripRating,
  getRatingOverview,
  getPendingRatings,
} = require('../controllers/ratingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);


router.post('/',            authorize('guest'),                   createRating);
router.get('/pending',      authorize('guest'),                   getPendingRatings);


router.get('/overview',     authorize('admin'),                   getRatingOverview);


router.get('/driver/:driverId', authorize('admin', 'driver'),    getDriverRatings);


router.get('/trip/:tripId', authorize('admin','driver','guest'), getTripRating);

module.exports = router;

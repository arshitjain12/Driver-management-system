const express = require('express');
const router  = express.Router();
const { updateLocation, getAllDriverLocations } = require('../controllers/locationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);


router.post('/update',  authorize('driver'),  updateLocation);


router.get('/drivers',  authorize('admin'),   getAllDriverLocations);

module.exports = router;

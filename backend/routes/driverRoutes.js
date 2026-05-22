const express = require('express');
const router = express.Router();
const {
  getAllDrivers,
  getDriverById,
  addDriver,
  updateDriver,
  deleteDriver,
  updateDriverStatus,
  updateAdminNotes,
  getDriverHistory,
} = require('../controllers/driverController');
const { protect, authorize } = require('../middleware/authMiddleware');


router.use(protect);


router.get('/',           authorize('admin'),          getAllDrivers);
router.post('/',          authorize('admin'),          addDriver);
router.put('/:id',        authorize('admin'),          updateDriver);
router.delete('/:id',     authorize('admin'),          deleteDriver);
router.patch('/:id/notes',authorize('admin'),          updateAdminNotes);


router.get('/:id',              authorize('admin', 'driver'), getDriverById);
router.patch('/:id/status',     authorize('admin', 'driver'), updateDriverStatus);
router.get('/:id/history',      authorize('admin', 'driver'), getDriverHistory);

module.exports = router;

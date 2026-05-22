const express = require('express');
const router = express.Router();
const {
  getAllGuests,
  getGuestById,
  addGuest,
  updateGuest,
  deleteGuest,
  addPreferredLocation,
  getGuestHistory,
} = require('../controllers/guestController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);


router.get('/',       authorize('admin'),         getAllGuests);
router.post('/',      authorize('admin'),         addGuest);
router.put('/:id',    authorize('admin'),         updateGuest);
router.delete('/:id', authorize('admin'),         deleteGuest);


router.get('/:id',                authorize('admin', 'guest'), getGuestById);
router.get('/:id/history',        authorize('admin', 'guest'), getGuestHistory);
router.post('/:id/locations',     authorize('admin', 'guest'), addPreferredLocation);

module.exports = router;

const express = require('express');
const router  = express.Router();
const {
  createLeaveRequest,
  getMyLeaveRequests,
  getAllLeaveRequests,
  reviewLeaveRequest,
  deleteLeaveRequest,
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Driver only
router.post('/',         authorize('driver'),          createLeaveRequest);
router.get('/my',        authorize('driver'),          getMyLeaveRequests);
router.delete('/:id',    authorize('driver'),          deleteLeaveRequest);


router.get('/',          authorize('admin'),           getAllLeaveRequests);
router.patch('/:id/review', authorize('admin'),        reviewLeaveRequest);

module.exports = router;

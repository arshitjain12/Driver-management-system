const express = require('express');
const router  = express.Router();
const { getQueue, manualDispatch } = require('../controllers/queueController');
const { protect, authorize }       = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/',                    getQueue);
router.patch('/:tripId/dispatch',  manualDispatch);

module.exports = router;

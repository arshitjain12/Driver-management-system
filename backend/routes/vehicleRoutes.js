const express = require('express');
const router  = express.Router();
const {
  getAllVehicles, addVehicle, updateVehicle,
  updateVehicleStatus, assignDriverToVehicle,
  autoSelectVehicle, deleteVehicle,
} = require('../controllers/vehicleController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
router.use(authorize('admin'));

router.get('/',                    getAllVehicles);
router.get('/auto-select',         autoSelectVehicle);
router.post('/',                   addVehicle);
router.put('/:id',                 updateVehicle);
router.patch('/:id/status',        updateVehicleStatus);
router.patch('/:id/assign-driver', assignDriverToVehicle);
router.delete('/:id',              deleteVehicle);

module.exports = router;

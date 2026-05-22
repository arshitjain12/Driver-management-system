const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    plateNumber:  { type: String, required: true, unique: true, uppercase: true, trim: true },
    vehicleType:  { type: String, enum: ['Sedan', 'SUV', 'Van', 'Bus'], required: true },
    capacity:     { type: Number }, 

    status: {
      type: String,
      enum: ['available', 'in_use', 'maintenance'],
      default: 'available',
    },

  
    currentDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    brand:  { type: String },   
    model:  { type: String },   
    color:  { type: String },

    isActive: { type: Boolean, default: true },
    notes:    { type: String },
  },
  { timestamps: true }
);


vehicleSchema.pre('save', function (next) {
  if (!this.isModified('vehicleType')) return next();
  const capacityMap = { Sedan: 4, SUV: 6, Van: 9, Bus: 20 };
  if (!this.capacity) this.capacity = capacityMap[this.vehicleType];
  next();
});

module.exports = mongoose.model('Vehicle', vehicleSchema);

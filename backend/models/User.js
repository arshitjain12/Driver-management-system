const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:    { type: String, required: true },
    password: { type: String, required: true },
    role:     { type: String, enum: ['admin', 'driver', 'guest'], required: true },
    isActive: { type: Boolean, default: true },


    licenseNumber: { type: String },
    vehicleNumber: { type: String },
    vehicleType:   { type: String, enum: ['Sedan', 'SUV', 'Van', 'Bus'] },


    location: {
      lat:              { type: Number, default: null },
      lng:              { type: Number, default: null },
      lastUpdatedAt:    { type: Date,   default: null },
    },

   
    status: {
      type: String,
      enum: ['available', 'on_trip', 'off_duty'],
      default: 'available',
    },


    adminNotes: { type: String, default: '' },

    
    company:  { type: String },
    category: {
      type: String,
      enum: ['VIP', 'Corporate', 'Regular', 'Staff'],
      default: 'Regular',
    },

    preferredPickupLocations: [
      {
        label:   { type: String },   
        address: { type: String },
        city:    { type: String },
      },
    ],

    preferredDropLocations: [
      {
        label:   { type: String },   
        address: { type: String },
        city:    { type: String },
      },
    ],

    specialNeeds: { type: String }, 
    notes:        { type: String }, 
  },
  { timestamps: true }
);


userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});


userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};


userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);

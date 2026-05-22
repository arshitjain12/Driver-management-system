const mongoose = require('mongoose');


const statusHistorySchema = new mongoose.Schema({
  status:    { type: String },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  note:      { type: String },
  updatedAt: { type: Date, default: Date.now },
});

const tripSchema = new mongoose.Schema(
  {
    guest:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User',default: null },

    pickupLocation: {
      label:   { type: String },
      address: { type: String, required: true },
      city:    { type: String },
    },

    dropLocation: {
      label:   { type: String },
      address: { type: String, required: true },
      city:    { type: String },
    },

    scheduledAt: { type: Date, required: true },   
    updatedTime: { type: Date },                   

    travelMode:   { type: String, enum: ['flight', 'train', 'bus', 'other'], default: 'other' },
    travelNumber: { type: String },

  
    vehicle:        { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    passengerCount: { type: Number, default: 1 },  


    status: {
      type: String,
      enum: [
        'queued',         
        'assigned',
        'acknowledged',
        'en_route',
        'arrived',
        'in_progress',
        'completed',
        'delayed',
        'cancelled',
      ],
      default: 'assigned',
    },

    statusHistory: [statusHistorySchema],  

    delayReason:  { type: String },
    cancelReason: { type: String },
    notes:        { type: String },        

    isRated:   { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model('Trip', tripSchema);

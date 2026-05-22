const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    trip:   { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, unique: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    guest:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    stars:   { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Rating', ratingSchema);

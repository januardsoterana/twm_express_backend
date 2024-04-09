const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TraitSchema = new Schema({
  no: {
    type: Number,
    required: true
  },
  trait: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('trait', TraitSchema);

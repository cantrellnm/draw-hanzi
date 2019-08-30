const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const listSchema = new mongoose.Schema({
  name: String,
  content: String,
  user: ObjectId,
  public: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const List = mongoose.model('List', listSchema);

module.exports = List;

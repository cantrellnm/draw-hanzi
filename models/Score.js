const mongoose = require('mongoose');
const ObjectId = mongoose.Schema.Types.ObjectId;

const scoreSchema = new mongoose.Schema({
  char: String,
  user: ObjectId,
  score: {
    type: Number,
    default: 0
  },
  totalAttempts: {
    type: Number,
    default: 0
  },
  attempts: {
    type: [Array],
    default: []
  }
}, { timestamps: true });

scoreSchema.methods.addAttempt = async function(attempt) {
  // check that attempt is array and values are integers
  if (!Array.isArray(attempt) || attempt.find(a => { return !Number.isInteger(parseInt(a)); })) {
    return false;
  }
  this.totalAttempts = this.totalAttempts + 1;
  // keep max 10 attempts
  if (this.attempts.length === 10) {
    this.attempts = this.attempts.slice(1);
  }
  this.attempts.push(attempt);
  let averages = this.attempts.map(a => { return arrayAvg(a); });
  this.score = Math.round(arrayAvg(averages) * 100);
  await this.save();
  return this;
};

const Score = mongoose.model('Score', scoreSchema);

module.exports = Score;

function arrayAvg(arr) {
  return arr.reduce(function(a, b) { return parseInt(a) + parseInt(b); })/arr.length;
}

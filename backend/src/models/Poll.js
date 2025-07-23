import mongoose from 'mongoose';

const pollSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    maxLength: 100
  },
  options: [{
    id: Number,
    text: String,
    isCorrect: Boolean,
    votes: {
      type: Number,
      default: 0
    }
  }],
  timeLimit: {
    type: Number,
    required: true,
    default: 60 
  },
  isActive: {
    type: Boolean,
    default: false
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  totalVotes: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: String,
    required: true,
    default: 'teacher'
  }
}, {
  timestamps: true
});

pollSchema.virtual('timeRemaining').get(function() {
  if (!this.startTime || !this.isActive) return 0;
  const now = new Date();
  const elapsed = Math.floor((now - this.startTime) / 1000);
  const remaining = this.timeLimit - elapsed;
  return Math.max(0, remaining);
});

pollSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.model('Poll', pollSchema);

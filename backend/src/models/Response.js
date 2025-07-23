import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  pollId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Poll',
    required: true
  },
  studentId: {
    type: String,
    required: true,
    default: () => 'student_' + Math.random().toString(36).substr(2, 9)
  },
  studentName: {
    type: String,
    required: false,
    default: 'Anonymous Student'
  },
  selectedOption: {
    type: Number,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

responseSchema.index({ pollId: 1, studentId: 1 }, { unique: true });

export default mongoose.model('Response', responseSchema);

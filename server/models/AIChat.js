const mongoose = require('mongoose');

const aiChatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    role: {
      type: String,
      enum: ['user', 'model', 'system'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    action: {
      type: {
        type: String, // 'leave_card', 'pending_leaves', 'attendance_status', 'payroll_summary', 'stats', 'policies'
        default: null
      },
      data: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      }
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);

aiChatSchema.index({ userId: 1, createdAt: 1 });

const AIChat = mongoose.model('AIChat', aiChatSchema);
module.exports = AIChat;


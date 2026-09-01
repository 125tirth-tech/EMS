const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee ID is required']
    },
    type: {
      type: String,
      enum: ['sick', 'casual', 'annual', 'maternity', 'paternity', 'unpaid', 'other'],
      required: [true, 'Leave type is required']
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approverComment: {
      type: String,
      default: ''
    },
    days: {
      type: Number,
      default: 1
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

leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ status: 1 });

// Calculate days before save
leaveSchema.pre('save', function () {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    this.days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
});

const Leave = mongoose.model('Leave', leaveSchema);
module.exports = Leave;

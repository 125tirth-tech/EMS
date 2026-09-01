const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee ID is required']
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }
    },
    checkIn: {
      type: Date,
      default: null
    },
    checkOut: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'half-day', 'on-leave'],
      default: 'present'
    },
    hoursWorked: {
      type: Number,
      default: 0
    },
    notes: {
      type: String,
      default: ''
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

// Compound index: one attendance per employee per day
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;

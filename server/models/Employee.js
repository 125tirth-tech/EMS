const mongoose = require('mongoose');
const config = require('../config');

const employeeSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      default: ''
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: {
        values: config.DEPARTMENTS,
        message: '{VALUE} is not a valid department'
      }
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true
    },
    salary: {
      type: Number,
      default: 0,
      min: [0, 'Salary cannot be negative']
    },
    dateOfJoining: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'on-leave'],
        message: '{VALUE} is not a valid status'
      },
      default: 'active'
    },
    avatar: {
      type: String,
      default: null
    },
    address: {
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
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for efficient queries
employeeSchema.index({ department: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ firstName: 'text', lastName: 'text', email: 'text', position: 'text' });

const Employee = mongoose.model('Employee', employeeSchema);

module.exports = Employee;

const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee ID is required']
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true
    },
    basicSalary: {
      type: Number,
      required: true,
      min: 0
    },
    allowances: {
      hra: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      medical: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    deductions: {
      tax: { type: Number, default: 0 },
      insurance: { type: Number, default: 0 },
      pf: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    bonus: {
      type: Number,
      default: 0
    },
    totalAllowances: {
      type: Number,
      default: 0
    },
    totalDeductions: {
      type: Number,
      default: 0
    },
    netPay: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['draft', 'processed', 'paid'],
      default: 'draft'
    },
    paidDate: {
      type: Date,
      default: null
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
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

// Unique payroll per employee per month/year
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

// Calculate totals before save
payrollSchema.pre('save', function () {
  this.totalAllowances = (this.allowances.hra || 0) + (this.allowances.transport || 0) +
    (this.allowances.medical || 0) + (this.allowances.other || 0);
  this.totalDeductions = (this.deductions.tax || 0) + (this.deductions.insurance || 0) +
    (this.deductions.pf || 0) + (this.deductions.other || 0);
  this.netPay = this.basicSalary + this.totalAllowances + this.bonus - this.totalDeductions;
});

const Payroll = mongoose.model('Payroll', payrollSchema);
module.exports = Payroll;

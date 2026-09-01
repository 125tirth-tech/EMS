const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [4, 'Password must be at least 4 characters']
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'hr', 'employee'],
        message: '{VALUE} is not a valid role'
      },
      default: 'employee'
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null
    },
    accountStatus: {
      type: String,
      enum: {
        values: ['active', 'pending', 'password-not-set', 'disabled'],
        message: '{VALUE} is not a valid account status'
      },
      default: 'active'
    },
    mustChangePassword: {
      type: Boolean,
      default: false
    },
    tempPassword: {
      type: String,
      default: null
    },
    resetToken: {
      type: String,
      default: null
    },
    resetTokenExpiry: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret.password;
        delete ret.resetToken;
        delete ret.resetTokenExpiry;
        delete ret.tempPassword;
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret.password;
        delete ret.resetToken;
        delete ret.resetTokenExpiry;
        delete ret.tempPassword;
        delete ret.__v;
        return ret;
      }
    }
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;

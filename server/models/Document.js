const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    name: {
      type: String,
      required: [true, 'Document name is required'],
      trim: true
    },
    type: {
      type: String,
      enum: ['id-proof', 'address-proof', 'resume', 'offer-letter', 'contract', 'certificate', 'payslip', 'other'],
      default: 'other'
    },
    fileName: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      default: 0
    },
    mimeType: {
      type: String,
      default: 'application/octet-stream'
    },
    data: {
      type: String,  // Base64 encoded data
      required: true
    },
    uploadedBy: {
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
        delete ret.data; // Don't send data in list queries
        return ret;
      }
    }
  }
);

documentSchema.index({ employeeId: 1, type: 1 });

const Document = mongoose.model('Document', documentSchema);
module.exports = Document;

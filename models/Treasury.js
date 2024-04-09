const mongoose = require('mongoose');

const TreasurySchema = new mongoose.Schema({
    wallet: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        default: 0,
    },
    depositIndex: {
        type: Number,
        default:0,
    },
    claimIndex: {
        type: Number,
        default:0,
    },
    claimHistory: {
        type: Array,
        default: []
    },
    status: {
        type: Boolean,
        default: false,
    }
});

module.exports = mongoose.model('treasury', TreasurySchema);

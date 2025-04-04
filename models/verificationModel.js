const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema({
    transactionGuid: { type: String, required: true },
    shortGuid: { type: String, required: true },
    verified: { type: Boolean, required: true },
    person: {
        nationalId: { type: String },
        cardId: { type: String },
        surname: { type: String },
        forenames: { type: String },
        // other fields from person, if necessary
    },
    requestTimestamp: { type: Date },
    responseTimestamp: { type: Date },
});

const Verification = mongoose.model('Verification', verificationSchema);

module.exports = Verification;

const mongoose = require('mongoose');

const User = new mongoose.Schema({
    userId: {
        type: Number,
        require: true
    },
    account: {
        type: String,
        require: true
    },
    password: {
        type: String,
        require: true
    },
    authentication: {
        type: Number,
        require: true,
        default: 0
    },
    userName: {
        type: String,
        require: true
    },
    // 1: customer, 2: company
    type: {
        type: Number,
        require: true,
        default: 1
    },
    avatar: {
        type: String
    },
    address: {
        type: String
    },
    email: {
        type: String
    },
    phone: {
        type: String
    }
}, {
    versionKey: false
}, { timestamps: true })

module.exports = mongoose.model('User', User)
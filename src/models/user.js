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
    city: {
        type: Number
    },
    district: {
        type: Number
    },
    email: {
        type: String
    },
    phone: {
        type: String
    },
    avatar: {
        type: String
    },
    imageIntroduce: {
        type: Array
    },
    vote: {
        type: Number
    },
    latestOrderTime: {
        type: Number
    },
    createdAt: {
        type: Number
    },
    updatedAt: {
        type: Number
    },
    comments: {
        type: Array
    }
}, {
    versionKey: false
})

module.exports = mongoose.model('User', User)
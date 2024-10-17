const mongoose = require('mongoose');

const Users = new mongoose.Schema({
    userID: {
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
    costRange: {
        type: Number
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
    }
}, {
    versionKey: false
})

module.exports = mongoose.model('Users', Users)
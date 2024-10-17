const mongoose = require('mongoose');

const connectDB = async (uri) => {
    try {
        mongoose.connect(uri)
        console.log('DB Connected!')
    } catch (error) {
        console.log(error)
    }
}

module.exports = connectDB
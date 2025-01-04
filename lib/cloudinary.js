const cloudinary = require('cloudinary').v2;
const config =   require("dotenv").config()

config()

cloudinary.config({
    cloud_name: 'dopealdej',
    api_key: '132119233254829',
    api_secret: 'H_3e9H4aderXwlMVyuTLsfwvCTU'
})

module.exports = cloudinary
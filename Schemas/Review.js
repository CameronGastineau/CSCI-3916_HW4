var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// require('dotenv').config({path:"./.env.development"});

mongoose.Promise = global.Promise;

mongoose.connect(process.env.DB,
    {
        useNewUrlParser: true,
        useFindAndModify: false,
        useCreateIndex: true,
        useUnifiedTopology: true})
    .then(() => console.log('Review Database Connected!'))
    .catch(err => {
        console.log(`Review Database Connection Error: ${err.message}`);
    });

var ReviewSchema = new Schema({
    movieID: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    userID: {
        type: mongoose.Types.ObjectId,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    rating: {
        type: Number,
        min: 0,
        max: 5,
        required: true
    },
    review: {
        type: String,
        required: true
    }
});

ReviewSchema.index({ userID: 1, movieID: 1}, {unique: true});

// return the model

module.exports = mongoose.model('Review', ReviewSchema);
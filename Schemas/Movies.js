var mongoose = require('mongoose');
// require('dotenv').config();
var Schema = mongoose.Schema;

mongoose.Promise = global.Promise;

//mongoose.connect(process.env.DB, {useNewUrlParser: true});
mongoose.connect(process.env.DB,
    {
        useNewUrlParser: true,
        useFindAndModify: false,
        useCreateIndex: true,
        useUnifiedTopology: true})
    .then(() => console.log('Movies Database Connected!'))
    .catch(err => {
        console.log("Movies Database Connection Error: ${err.message}");
    });

var ActorSchema = new Schema({
    actorName: {
        type: String,
        required: true
    },
    characterName: {
        type: String,
        required: true
    }
});

var MovieSchema = new Schema({
    title: {
        type: String,
        required: true,
        index: {unique: true}
    },
    yearReleased: {
        type: String,
        required: true
    },
    genre: {
        type: String,
        required: true,
        enum: ['Action',
            'Adventure',
            'Comedy',
            'Drama',
            'Fantasy',
            'Horror',
            'Mystery',
            'Thriller',
            'Western']
    },
    actors: {
        type: [ActorSchema],
        required: true
    }
});


// return the model
module.exports = mongoose.model('Movies', MovieSchema);
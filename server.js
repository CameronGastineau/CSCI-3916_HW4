let express = require('express');
let bodyParser = require('body-parser');
let passport = require('passport');
let authJwtController = require('./auth_jwt');
let jwt = require('jsonwebtoken');
let cors = require('cors');

var mongoose = require('mongoose');
//
// require('dotenv').config('/.env.development');

let User = require('./Schemas/Users');
let Movie = require('./Schemas/Movies');
let Review = require('./Schemas/Review');

let app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(passport.initialize());

let router = express.Router();

getUserID = (req, res, next) => {
    //If we get this far, we have a valid auth token
    let userToken = req.headers.authorization.split(' ');

    //using this to get decoded ID
    jwt.verify(userToken[1], process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            return res.status(401).send({
                success: false,
                message: "Unauthorized"
            });
        }

        req.userID = decoded.id;
        req.userName = decoded.username;

        console.log(decoded);

        next();
    });
};

router.route('/movies')
    .get(authJwtController.isAuthenticated, function (req, res) {
        //output the request to server console
        console.log("\n=====MOVIE - GET REQUEST=====");
        console.log(req.body);

        let withReviews;
        if (req.query.reviews) {
            withReviews = JSON.parse(req.query.reviews); //sets true if true, false if anything else.
        }

        Movie.find(function (err, movie) {
            if (err) {
                res.status(500).send(err);
            } else {
                if (withReviews) {
                    //aggregate with reviews and return both
                    Movie.aggregate([
                        {
                            $lookup: {
                                from: "reviews",
                                localField: "_id",
                                foreignField: "movieID",
                                as: "reviews"
                            }
                        },
                        {
                            $addFields: {
                                averageRating: {$avg: "$reviews.rating"}
                            }
                        },
                        {
                            $sort: {
                                averageRating: -1
                            }
                        }
                    ], function(err, doc) {
                        if (err){
                            return res.status(400).json({ success: false, message: 'Problems with Review Aggregation'})
                        }
                        else {
                            return res.status(200).json(doc);
                        }
                    })
                } else {
                    return res.status(200).json(movie);
                }
            }
        })
    })
    .post(authJwtController.isAuthenticated, function (req, res) {

        //output the request to server console
        console.log("\n=====MOVIE - POST REQUEST=====");
        console.log(req.body);

        if (!req.body.title || !req.body.yearReleased || !req.body.genre || !req.body.actors) {
            return res.status(400).json({
                success: false,
                message: 'Please pass complete movie details, including title, yearReleased, genre, and at least one actor (including name and character).'
            });
        } else {
            const movie = new Movie();
            movie.title = req.body.title;
            movie.yearReleased = req.body.yearReleased;
            movie.genre = req.body.genre;
            movie.actors = req.body.actors;
            movie.imageURL = req.body.imageURL;
            // save the movie
            movie.save(function (err, result) {
                if (err) {
                    // duplicate entry
                    if (err.code === 11000)
                        return res.status(400).json({success: false, message: 'A movie with that title already exists.'});
                    else
                        return res.status(500).send(err);
                }

                return res.status(200).json({success: true, message: 'Movie created!', movieID: result._id});
            });
        }
    })
    .put(authJwtController.isAuthenticated, function (req, res) {
        //output the request to server console
        console.log("\n=====PUT REQUEST=====");
        console.log(req.body);

        Movie.findByIdAndUpdate(
            // the id of the item to find
            req.body._id,

            // the change to be made. Mongoose will smartly combine your existing
            // document with this change, which allows for partial updates too
            req.body,

            // an option that asks mongoose to return the updated version
            // of the document instead of the pre-updated one.
            {new: true},

            // the callback function
            (err, movie) => {
                if(!movie) {
                    return res.status(400).json({ success: false, message: 'Failed to update movie with provided id: No such movie found'});
                }

                // Handle any possible database errors
                if (err)
                    return res.status(500).send(err);
                return res.status(200).json({success: true, message: 'Movie updated!'});
            })
        })
        .delete(authJwtController.isAuthenticated, function (req, res) {
            //output the request to server console
            console.log("\n=====DELETE REQUEST WITH ID=====");
            console.log(req.body);

            var numberReviews = 0;

            Movie.findByIdAndDelete(req.body._id, (err, movie) => {
                if(!movie) {
                    return res.status(400).json({success: false, message: 'Failed to delete movie with provided id: No such movie found'})
                }

                if (err)
                    return res.status(500).send(err);

                Review.deleteMany({
                    "movieID": req.body._id
                }, (err, reviews) => {

                    //don't bother returning the error
                    if (err) {
                        console.log(err);
                    }

                    if (reviews.deletedCount > 0) {
                        numberReviews = reviews.deletedCount;
                    }

                    return res.status(200).json({success: true, message: `Movie deleted along with ${numberReviews} corresponding reviews.`, movieID: movie._id});
                });
            })
    });

router.route('/movies/:id')
    .get(authJwtController.isAuthenticated, function (req, res) {
        //output the request to server console
        console.log("\n=====GET REQUEST WITH ID=====");
        console.log(req.body);

        let id = req.params.id;

        let withReviews;
        if (req.query.reviews) {
            withReviews = JSON.parse(req.query.reviews);//sets true if true, false if anything else.
        }

        Movie.findById(id, function (err, movie) {
            if(!movie)
                return res.status(400).json({ success: false, message: 'Failed to find movie with provided id: No such movie found'});

            if (err)
                res.status(500).send(err);

            if (withReviews) {
                //aggregate with reviews and return both
                console.log(id);

                Movie.aggregate([
                    {
                        $match: {"_id": mongoose.Types.ObjectId(id)}
                    },
                    {
                        $lookup: {
                            from: "reviews",
                            localField: "_id",
                            foreignField: "movieID",
                            as: "reviews"
                        }
                    },
                        {
                            $addFields: {
                                averageRating: {$avg: "$reviews.rating"}
                            }
                        }
                    }
                ], function(err, doc) {
                    if (err){
                        res.status(400).json({ success: false, message: 'Problems with Review Aggregation'})
                    }
                    else {
                        res.status(200).json(doc[0]);
                    }
                })
            } else {
                // return that movie
                res.status(200).json(movie);
            }

        });
    });

router.route('/reviews')
    //using getUserName as a type of middleware, here.
    .post(authJwtController.isAuthenticated, [getUserID], function (req, res) {
        console.log("\n=====REVIEW - POST REQUEST=====");
        console.log(req.body);

        if (!req.body.movieID || !req.body.review || !req.body.rating) {
            res.status(400).json({
                success: false,
                message: 'Please pass complete movie details, including movieID, review, and rating'
            });
        } else {
            Movie.findById(req.body.movieID, function (err, movie) {
                if (!movie)
                    return res.status(400).json({
                        success: false,
                        message: 'Bad Movie ID in Review Post Request'
                    });

                if (err)
                    return res.status(500).send(err);

                const review = new Review();
                review.movieID = req.body.movieID;
                review.userID = req.userID;
                review.userName = req.userName;
                review.review = req.body.review;
                review.rating = req.body.rating;

                review.save(function (err) {
                    if (err) {
                        //duplicate entry
                        if (err.code === 11000) {
                            return res.status(400).json({
                                success: false,
                                message: 'A review by that user and for that movie already exists.'
                            });
                        } else {
                            return res.status(500).send(err);
                        }
                    }

                    res.status(200).json({
                        success: true,
                        message: 'Review created!'});
                });
            });
        }
    })
    .put(authJwtController.isAuthenticated, [getUserID], function (req, res) {
        //output the request to server console
        console.log("\n=====REVIEW - PUT REQUEST=====");
        console.log(req.body);

        Review.findByIdAndUpdate(
            // the id of the item to find
            req.body._id,

            // the change to be made. Mongoose will smartly combine your existing
            // document with this change, which allows for partial updates too
            req.body,

            // an option that asks mongoose to return the updated version
            // of the document instead of the pre-updated one.
            {new: true},

            // the callback function
            (err, todo) => {
                if(!todo) {
                    return res.status(400).json({ success: false, message: 'Failed to update review with provided id: No such review found'});
                }

                // Handle any possible database errors
                if (err)
                    return res.status(500).send(err);
                return res.status(200).json({success: true, message: 'Review updated!'});
            })
    });

router.route('/users/:userId')
    .get(authJwtController.isAuthenticated, function (req, res) {
        //output the request to server console
        console.log("\n=====GET USER WITH ID=====");
        console.log(req.body);

        let id = req.params.userId;
        User.findById(id, function (err, user) {
            if (err) res.send(err);

            // return that user
            res.json(user);
        });
    });

router.route('/users')
    .get(authJwtController.isAuthenticated, function (req, res) {
        //output the request to server console
        console.log("\n=====GET USER=====");
        console.log(req.body);

        User.find(function (err, users) {
            if (err) res.send(err);
            // return the users
            res.json(users);
        });
    });

router.post('/signup', function (req, res) {
    //output the request to server console
    console.log("\n=====POST SIGNUP REQUEST=====");
    console.log(req.body);

    if (!req.body.username || !req.body.password || !req.body.name) {
        res.status(400).json({success: false, message: 'Please pass name, username, and password.'});
    } else {
        const user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;
        // save the user
        user.save(function (err) {
            if (err) {
                // duplicate entry
                if (err.code === 11000)
                    return res.status(400).json({success: false, message: 'A user with that username already exists.'});
                else
                    return res.status(500).send(err);
            }

            res.status(200).json({success: true, message: 'User created!'});
        });
    }
});

router.post('/signin', function (req, res) {
    //output the request to server console
    console.log("\n=====POST SIGNIN REQUEST=====");
    console.log(req.body);

    const userNew = new User();
    userNew.name = req.body.name;
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({username: userNew.username}).select('name username password').exec(function (err, user) {
        if (err)
            return res.status(500).send(err);

        if(!user)
            return res.status(400).send({success: false, message: "No such user found."});

        user.comparePassword(userNew.password, function (isMatch) {
            if (isMatch) {
                let userToken = {id: user._id, username: user.username};
                let token = jwt.sign(userToken, process.env.SECRET_KEY);
                return res.json({success: true, token: 'JWT ' + token});
            } else {
                res.status(401).send({success: false, message: 'Authentication failed.'});
            }
        });
    });
});

app.use('/', router);
app.listen(process.env.PORT || 8080);

module.exports = app; // for testing

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
//
// require('dotenv').config();

var User = require('./Schemas/Users');
var Movie = require('./Schemas/Movies');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(passport.initialize());

var router = express.Router();

router.route('/movies')
    .get(authJwtController.isAuthenticated, function (req, res) {
        //output the request to server console
        console.log("\n=====GET REQUEST=====");
        console.log(req.body);

        Movie.find(function (err, movie) {
            if (err) {
                res.status(500).send(err);
            } else {
                res.status(200).json(movie);
            }
        })
    })
    .post(authJwtController.isAuthenticated, function (req, res) {

        //output the request to server console
        console.log("\n=====POST REQUEST=====");
        console.log(req.body);

        if (!req.body.title || !req.body.yearReleased || !req.body.genre || !req.body.actors) {
            res.status(400).json({
                success: false,
                message: 'Please pass complete movie details, including title, yearReleased, genre, and at least one actor (including name and character).'
            });
        } else {
            var movie = new Movie();
            movie.title = req.body.title;
            movie.yearReleased = req.body.yearReleased;
            movie.genre = req.body.genre;
            movie.actors = req.body.actors;
            // save the movie
            movie.save(function (err) {
                if (err) {
                    // duplicate entry
                    if (err.code === 11000)
                        return res.status(400).json({success: false, message: 'A movie with that title already exists.'});
                    else
                        return res.status(500).send(err);
                }

                res.status(200).json({success: true, message: 'Movie created!'});
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

            Movie.findByIdAndDelete(req.body._id, (err, movie) => {
                if(!movie) {
                    return res.status(400).json({success: false, message: 'Failed to delete movie with provided id: No such movie found'})
                }

                if (err)
                    return res.status(500).send(err);
                return res.status(200).json({success: true, message: 'Movie deleted.'});
            })
    });

router.route('/movies/:id')
    .get(authJwtController.isAuthenticated, function (req, res) {
        //output the request to server console
        console.log("\n=====GET REQUEST WITH ID=====");
        console.log(req.body);

        var id = req.params.id;
        Movie.findById(id, function (err, movie) {
            if(!movie)
                return res.status(400).json({ success: false, message: 'Failed to find movie with provided id: No such movie found'});

            if (err)
                res.status(500).send(err);

            var movieJSON = JSON.stringify(movie);
            // return that movie
            res.status(200).json(movie);
        });
    });

router.route('/users/:userId')
    .get(authJwtController.isAuthenticated, function (req, res) {
        //output the request to server console
        console.log("\n=====GET USER WITH ID=====");
        console.log(req.body);

        var id = req.params.userId;
        User.findById(id, function (err, user) {
            if (err) res.send(err);

            var userJson = JSON.stringify(user);
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

    if (!req.body.username || !req.body.password) {
        res.status(400).json({success: false, message: 'Please pass username and password.'});
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;
        // save the user
        user.save(function (err) {
            if (err) {
                // duplicate entry
                if (err.code == 11000)
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

    var userNew = new User();
    userNew.name = req.body.name;
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({username: userNew.username}).select('name username password').exec(function (err, user) {
        if (err)
            res.status(500).send(err);

        user.comparePassword(userNew.password, function (isMatch) {
            if (isMatch) {
                var userToken = {id: user._id, username: user.username};
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json({success: true, token: 'JWT ' + token});
            } else {
                res.status(401).send({success: false, message: 'Authentication failed.'});
            }
        });


    });
});

app.use('/', router);
app.listen(process.env.PORT || 8080);

module.exports = app; // for testing
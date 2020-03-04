var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
db = require('./db')(); //global hack
var jwt = require('jsonwebtoken');
var cors = require('cors');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

//below function duplicated for get..., post..., put..., delete... because we'll eventually need to do more than just create JSON object and return
function getJSONObject(req) {
    var json = {
        headers : "No Headers",
        key: process.env.UNIQUE_KEY,
        body : "No Body",
    };

    //Set json body
    if (req.body != null) {
        json.body = req.body;
    }

    //set json headers
    if (req.headers != null) {
        json.headers = { status: 200, message: "GET movies", headers: req.headers, query: req.body.q, env: process.env.UNIQUE_KEY };
    }

    return json;
}

//below function duplicated for get..., post..., put..., delete... because we'll eventually need to do more than just create JSON object and return
function postJSONObject(req) {
    var json = {
        headers : "No Headers",
        key: process.env.UNIQUE_KEY,
        body : "No Body",
    };

    //Set json body
    if (req.body != null) {
        json.body = req.body;
    }

    //set json headers
    if (req.headers != null) {
        json.headers = { status: 200, message: "movie saved", headers: req.headers, query: req.body.q, env: process.env.UNIQUE_KEY };
    }

    return json;
}

//below function duplicated for get..., post..., put..., delete... because we'll eventually need to do more than just create JSON object and return
function putJSONObject(req) {
    var json = {
        headers : "No Headers",
        key: process.env.UNIQUE_KEY,
        body : "No Body",
    };

    //Set json body
    if (req.body != null) {
        json.body = req.body;
    }

    //set json headers
    if (req.headers != null) {
        json.headers = { status: 200, message: "movie updated", headers: req.headers, query: req.body.q, env: process.env.UNIQUE_KEY };
    }

    return json;
}

//below function duplicated for get..., post..., put..., delete... because we'll eventually need to do more than just create JSON object and return
function deleteJSONObject(req) {
    var json = {
        headers : "No Headers",
        status: status,
        message: message,
        key: process.env.UNIQUE_KEY,
        body : "No Body",
    };

    //Set json body
    if (req.body != null) {
        json.body = req.body;
    }

    //set json headers
    if (req.headers != null) {
        json.headers = { status: 200, message: "movie deleted", headers: req.headers, query: req.body.q, env: process.env.UNIQUE_KEY };
    }

    return json;
}

router.route('/movies')
    .get( function (req, res) { //no auth needed for this - based on requirements...
        //output the request to server console
        console.log(req.body);

        //At the moment, status is always 200 if we get into this object. Later, we'll need to add validation.
        res = res.status(200);

        //message for a get is "GET movies"
        res.setHeader("Message", "GET movies");

        //if the request has a content-type, output it and set response content-type to the same
        if (req.get('Content-Type')) {
            console.log("Content-Type: " + req.get('Content-Type'));
            res = res.type(req.get('Content-Type'));
        }

        //get the requested item and return it
        res.json(getJSONObject(req));
    })
    .post(function (req, res) { //no auth needed for this - based on requirements...
        //output the request to server console
        console.log(req.body);

        //At the moment, status is always 200 if we get into this object. Later, we'll need to add validation.
        res = res.status(200);

        if (req.get('Content-Type')) {
            console.log("Content-Type: " + req.get('Content-Type'));
            res = res.type(req.get('Content-Type'));
        }

        //message for post is "movie saved"
        res.setHeader("Message", "movie saved");

        //post the json object in the request
        res.json(postJSONObject(req));
    })
    .put(authJwtController.isAuthenticated, function (req, res) {
        //output the request to server console
        console.log(req.body);

        //At the moment, status is always 200 if we get into this object. Later, we'll need to add validation.
        res = res.status(200);

        if (req.get('Content-Type')) {
            console.log("Content-Type: " + req.get('Content-Type'));
            res = res.type(req.get('Content-Type'));
        }

        //message for post is "movie updated"
        res.setHeader("Message", "movie updated");

        //update the json object in the request
        res.json(putJSONObject(req));
    })
    .delete(authController.isAuthenticated, function (req, res) {

        //output the request to server console
        console.log(req.body);

        //At the moment, status is always 200 if we get into this object. Later, we'll need to add validation.
        res = res.status(200);

        if (req.get('Content-Type')) {
            console.log("Content-Type: " + req.get('Content-Type'));
            res = res.type(req.get('Content-Type'));
        }

        //message for post is "movie deleted"
        res.setHeader("Message", "movie deleted");

        //update the json object in the request
        res.json(deleteJSONObject(req));
    });

router.route('/post')
    .post(authController.isAuthenticated, function (req, res) {
            console.log(req.body);
            res = res.status(200);
            if (req.get('Content-Type')) {
                console.log("Content-Type: " + req.get('Content-Type'));
                res = res.type(req.get('Content-Type'));
            }
            var o = getJSONObject(req);
            res.json(o);
        }
    );

router.route('/postjwt')
    .post(authJwtController.isAuthenticated, function (req, res) {
            console.log(req.body);
            res = res.status(200);
            if (req.get('Content-Type')) {
                console.log("Content-Type: " + req.get('Content-Type'));
                res = res.type(req.get('Content-Type'));
            }
            res.send(req.body);
        }
    );

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please pass username and password.'});
    } else {
        var newUser = {
            username: req.body.username,
            password: req.body.password
        };
        // save the user
        db.save(newUser); //no duplicate checking
        res.json({success: true, msg: 'Successful created new user.'});
    }
});

router.post('/signin', function(req, res) {

        var user = db.findOne(req.body.username);

        if (!user) {
            res.status(401).send({success: false, msg: 'Authentication failed. User not found.'});
        }
        else {
            // check if password matches
            if (req.body.password == user.password)  {
                var userToken = { id : user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed. Wrong password.'});
            }
        };
});

app.use('/', router);
app.listen(process.env.PORT || 8080);

module.exports = app; // for testing
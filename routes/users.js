// user related things
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
const serviceAccount = require('../config/google_key.json');
const { BigQuery } = require('@google-cloud/bigquery');
const { projectID, player_table_name } = require("../config/keys");

// User model
const User = require('../models/User')
const { loggedIn } = require("../config/auth");

// Gets
// login page
router.get('/login', loggedIn, (req, res) => res.render("login"));
// register page
router.get('/register', loggedIn, (req, res) => res.render("register"));

// Posts
// Register
router.post('/register', async function(req, res) {
    const { name, email, password, password2 } = req.body;
    let errors = [];
    // Check fields
    if(!name || !email || !password || !password2) {
        errors.push({msg: "Please fill in all fields"});
    }
    // Check passwords match
    if(password !== password2) {
        errors.push({msg: "Passwords do not match"});
    }
    // Check passwords match
    if(password.legnth < 6) {
        errors.push({msg: "Passwords should be at least 6 characters"});
    }
    if(errors.length > 0) {
        res.render("register", {
            errors,
            name,
            email
        });
    } else {
        // add user to model
        User.findOne({email: email})
            .then(user => {
                if(user){
                    // User exists, re-register
                    errors.push({msg: "User already exists"});
                    res.render("register", {
                        errors,
                        name,
                        email
                    });
                } else {
                    const newUser = new User({
                        name,
                        email,
                        password
                    });

                    // Hash password
                    bcrypt.genSalt(10, (err, salt) =>
                        bcrypt.hash(newUser.password, salt, async function(err,hash) {
                            if(err) throw err;
                            // Change password to hashed password
                            newUser.password = hash;
                            // Save the user
                            // Create data in BigQuery
                            const bigquery = new BigQuery({
                                projectId: projectID,
                                credentials: serviceAccount
                            });
                            const insert_player = `INSERT INTO ${player_table_name} (name, email, win, lose)
                            VALUES ('${name}', '${email}', 0, 0);` 
                            await bigquery.createQueryJob(insert_player);
                            console.log("Inserted new player_row into BigQuery");
                            // Save to mongoose
                            newUser.save()
                                .then(user => {
                                    req.flash("success_msg", "You are now registered!");
                                    res.redirect('/users/login')
                                }).catch(err => console.log(err));
                    }));
                }
            });
    }
});

// Login
router.post('/login', (req, res, next) => {
    passport.authenticate("local", {
        successRedirect: '/dashboard',
        failureRedirect: '/users/login',
        failureFlash: true
    })(req, res, next);
});

// Logout 
router.get("/logout", (req, res) => {
    req.logout();
    req.flash('success_msg', "You are logged out!");
    res.redirect("/users/login");
});
module.exports = router;
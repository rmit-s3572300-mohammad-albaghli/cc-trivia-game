const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const mongoose = require('mongoose');
const app = express();
const flash = require("connect-flash");
const session = require("express-session");
const passport = require("passport");

// DB Config
const db = require("./config/keys").MongoURI;

// Passport Config
require("./config/passport")(passport);

// Connect to MongoDB (cloud)
mongoose.connect(db, {useUnifiedTopology: true, useNewUrlParser: true}).then(() => console.log("MongoDB Connected")).catch(err=>console.log(err));

// EJS
app.use(expressLayouts);
app.set("view engine", "ejs");

// Parser
app.use(express.urlencoded({ extended: false }));

// Session middleware
app.use(session({
    secret: "secret",
    resave: true,
    saveUninitialized: true
}))

// Passprt middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use((req, res, next) => {
    res.locals.success_msg = req.flash("success_msg");
    res.locals.error_msg = req.flash("error_msg");
    res.locals.error = req.flash("error");
    next();
});

// Routes
app.use("/", require("./routes/index"));
app.use("/users", require("./routes/users"));
app.use("/game", require("./routes/game"));

const PORT = process.env.PORT || 3000;

app.listen(PORT, console.log(`Server started on port ${PORT}`));
module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if(req.isAuthenticated()) {
            return next();
        }
        req.flash("error_msg", "Log in to view this page");
        res.redirect("/users/login");
    },
    loggedIn: function(req, res, next) {
        if(req.isAuthenticated()) {
            res.redirect("/dashboard");           
        } else {
            return next();
        }
    }
}

"use strict";

// Middleware check user authentication and get user info
const checkUser = async (req, res, next) => {
    // Skip auth check if req is /set_name
    if (req.path === '/set_name') {
        return next();
    }

    // Check if user is authenticated using OIDC
    if (req.oidc.isAuthenticated()) {
        const { email, sub } = req.oidc.user; // User mail and auth0 ID

        try {
            const [results] = await req.db.query('SELECT * FROM users WHERE mail = ?', [email]);

            // User exists in db => session properties set for user details
            if (results.length > 0) {
                req.session.userId = results[0].id;
                req.session.userRole = results[0].role;
                req.session.userName = results[0].name;
                req.session.auth0Id = results[0].auth0_id;
                next();
            } else {
                // If user not in db => reroute to set_name
                req.session.userEmail = email;
                req.session.auth0Id = sub;
                return res.redirect('/set_name');
            }
        } catch (error) {
            console.error('Error checking user:', error);
            next(error);
        }
    } else {
        next();
    }
};

module.exports = checkUser;

"use strict";

const express = require('express');
const { requiresAuth } = require('express-openid-connect');
const auth0 = require('../config/auth0');
const router = express.Router();

// Route for setting the users name
router.get('/set_name', requiresAuth(), (req, res) => {
    // Reroutes to root if user email is not stored in session
    if (!req.session.userEmail) {
        return res.redirect('/');
    }
    res.render('set_name');
});

// Name submission and user role setup
router.post('/set_name', requiresAuth(), async (req, res) => {
    const { name } = req.body;
    const email = req.session.userEmail;
    const auth0Id = req.oidc.user.sub;

    // If required field is missing -> reroute to set_name
    if (!email || !name) {
        return res.redirect('/set-name');
    }

    // Inserts the new user into the database
    const [result] = await req.db.query('INSERT INTO users (mail, name, role, auth0_id) VALUES (?, ?, ?, ?)', [
        email, name, 'user', auth0Id
    ]);

    // Sets session data for new user
    req.session.userId = result.insertId;
    req.session.userRole = 'user';
    req.session.userName = name;

    // Checks if any users are superadmin, if not assigns the first user to superadmin
    const [superadminCheck] = await req.db.query('SELECT COUNT(*) AS superadmin_count FROM users WHERE role = "superadmin"');
    if (superadminCheck[0].superadmin_count === 0) {
        await req.db.query('UPDATE users SET role = "superadmin" WHERE id = ?', [result.insertId]);
        req.session.userRole = 'superadmin';
    }

    res.redirect('/ticket');
});

module.exports = router;

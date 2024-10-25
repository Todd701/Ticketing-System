"use strict";

const express = require('express');
const router = express.Router();
const { requiresAuth } = require('express-openid-connect');

// Route for root
router.get('/', (req, res) => {
    // Routes to login page if not authenticated
    if (!req.oidc.isAuthenticated()) {
        return res.oidc.login({
            authorizationParams: {
                redirect_uri: process.env.AUTH0_CALLBACK_URL || 'http://localhost:1337/callback'
            }
        });
    } else {
        // Routes to /ticket if authenticated
        res.redirect('/ticket');
    }
});
// Route for logout
router.get('/logout', (req, res) => {
    // Destroys session
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        req.oidc.logout({ returnTo: 'http://localhost:1337/callback' });
    });
});

module.exports = router;

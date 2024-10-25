"use strict";

const express = require('express');
const { requiresAuth } = require('express-openid-connect');
const axios= require('axios');
const { getAuth0Token } = require('../func/auth0token.js');
const router = express.Router();

// Middleware checking if user is admin
const isAdmin = (req, res, next) => {
    if (['admin', 'superadmin'].includes(req.session.userRole)) {
        next();
    } else {
        // Renders the 'denid' page
        res.status(403).render('denied');
    }
};

// Admin dashboard with categories and users data
router.get('/dashboard', requiresAuth(), isAdmin, async (req, res) => {
    const [categories] = await req.db.query('SELECT * FROM categories');
    const [users] = await req.db.query('SELECT * FROM users');
    res.render('admin_dashboard', { categories, users });
});

// Create new categoire
router.post('/categories/create', requiresAuth(), isAdmin, async (req, res) => {
    const { name } = req.body;

    try {
        // Using stored procedure
        const [result] = await req.db.query('CALL sp_create_category(?)', [name]);

        const message = result[0][0].message;

        console.log(message);

        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(500).send('Error creating category.');
    }
});

// Promotes user to admin
router.post('/users/:id/make-admin', requiresAuth(), isAdmin, async (req, res) => {
    const userId = req.params.id;
    try {
        await req.db.query('UPDATE users SET role = "admin" WHERE id = ?', [userId]);
        res.redirect('/admin/dashboard');
    } catch (err) {
        console.error('Error promoting user to admin:', err);
        res.status(500).send('Error promoting user to admin.');
    }
});

module.exports = router;

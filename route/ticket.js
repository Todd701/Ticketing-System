"use strict";

const express = require('express');
const { requiresAuth } = require('express-openid-connect');
const multer = require('multer');
const { sendMail } = require('../middleware/mailing.js');
const path = require('path');
const router = express.Router();

// Configure storage settings for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${fileExtension}`);
    }
});

// Set file upload middleware with constraints
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        // Allowed types,
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only .jpeg, .jpg, .png, and .pdf files are allowed.'));
        }
    }
});

// Middleware handling multiple file uploads and size errors
const uploadMiddleware = (req, res, next) => {
    upload.array('attachments', 3)(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                req.fileSizeError = 'One or more files exceed the size limit of 5MB.';
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                req.fileSizeError = 'Too many files uploaded. Maximum 3 files allowed.';
            }
        } else if (err) {
            req.fileSizeError = err.message;
        }
        next();
    });
};

// Main route for tickets page
router.get('/', requiresAuth(), async (req, res) => {
    const { filter, categoryFilter, search } = req.query;
    const userId = req.session.userId;
    const userRole = req.session.userRole;

    try {
        const [userResults] = await req.db.query('SELECT name, mail FROM users WHERE id = ?', [userId]);
        const user = userResults[0];

        const [ticketsResults] = await req.db.query('CALL sp_get_user_tickets(?, ?, ?, ?, ?, ?, ?)', [
            userId,
            userRole,
            filter || null,
            categoryFilter || null,
            search || null,
            null,
            null
        ]);

        const tickets = ticketsResults[0];

        if (req.xhr) {
            return res.json({ tickets });
        }

        const [categories] = await req.db.query('SELECT * FROM categories');
        res.render('tickets', {
            tickets,
            categories,
            user,
            userRole,
        });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).send('Error fetching tickets.');
    }
});

// Route for rendering ticket creation page with category data
router.get('/create', requiresAuth(), async (req, res) => {
    try {
        const [categories] = await req.db.query('SELECT * FROM categories');
        res.render('create_ticket', { categories });
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).send('Error fetching categories.');
    }
});

// Route to handle new ticket creation with file uploads
router.post('/create', requiresAuth(), uploadMiddleware, async (req, res) => {
    const { title, description, category } = req.body;
    const userId = req.session.userId;

    // Check for file upload errors
    if (req.fileSizeError) {
        const [categories] = await req.db.query('SELECT * FROM categories');
        return res.status(400).json({ 
            success: false,
            message: req.fileSizeError,
            categories
        });
    }

    try {
        // Using stored procedure to create ticket with provided details
        const [result] = await req.db.query('CALL sp_create_ticket(?, ?, ?, ?, ?)', [
            title, description, category, 'open', userId
        ]);

        const ticketId = result[0][0].ticket_id;

        // Handle the file uploads by storing them in attachments table
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await req.db.query('INSERT INTO attachments (ticket_id, file_name, file_path) VALUES (?, ?, ?)', [
                    ticketId, file.originalname, file.filename
                ]);
            }
        }

        res.status(200).json({ success: true, message: 'Ticket created successfully' });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).send('Error creating ticket.');
    }
});

// Get ticket details from a specific ticket
router.get('/:id', requiresAuth(), async (req, res) => {
    const ticketId = req.params.id;
    const auth0Id = req.oidc.user.sub;
    const userRole = req.session.userRole;
    
    try {
        // User based on auth0 ID
        const [userResults] = await req.db.query('SELECT id FROM users WHERE auth0_id = ?', [auth0Id]);
        const user = userResults[0];
        const userId = user.id;

        // Get ticket details and check if the user has access to the ticket
        const [ticketResults] = await req.db.query
            (`SELECT t.*, 
                u.name AS agent, u.mail AS agent_mail, 
                c.name AS creator, c.mail AS creator_mail, 
                t.last_update_type
            FROM tickets t
            LEFT JOIN users u ON t.agent_id = u.id
            JOIN users c ON t.user_id = c.id
            WHERE t.id = ? 
                AND (t.user_id = ? OR ? IN ('admin', 'superadmin'))`
            , [ticketId, userId, userRole]);

        const ticket = ticketResults[0];

        // Set the updated flag for users to false -> the ticket will not be marked as updated
        if (userRole === 'user' && ticket.user_id === userId && ticket.updated) {
            await req.db.query('UPDATE tickets SET updated = FALSE WHERE id = ?', [ticketId]);
        }

        // Get additional information for the ticket page
        const [categories] = await req.db.query('SELECT * FROM categories');
        const [attachments] = await req.db.query('SELECT * FROM attachments WHERE ticket_id = ?', [ticketId]);
        const [comments] = await req.db.query(`
            SELECT c.*, u.name AS commenter 
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.ticket_id = ? ORDER BY c.created_at DESC`, 
            [ticketId]
        );

        // Ticket details page with all relevant info
        res.render('ticket_details', { 
            ticket, 
            attachments, 
            comments, 
            categories, 
            user,
            userRole 
        });
    } catch (error) {
        console.error('Error fetching ticket details:', error);
        res.status(403).render('denied');
    }
});

// Admin can claim ticket
router.post('/:id/claim', requiresAuth(), async (req, res) => {
    const ticketId = req.params.id;
    const userId = req.session.userId;
    const userRole = req.session.userRole;

    // Only admin/superadmin can claim tickets
    if (!['admin', 'superadmin'].includes(userRole)) {
        return res.status(403).send('Permission denied');
    }

    // Set tickets agent to the current admin/superadmin userID
    await req.db.query('UPDATE tickets SET agent_id = ? WHERE id = ?', [userId, ticketId]);
    res.redirect(`/ticket/${ticketId}`);

});

// Posting comments
router.post('/:id/comment', requiresAuth(), async (req, res, next) => {
    const ticketId = req.params.id;
    const userId = req.session.userId;
    const { comment } = req.body;
    const userRole = req.session.userRole;

    try {
        // Insert the new comment into comments table
        await req.db.query('INSERT INTO comments (ticket_id, user_id, comment) VALUES (?, ?, ?)', [ticketId, userId, comment]);

        // Ticket update timestamp and type
        await req.db.query('UPDATE tickets SET updated_at = CURRENT_TIMESTAMP, last_update_type = ? WHERE id = ?', ['New Comment', ticketId]);

        // Check if admin is the one updating and mark as updated
        if (['admin', 'superadmin'].includes(userRole)) {
            await req.db.query('UPDATE tickets SET updated = TRUE WHERE id = ?', [ticketId]);
        }

        // Get user info to send notification and send the mail
        const [[ticket]] = await req.db.query('SELECT user_id, title FROM tickets WHERE id = ?', [ticketId]);
        const [[user]] = await req.db.query('SELECT mail FROM users WHERE id = ?', [ticket.user_id]);
        const recipient = user.mail;
        const subject ='New comment on your Ticket';
        const message = `A new comment has been added to your Ticket "${ticket.title}":\n\n"${comment}"`;

        sendMail(recipient, subject, message);

        res.redirect(`/ticket/${ticketId}`);

    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).send('Error adding comment.');
    }
});

// Update status
router.post('/:id/update-status', requiresAuth(), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = req.session.userRole;

    try {
        // Update ticket status and mark it as updated
        await req.db.query('UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP, last_update_type = ? WHERE id = ?', [status, 'Status Updated', id]);

        // Check if admin is the one updating and mark as updated
        if (['admin', 'superadmin'].includes(userRole)) {
            await req.db.query('UPDATE tickets SET updated = TRUE WHERE id = ?', [id]);
        }

        // Get user info to send notification and send the mail
        const [[ticket]] = await req.db.query('SELECT user_id, title FROM tickets WHERE id = ?', [id]);
        const [[user]] = await req.db.query('SELECT mail FROM users WHERE id = ?', [ticket.user_id]);
        const recipient = user.mail;
        const subject = `Status change for your Ticket`;
        const message = `The status of your ticket "${ticket.title}" has been changed.`;

        sendMail(recipient, subject, message);
        res.redirect(`/ticket/${id}`);

    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).send('Error updating status.');
    }
});

// Update category
router.post('/:id/update-category', requiresAuth(), async (req, res) => {
    const { id } = req.params;
    const { category } = req.body;

    try {
        // Update the category of the ticket
        await req.db.query('UPDATE tickets SET category = ?, updated_at = CURRENT_TIMESTAMP, last_update_type = ? WHERE id = ?', 
            [category, 'Category Updated', id]);

        res.redirect(`/ticket/${id}`);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).send('Error updating category.');
    }
});

module.exports = router;

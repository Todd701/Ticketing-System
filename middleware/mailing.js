"use strict";

require('dotenv').config();
const nodemailer = require('nodemailer');
const mysql = require('mysql2/promise');

// Configure email transporter using nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.MAIL,
        pass: process.env.PASS,
    },
});

// Function to send mail
const sendMail = (recipient, subject, message) => {
    const mailOptions = {
        from: process.env.MAIL,
        to: recipient,
        subject,
        text: message,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending mail: ', error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
};

// Initialize database connection
let db;
mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
}).then(connection => {
    db = connection;
    console.log('Database connected successfully');
}).catch(err => {
    console.error('Error connecting to the database:', err);
});

// Function to check for tickets not updated for set time
const checkForUnupdatedTickets = async () => {
    try {
        // Query for tickets open and haven't been updated
        const [tickets] = await db.query(`
            SELECT t.id, t.title, t.updated_at, u.mail AS superadmin_mail
            FROM tickets t
            JOIN users u ON u.role = 'superadmin'
            WHERE t.status = 'open' 
              AND TIMESTAMPDIFF(MINUTE, t.updated_at, NOW()) >= 1
        `);

        // Send notification to superadmin for each ticket not updated
        if (tickets.length > 0) {
            tickets.forEach(ticket => {
                const subject = `Ticket "${ticket.title}" has not been updated`;
                const message = `The ticket "${ticket.title}" has not been updated for the last three days`;

                sendMail(ticket.superadmin_mail, subject, message);
                console.log(`Notification sent for ticket: ${ticket.title}`);
            });
        } else {
            console.log('No tickets need notifications.');
        }
    } catch (error) {
        console.error('Error checking tickets:', error);
    }
};

module.exports = { sendMail, checkForUnupdatedTickets };

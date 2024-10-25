"use strict";

// .env file
require('dotenv').config();

const express = require('express');
const { auth, requiresAuth } = require('express-openid-connect');
const path = require('path');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const session = require('express-session');

// Config files and routes
const dbConfig = require('./config/db/ticketing-system.js');
const routeIndex = require('./route/index.js');
const routeTicket = require('./route/ticket.js');
const routeSetName = require('./route/set_name.js');
const adminRoutes = require('./route/admin.js');
const middleware = require('./middleware/index.js');
const dbConnection = require('./middleware/dbconnection.js');
const authConfig = require('./config/auth0.js');
const checkUser = require('./middleware/user.js');
const { checkForUnupdatedTickets } = require('./middleware/mailing.js');


const app = express();
const port = process.env.PORT || 1337;

let db;

// Database connection setup
mysql.createConnection(dbConfig)
    .then(conn => {
        db = conn;
        console.log('Database connected successfully');
    })
    .catch(err => {
        console.error('Error connecting to the database:', err);
    });

app.set('view engine', 'ejs');

// Session handling
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,
        maxAge: 30 * 60 * 1000
    }
}));

// Middleware
app.use(auth(authConfig)); // Auth0
app.use(middleware.logIncomingToConsole);
app.use(express.static(path.join(__dirname, 'public'))); // Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Files
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(dbConnection(() => db));
app.use(checkUser);

// Routes
app.use('/', routeIndex);
app.use('/ticket', routeTicket);
app.use('/', routeSetName);
app.use('/admin', adminRoutes);

// Check tickets not updated in past 3 days
setInterval(checkForUnupdatedTickets, 3 * 24 * 60 * 60 * 1000);

// Swap to this one for one minute ONLY FOR TESTS
// setInterval(checkForUnupdatedTickets, 60 * 1000);

app.listen(port, () => {
    console.info(`Server is listening on port ${port}.`);
});

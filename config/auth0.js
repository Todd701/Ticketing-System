"use strict";

require('dotenv').config();

module.exports = {
    auth0Logout: true,
    secret: process.env.SESSION_SECRET,
    baseURL: process.env.BASE_URL,
    clientID: process.env.AUTH0_CLIENT_ID,
    issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
    authorizationParams: {
        scope: 'openid profile email'
    },
    authRequired: false,
};
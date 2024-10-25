"use strict";

function logIncomingToConsole(req, res, next) {
    console.info(`Received ${req.method} request on ${req.url}`);
    next();
}

module.exports = {
    logIncomingToConsole
};

"use strict";

function dbConnection(getDb) {
    return (req, res, next) => {
        const db = getDb();
        if (!db) {
            return res.status(500).send('Database not initialized');
        }
        req.db = db;
        next();
    };
}

module.exports = dbConnection;

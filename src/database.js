const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor(name = './db/wolt-checker.db') {
        this.db = null;
        if (name) {
            this.open(name);
        }
    }

    open(name) {
        try {
            this.db = new sqlite3.Database(name, (err) => {
                if (err) {
                    console.error('Error connecting to database:', err);
                } else {
                    console.log('Connected to SQLite database');
                    this.initializeTables();
                }
            });
        } catch (error) {
            console.error('Error opening database:', error);
        }
    }

    initializeTables() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS Notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId TEXT NOT NULL,
                slug TEXT NOT NULL,
                registered TEXT NOT NULL,
                removed TEXT DEFAULT NULL,
                removedReason TEXT DEFAULT NULL,
                active TEXT DEFAULT '1'
            )
        `;
        
        this.db.run(createTableQuery, (err) => {
            if (err) {
                console.error('Error creating table:', err);
            }
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err);
                } else {
                    console.log('Database connection closed');
                }
            });
        }
    }

    addNewNotification(userId, slug) {
        return new Promise((resolve, reject) => {
            this.getUserActiveNotifications(userId)
                .then(existingSlugs => {
                    if (!existingSlugs.includes(slug)) {
                        const nowstr = new Date().toLocaleString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        });
                        
                        const query = `INSERT INTO Notifications (userId, slug, registered) VALUES (?, ?, ?)`;
                        this.db.run(query, [userId, slug, nowstr], function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(this.lastID);
                            }
                        });
                    } else {
                        resolve(null); // Already exists
                    }
                })
                .catch(reject);
        });
    }

    removeNotification(userId, slug, reason) {
        return new Promise((resolve, reject) => {
            const nowstr = new Date().toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            const query = `UPDATE Notifications SET removed = ?, removedReason = ?, active = '0' WHERE userId = ? AND slug = ? AND active = '1'`;
            this.db.run(query, [nowstr, reason, userId, slug], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    getAllActiveNotifications() {
        return new Promise((resolve, reject) => {
            const query = `SELECT userId, slug FROM Notifications WHERE active = '1'`;
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => ({ userId: row.userId, slug: row.slug })));
                }
            });
        });
    }

    getUserActiveNotifications(userId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT slug FROM Notifications WHERE userId = ? AND active = '1'`;
            this.db.all(query, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map(row => row.slug));
                }
            });
        });
    }
}

module.exports = Database; 
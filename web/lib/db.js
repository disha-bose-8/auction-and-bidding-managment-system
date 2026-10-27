import mysql from "mysql2/promise";

const globalForDb = globalThis;

export const pool =
    globalForDb._pool ??
    mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        decimalNumbers: true, // DECIMAL columns come back as numbers, not strings
    });

if (process.env.NODE_ENV !== "production") globalForDb._pool = pool;
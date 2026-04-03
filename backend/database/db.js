const mysql = require("mysql2/promise");

const dbConfig = {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "badinotti_epps",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

// Función de conexión usando pool
async function connectToDatabase(query, params = []) {
    try {
        const [rows] = await pool.execute(query, params);
        return rows;
    } catch (error) {
        console.error("Error al ejecutar query MySQL:", error);
        throw error;
    }
}

module.exports = { connectToDatabase, pool };

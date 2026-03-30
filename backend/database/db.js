const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "badinotti_epps",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

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
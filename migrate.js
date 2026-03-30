require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function migrate() {
    const dbConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true, // Esto es muy importante para ejecutar varios comandos SQL juntos
        ssl: {
            ca: fs.readFileSync(path.join(__dirname, 'backend', 'database', 'ca.pem'))
        }
    };

    console.log("Conectando a Aiven...");
    const connection = await mysql.createConnection(dbConfig);
    
    // Leemos el archivo SQL del escritorio
    const sqlPath = 'C:\\Users\\jhon\\OneDrive\\Escritorio\\badinotti_epps.sql';
    console.log("Leyendo archivo:", sqlPath);
    let sql = fs.readFileSync(sqlPath, 'utf8');

    try {
        console.log("Deshabilitando sql_require_primary_key temporalmente para importar...");
        await connection.query("SET SESSION sql_require_primary_key = 0;");
        
        console.log("Ejecutando script SQL...");
        await connection.query(sql);
        console.log("✅ ¡Migración de tablas completada exitosamente en Aiven!");
    } catch (err) {
        console.error("❌ Error migrando la base de datos:", err.message);
    } finally {
        await connection.end();
    }
}

migrate();

require('dotenv').config({ path: '../../.env' });
const { pool } = require('../database/db');

async function run() {
    try {
        console.log("Intentando agregar columnas vida_util_meses y costo...");
        
        try {
            await pool.query("ALTER TABLE epp ADD COLUMN vida_util_meses INT DEFAULT 6;");
            console.log("✅ Columna vida_util_meses agregada.");
        } catch (e) {
            if (e.message.includes('Duplicate column name')) console.log("🔹 Columna vida_util_meses ya existía.");
            else throw e;
        }

        try {
            await pool.query("ALTER TABLE epp ADD COLUMN costo DECIMAL(10,2) DEFAULT 0.00;");
            console.log("✅ Columna costo agregada.");
        } catch (e) {
            if (e.message.includes('Duplicate column name')) console.log("🔹 Columna costo ya existía.");
            else throw e;
        }

        console.log("🎉 Migración completada.");
    } catch (error) {
        console.error("❌ Error en la migración:", error.message);
    } finally {
        process.exit(0);
    }
}

run();

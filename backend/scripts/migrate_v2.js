require('dotenv').config({ path: '../../.env' });
const { pool } = require('../database/db');

async function run() {
    try {
        console.log("Iniciando migración V2 (Devoluciones y Vida Útil en Días)...");
        
        try {
            await pool.query("ALTER TABLE epp ADD COLUMN vida_util_dias INT DEFAULT 180;");
            console.log("✅ Columna vida_util_dias agregada a epp.");
        } catch (e) {
            if (e.message.includes('Duplicate column name')) console.log("🔹 vida_util_dias ya existía.");
            else throw e;
        }

        try {
            await pool.query("ALTER TABLE entregas ADD COLUMN fecha_devolucion DATE DEFAULT NULL;");
            console.log("✅ Columna fecha_devolucion agregada a entregas.");
        } catch (e) {
            if (e.message.includes('Duplicate column name')) console.log("🔹 fecha_devolucion ya existía.");
            else throw e;
        }

        try {
            await pool.query("ALTER TABLE entregas ADD COLUMN estado_devolucion VARCHAR(20) DEFAULT NULL;");
            console.log("✅ Columna estado_devolucion agregada a entregas.");
        } catch (e) {
            if (e.message.includes('Duplicate column name')) console.log("🔹 estado_devolucion ya existía.");
            else throw e;
        }

        console.log("🎉 Migración completa.");
    } catch (error) {
        console.error("❌ Error en la migración:", error.message);
    } finally {
        process.exit(0);
    }
}

run();

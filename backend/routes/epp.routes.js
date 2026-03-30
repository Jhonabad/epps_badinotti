const express = require("express");
const router = express.Router();
const { connectToDatabase } = require("../database/db");

// 🔹 GET - listar epp
router.get("/", async (req, res) => {
    try {
        const rows = await connectToDatabase("SELECT id_epp, nombre_epp, tipo, stock FROM epp");
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener epp:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// 🔹 POST - crear epp
router.post("/", async (req, res) => {
    try {
        const { nombre_epp, tipo, stock } = req.body;
        
        if (!nombre_epp || !tipo || stock === undefined) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        const result = await connectToDatabase(
            "INSERT INTO epp (nombre_epp, tipo, stock) VALUES (?, ?, ?)",
            [nombre_epp, tipo, parseInt(stock)]
        );

        res.json({
            id_epp: result.insertId,
            nombre_epp,
            tipo,
            stock: parseInt(stock)
        });
    } catch (error) {
        console.error("Error al crear epp:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// 🔹 PUT - actualizar epp
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nombre_epp, tipo, stock } = req.body;

        if (!nombre_epp || !tipo || stock === undefined) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        const result = await connectToDatabase(
            "UPDATE epp SET nombre_epp = ?, tipo = ?, stock = ? WHERE id_epp = ?",
            [nombre_epp, tipo, parseInt(stock), id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "EPP no encontrado" });
        }
        res.json({ success: true, message: "EPP actualizado" });
    } catch (error) {
        console.error("Error al actualizar EPP:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// 🔹 DELETE - eliminar epp
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        // El EPP puede estar asignado a areas, por lo que eliminamos referencias
        await connectToDatabase("DELETE FROM area_epp WHERE id_epp = ?", [id]);
        
        const result = await connectToDatabase("DELETE FROM epp WHERE id_epp = ?", [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "EPP no encontrado" });
        }
        res.json({ success: true, message: "EPP eliminado" });
    } catch (error) {
        console.error("Error al eliminar EPP:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

module.exports = router;

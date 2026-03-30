const express = require("express");
const router = express.Router();
const { connectToDatabase } = require("../database/db");

// 🔹 GET - listar entregas con detalles
router.get("/", async (req, res) => {
    try {
        const rows = await connectToDatabase("SELECT id_entrega, id_colaborador, id_epp, cantidad, fecha FROM entregas");
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener entregas:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// 🔹 POST - crear entrega
router.post("/", async (req, res) => {
    try {
        const { id_colaborador, id_epp, cantidad, fecha } = req.body;
        const qty = parseInt(cantidad);

        if (!id_colaborador || !id_epp || isNaN(qty) || !fecha) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        // 1. Intentar disminuir el stock atómicamente
        const updateResult = await connectToDatabase(
            "UPDATE epp SET stock = stock - ? WHERE id_epp = ? AND stock >= ?",
            [qty, id_epp, qty]
        );

        // Si affectedRows es 0, o el EPP no existe o el stock es insuficiente
        if (updateResult.affectedRows === 0) {
            return res.status(400).json({ error: "Stock insuficiente o EPP no encontrado" });
        }

        // 2. Registrar la entrega
        const result = await connectToDatabase(
            "INSERT INTO entregas (id_colaborador, id_epp, cantidad, fecha) VALUES (?, ?, ?, ?)",
            [id_colaborador, id_epp, qty, fecha]
        );

        res.json({
            id_entrega: result.insertId,
            id_colaborador: parseInt(id_colaborador),
            id_epp: parseInt(id_epp),
            cantidad: qty,
            fecha
        });
    } catch (error) {
        console.error("Error al registrar entrega:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// 🔹 PUT - actualizar entrega (sin afectar stock según regla de negocio)
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { id_colaborador, id_epp, cantidad, fecha } = req.body;
        const qty = parseInt(cantidad);

        if (!id_colaborador || !id_epp || isNaN(qty) || !fecha) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        const result = await connectToDatabase(
            "UPDATE entregas SET id_colaborador = ?, id_epp = ?, cantidad = ?, fecha = ? WHERE id_entrega = ?",
            [id_colaborador, id_epp, qty, fecha, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Entrega no encontrada" });
        }

        res.json({ success: true, message: "Entrega actualizada correctamente" });
    } catch (error) {
        console.error("Error al actualizar entrega:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// 🔹 DELETE - eliminar entrega (sin afectar stock)
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await connectToDatabase("DELETE FROM entregas WHERE id_entrega = ?", [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Entrega no encontrada" });
        }
        
        res.json({ success: true, message: "Entrega eliminada" });
    } catch (error) {
        console.error("Error al eliminar entrega:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

module.exports = router;

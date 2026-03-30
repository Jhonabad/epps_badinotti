const express = require("express");
const router = express.Router();
const { connectToDatabase } = require("../database/db");

// 🔹 GET - listar empleados (colaboradores)
router.get("/", async (req, res) => {
    try {
        const rows = await connectToDatabase("SELECT id_colaborador, nombre_colaborador, area, cargo FROM colaboradores");
        res.json(rows);
    } catch (error) {
        console.error("Error al obtener colaboradores:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// 🔹 POST - crear empleado (colaborador)
router.post("/", async (req, res) => {
    try {
        const { nombre_colaborador, area, cargo } = req.body;

        if (!nombre_colaborador || !area || !cargo) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        const result = await connectToDatabase(
            "INSERT INTO colaboradores (nombre_colaborador, area, cargo) VALUES (?, ?, ?)",
            [nombre_colaborador, area, cargo]
        );

        res.json({
            id_colaborador: result.insertId,
            nombre_colaborador,
            area,
            cargo
        });
    } catch (error) {
        console.error("Error al crear colaborador:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// 🔹 PUT - actualizar empleado (colaborador)
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nombre_colaborador, area, cargo } = req.body;

        if (!nombre_colaborador || !area || !cargo) {
            return res.status(400).json({ error: "Faltan datos obligatorios" });
        }

        const result = await connectToDatabase(
            "UPDATE colaboradores SET nombre_colaborador = ?, area = ?, cargo = ? WHERE id_colaborador = ?",
            [nombre_colaborador, area, cargo, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Colaborador no encontrado" });
        }
        res.json({ success: true, message: "Colaborador actualizado" });
    } catch (error) {
        console.error("Error al actualizar colaborador:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// 🔹 DELETE - eliminar colaborador
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await connectToDatabase("DELETE FROM colaboradores WHERE id_colaborador = ?", [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Colaborador no encontrado" });
        }
        res.json({ success: true, message: "Colaborador eliminado" });
    } catch (error) {
        console.error("Error al eliminar colaborador:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

module.exports = router;
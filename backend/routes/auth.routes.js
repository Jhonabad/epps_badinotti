const express = require("express");
const router = express.Router();
const { connectToDatabase } = require("../database/db");

router.post("/login", async (req, res) => {
    try {
        const { nombre_usuario, password } = req.body;
        
        const rows = await connectToDatabase(
            "SELECT id_usuario, nombre_usuario, role FROM usuarios WHERE nombre_usuario = ? AND password = ?",
            [nombre_usuario, password]
        );

        if (rows.length > 0) {
            const user = rows[0];
            res.json({ success: true, user: { id_usuario: user.id_usuario, nombre_usuario: user.nombre_usuario, role: user.role } });
        } else {
            res.status(401).json({ success: false, message: "Credenciales inválidas" });
        }
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ success: false, error: "Error en el servidor" });
    }
});

module.exports = router;

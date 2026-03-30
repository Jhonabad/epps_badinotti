const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { pool } = require("./database/db");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

app.get("/connection", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT 1");
        res.json({ success: true, message: "Conexión correcta" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Conexión incorrecta", error: error.message });
    }
});

const empleadosRoutes = require("./routes/empleados.routes");
const eppRoutes = require("./routes/epp.routes");
const entregasRoutes = require("./routes/entregas.routes");
const authRoutes = require("./routes/auth.routes");
const areasRoutes = require("./routes/areas.routes");

app.use("/api/empleados", empleadosRoutes);
app.use("/api/epp", eppRoutes);
app.use("/api/entregas", entregasRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/areas", areasRoutes);

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});
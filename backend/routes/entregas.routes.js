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

// 🔹 GET - reporte global anual
router.get("/reporte-global/:year", async (req, res) => {
    try {
        const year = parseInt(req.params.year);
        // Get all EPPs
        const epps = await connectToDatabase("SELECT id_epp, nombre_epp, vida_util_dias, costo FROM epp");
        
        // Get all entregas in the specified year
        const entregas = await connectToDatabase("SELECT id_epp, cantidad, fecha FROM entregas WHERE YEAR(fecha) = ?", [year]);
        
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        const matrix = {}; 
        const periodos = monthNames;

        periodos.forEach(m => matrix[m] = {});

        const totales_anuales = {};
        const costos_totales = {};
        let gasto_total_anual = 0;

        epps.forEach(e => {
            totales_anuales[e.id_epp] = 0;
            costos_totales[e.id_epp] = 0;
        });

        entregas.forEach(entrega => {
            const fecha = new Date(entrega.fecha);
            if (isNaN(fecha.getTime())) return;
            const monthName = monthNames[fecha.getMonth()];
            
            if (!matrix[monthName][entrega.id_epp]) {
                matrix[monthName][entrega.id_epp] = 0;
            }
            matrix[monthName][entrega.id_epp] += entrega.cantidad;
            
            if (totales_anuales[entrega.id_epp] !== undefined) {
                totales_anuales[entrega.id_epp] += entrega.cantidad;
            }
        });

        epps.forEach(e => {
            const costo = parseFloat(e.costo) || 0;
            const total = totales_anuales[e.id_epp] || 0;
            const costo_total = total * costo;
            costos_totales[e.id_epp] = costo_total;
            gasto_total_anual += costo_total;
        });

        res.json({
            year,
            periodos,
            epps,
            matrix,
            totales_anuales,
            costos_totales,
            gasto_total_anual
        });
    } catch (error) {
        console.error("Error al generar reporte global:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// 🔹 POST - registrar devolución de epp
router.post("/devolver/:idEntrega", async (req, res) => {
    try {
        const idEntrega = parseInt(req.params.idEntrega);
        const { estado_devolucion } = req.body;

        if (!estado_devolucion) {
            return res.status(400).json({ error: "Falta estado_devolucion" });
        }

        const entregaRows = await connectToDatabase("SELECT * FROM entregas WHERE id_entrega = ?", [idEntrega]);
        if (entregaRows.length === 0) {
            return res.status(404).json({ error: "Entrega no encontrada" });
        }
        const entrega = entregaRows[0];
        
        let fechaActual = new Date().toISOString().split("T")[0];

        await connectToDatabase(
            "UPDATE entregas SET fecha_devolucion = ?, estado_devolucion = ? WHERE id_entrega = ?",
            [fechaActual, estado_devolucion, idEntrega]
        );

        if (estado_devolucion === 'Reutilizable') {
            const eppRows = await connectToDatabase("SELECT * FROM epp WHERE id_epp = ?", [entrega.id_epp]);
            if (eppRows.length > 0) {
                const originalEpp = eppRows[0];
                const nuevoNombre = `${originalEpp.nombre_epp} (Reacondicionado)`;
                
                const reacRows = await connectToDatabase("SELECT * FROM epp WHERE nombre_epp = ?", [nuevoNombre]);
                if (reacRows.length > 0) {
                    await connectToDatabase("UPDATE epp SET stock = stock + ? WHERE id_epp = ?", [entrega.cantidad, reacRows[0].id_epp]);
                } else {
                    const mitadVida = Math.max(1, Math.floor((originalEpp.vida_util_dias || 180) / 2));
                    await connectToDatabase(
                        "INSERT INTO epp (nombre_epp, tipo, stock, vida_util_dias, costo) VALUES (?, ?, ?, ?, ?)",
                        [nuevoNombre, originalEpp.tipo, entrega.cantidad, mitadVida, 0]
                    );
                }
            }
        }

        res.json({ mensaje: "Devolución registrada" });
    } catch (error) {
        console.error("Error al registrar devolucion:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

module.exports = router;

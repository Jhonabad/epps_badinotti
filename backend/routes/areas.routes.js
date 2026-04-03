const express = require("express");
const router = express.Router();
const { connectToDatabase } = require("../database/db");

// Helper para obtener areas conformadas como espera el frontend
async function getAreasConEPPs() {
    const areas = await connectToDatabase("SELECT id_area, nombre_area FROM areas");
    const areaEpps = await connectToDatabase("SELECT id_area, id_epp FROM area_epp");

    return areas.map(area => {
        return {
            id_area: area.id_area,
            nombre_area: area.nombre_area,
            epps_asignados: areaEpps.filter(ae => ae.id_area === area.id_area).map(ae => ae.id_epp)
        };
    });
}

// Listar todas las áreas
router.get("/", async (req, res) => {
    try {
        const areasList = await getAreasConEPPs();
        res.json(areasList);
    } catch (error) {
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Crear una nueva área
router.post("/", async (req, res) => {
    try {
        const { nombre_area, epps_asignados } = req.body;

        if (!nombre_area) {
            return res.status(400).json({ error: "El nombre_area es obligatorio" });
        }

        const result = await connectToDatabase("INSERT INTO areas (nombre_area) VALUES (?)", [nombre_area]);
        const newAreaId = result.insertId;

        const eppsArray = epps_asignados || [];
        for (const eppId of eppsArray) {
            await connectToDatabase("INSERT INTO area_epp (id_area, id_epp) VALUES (?, ?)", [newAreaId, parseInt(eppId)]);
        }

        res.json({
            id_area: newAreaId,
            nombre_area,
            epps_asignados: eppsArray
        });
    } catch (error) {
        res.status(500).json({ error: "Error al crear área" });
    }
});

// Actualizar nombre de área
router.put("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nombre_area } = req.body;
        if (!nombre_area) {
            return res.status(400).json({ error: "El nombre_area es obligatorio" });
        }
        await connectToDatabase("UPDATE areas SET nombre_area = ? WHERE id_area = ?", [nombre_area, id]);
        res.json({ success: true, message: "Área actualizada" });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar área" });
    }
});

// Eliminar área
router.delete("/:id", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await connectToDatabase("DELETE FROM area_epp WHERE id_area = ?", [id]);
        const result = await connectToDatabase("DELETE FROM areas WHERE id_area = ?", [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Área no encontrada" });
        }
        res.json({ success: true, message: "Área eliminada" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar área" });
    }
});

// Actualizar o asignar EPPs a un área
router.post("/:id/epp", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { epps_asignados } = req.body;

        const areaRows = await connectToDatabase("SELECT id_area, nombre_area FROM areas WHERE id_area = ?", [id]);
        if (areaRows.length === 0) {
            return res.status(404).json({ error: "Área no encontrada" });
        }

        await connectToDatabase("DELETE FROM area_epp WHERE id_area = ?", [id]);

        const eppsArray = epps_asignados || [];
        for (const eppId of eppsArray) {
            await connectToDatabase("INSERT INTO area_epp (id_area, id_epp) VALUES (?, ?)", [id, parseInt(eppId)]);
        }

        res.json({
            id_area: areaRows[0].id_area,
            nombre_area: areaRows[0].nombre_area,
            epps_asignados: eppsArray
        });
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar EPPs del área" });
    }
});

// Obtener estadísticas GENERALES de todas las áreas
router.get("/stats/general", async (req, res) => {
    try {
        const areas = await getAreasConEPPs();
        const empleados = await connectToDatabase("SELECT id_colaborador, nombre_colaborador, area, cargo FROM colaboradores");
        const epp = await connectToDatabase("SELECT id_epp, nombre_epp, tipo, stock FROM epp");
        const entregadasDB = await connectToDatabase("SELECT id_colaborador, id_epp, cantidad FROM entregas");

        const entregas = entregadasDB.map(ent => ({
            id_colaborador: ent.id_colaborador,
            id_epp: ent.id_epp,
            cantidad: ent.cantidad
        }));

        const generalStats = [];

        areas.forEach(area => {
            const colaboradoresArea = empleados.filter(e => e.area === area.nombre_area);
            const cantColaboradores = colaboradoresArea.length;

            let totalRequeridosArea = 0;
            let totalEntregadosArea = 0;

            area.epps_asignados.forEach(eppId => {
                const equipo = epp.find(e => e.id_epp === parseInt(eppId));
                if (!equipo) return;

                totalRequeridosArea += cantColaboradores;

                entregas.forEach(entrega => {
                    if (entrega.id_epp === eppId) {
                        const esDelArea = colaboradoresArea.find(c => c.id_colaborador === entrega.id_colaborador);
                        if (esDelArea) {
                            totalEntregadosArea += entrega.cantidad;
                        }
                    }
                });
            });

            let porcentaje = 0;
            if (totalRequeridosArea > 0) {
                porcentaje = (totalEntregadosArea / totalRequeridosArea) * 100;
            }

            generalStats.push({
                nombre_area: area.nombre_area,
                porcentaje: Math.min(100, Math.round(porcentaje)),
                entregados: totalEntregadosArea,
                requeridos: totalRequeridosArea
            });
        });

        res.json({ stats: generalStats });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener stats generales" });
    }
});

// Obtener estadísticas de un COLABORADOR específico
router.get("/stats/colaborador/:colId", async (req, res) => {
    try {
        const colId = parseInt(req.params.colId);

        const empleados = await connectToDatabase("SELECT id_colaborador, nombre_colaborador, area FROM colaboradores WHERE id_colaborador = ?", [colId]);
        if (empleados.length === 0) {
            return res.status(404).json({ error: "Colaborador no encontrado" });
        }
        const colaborador = empleados[0];

        const areas = await getAreasConEPPs();
        const epp = await connectToDatabase("SELECT id_epp, nombre_epp, tipo, stock FROM epp");
        const entregadasDB = await connectToDatabase("SELECT id_colaborador, id_epp, cantidad FROM entregas WHERE id_colaborador = ?", [colId]);

        const entregas = entregadasDB.map(ent => ({
            id_colaborador: ent.id_colaborador,
            id_epp: ent.id_epp,
            cantidad: ent.cantidad
        }));

        const area = areas.find(a => a.nombre_area.toLowerCase() === colaborador.area.toLowerCase());

        if (!area) {
            return res.json({ stats: [], mensaje: "El colaborador no pertenece a un área válida o no tiene EPPs asignados." });
        }

        const stats = [];

        area.epps_asignados.forEach(eppId => {
            const equipo = epp.find(e => e.id_epp === parseInt(eppId));
            if (!equipo) return;

            let entregados = 0;
            entregas.forEach(entrega => {
                if (entrega.id_epp === eppId) {
                    entregados += entrega.cantidad;
                }
            });

            let porcentaje = entregados > 0 ? (entregados / 1) * 100 : 0;

            stats.push({
                nombre_epp: equipo.nombre_epp,
                porcentaje: Math.min(100, Math.round(porcentaje)),
                entregados,
                requeridos: 1
            });
        });

        res.json({
            nombre_colaborador: colaborador.nombre_colaborador,
            stats
        });
    } catch (error) {
        res.status(500).json({ error: "Error al calcular estadisticas del colaborador" });
    }
});

// Obtener estadísticas de entregas del área (Reporte Específico)
router.get("/:id/stats", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const areas = await getAreasConEPPs();
        const area = areas.find(a => a.id_area === id);

        if (!area) {
            return res.status(404).json({ error: "Área no encontrada" });
        }

        const empleados = await connectToDatabase("SELECT id_colaborador, nombre_colaborador, area FROM colaboradores");
        const epp = await connectToDatabase("SELECT id_epp, nombre_epp, tipo, stock FROM epp");
        const entregadasDB = await connectToDatabase("SELECT id_colaborador, id_epp, cantidad FROM entregas");

        const entregas = entregadasDB.map(ent => ({
            id_colaborador: ent.id_colaborador,
            id_epp: ent.id_epp,
            cantidad: ent.cantidad
        }));

        const colaboradoresArea = empleados.filter(e => e.area === area.nombre_area);
        const cantColaboradores = colaboradoresArea.length;

        const stats = [];

        area.epps_asignados.forEach(eppId => {
            const equipo = epp.find(e => e.id_epp === parseInt(eppId));
            if (!equipo) return;

            const cantidadRequeridaTotal = cantColaboradores;

            let cantidadEntregada = 0;
            entregas.forEach(entrega => {
                if (entrega.id_epp === eppId) {
                    const esDelArea = colaboradoresArea.find(c => c.id_colaborador === entrega.id_colaborador);
                    if (esDelArea) {
                        cantidadEntregada += entrega.cantidad;
                    }
                }
            });

            let porcentaje = 0;
            if (cantidadRequeridaTotal > 0) {
                porcentaje = (cantidadEntregada / cantidadRequeridaTotal) * 100;
            }

            stats.push({
                id_epp: eppId,
                nombre_epp: equipo.nombre_epp,
                entregados: cantidadEntregada,
                requeridos: cantidadRequeridaTotal,
                porcentaje: Math.min(100, Math.round(porcentaje))
            });
        });

        res.json({
            nombre_area: area.nombre_area,
            cantColaboradores,
            stats
        });
    } catch (error) {
        res.status(500).json({ error: "Error al calcular estadisticas del area" });
    }
});

// Obtener estadísticas mensuales de entregas (Tabla Dinámica) para un área
router.get("/:id/entregas-mensuales", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const areas = await getAreasConEPPs();
        const area = areas.find(a => a.id_area === id);

        if (!area) {
            return res.status(404).json({ error: "Área no encontrada" });
        }

        const eppDb = await connectToDatabase("SELECT id_epp, nombre_epp FROM epp");
        const eppsArea = area.epps_asignados.map(eppId => {
            const e = eppDb.find(item => item.id_epp === parseInt(eppId));
            return e ? { id_epp: eppId, nombre_epp: e.nombre_epp } : null;
        }).filter(e => e !== null);

        const empleados = await connectToDatabase("SELECT id_colaborador FROM colaboradores WHERE area = ?", [area.nombre_area]);
        const idsColaboradores = empleados.map(c => c.id_colaborador);

        if (idsColaboradores.length === 0) {
            return res.json({ epps: eppsArea, periodos: [], matrix: {} });
        }

        const placeholders = idsColaboradores.map(() => '?').join(',');
        const entregasDb = await connectToDatabase(`SELECT id_epp, cantidad, fecha FROM entregas WHERE id_colaborador IN (${placeholders})`, idsColaboradores);

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

        const matrix = {}; 
        const sortablePeriods = []; 

        entregasDb.forEach(entrega => {
            if (!area.epps_asignados.includes(entrega.id_epp)) return;

            const fecha = new Date(entrega.fecha);
            if (isNaN(fecha.getTime())) return;

            const year = fecha.getFullYear();
            const monthIndex = fecha.getMonth(); 
            const formatKey = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
            const labelKey = `${monthNames[monthIndex]} ${year}`;

            if (!matrix[labelKey]) {
                matrix[labelKey] = {};
                sortablePeriods.push({ sortKey: formatKey, label: labelKey });
            }

            if (!matrix[labelKey][entrega.id_epp]) {
                matrix[labelKey][entrega.id_epp] = 0;
            }
            matrix[labelKey][entrega.id_epp] += entrega.cantidad;
        });

        const uniqueSortable = [];
        const seen = new Set();
        sortablePeriods.forEach(p => {
            if (!seen.has(p.sortKey)) {
                seen.add(p.sortKey);
                uniqueSortable.push(p);
            }
        });
        uniqueSortable.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        const periodosOrdenados = uniqueSortable.map(p => p.label);

        res.json({
            nombre_area: area.nombre_area,
            epps: eppsArea,
            periodos: periodosOrdenados,
            matrix
        });

    } catch (error) {
        console.error("Error al generar matriz mensual:", error);
        res.status(500).json({ error: "Error al generar matriz mensual" });
    }
});

module.exports = router;

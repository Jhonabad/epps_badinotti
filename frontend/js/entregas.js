import { fetchAPI } from './api.js';

document.addEventListener("DOMContentLoaded", async () => {
    const tabla = document.querySelector("#tablaEntregas tbody");
    const form = document.querySelector("#formEntregas");
    const msg = document.querySelector("#form-msg");
    const selectArea = document.getElementById("id_area");
    const selectColaborador = document.getElementById("id_colaborador");
    const selectEpp = document.getElementById("id_epp");
    const submitBtn = form.querySelector('button[type="submit"]');

    // Mantener referencias
    let listaColaboradores = [];
    let listaEpp = [];
    let listaAreas = [];
    let entregasGlobal = [];
    let editingId = null;

    async function init() {
        try {
            [listaColaboradores, listaEpp, listaAreas] = await Promise.all([
                fetchAPI("/empleados"),
                fetchAPI("/epp"),
                fetchAPI("/areas")
            ]);

            populateSelectArea();

            // Estado inicial deshabilitado
            selectColaborador.disabled = true;
            selectEpp.disabled = true;

            await loadEntregas();
        } catch (error) {
            console.error("Error de inicialización:", error);
        }
    }

    function populateSelectArea() {
        selectArea.innerHTML = '<option value="" disabled selected>Seleccione un área...</option>';
        listaAreas.forEach(area => {
            const option = document.createElement("option");
            option.value = area.id_area;
            option.textContent = area.nombre_area;
            selectArea.appendChild(option);
        });
    }

    function populateSelectColaborador(areaName) {
        selectColaborador.innerHTML = '<option value="" disabled selected>Seleccione un colaborador...</option>';

        const colaboradoresFiltrados = listaColaboradores.filter(
            c => c.area.toLowerCase() === areaName.toLowerCase()
        );

        colaboradoresFiltrados.forEach(colaborador => {
            const option = document.createElement("option");
            option.value = colaborador.id_colaborador;
            option.textContent = colaborador.nombre_colaborador;
            selectColaborador.appendChild(option);
        });

        selectColaborador.disabled = colaboradoresFiltrados.length === 0;
        if (colaboradoresFiltrados.length === 0) {
            selectColaborador.innerHTML = '<option value="" disabled selected>No hay colaboradores en esta área</option>';
        }
    }

    function populateSelectEpp(areaObj) {
        selectEpp.innerHTML = '<option value="" disabled selected>Seleccione un equipo...</option>';

        let validEppIds = areaObj ? areaObj.epps_asignados : [];

        let eppsFiltrados = listaEpp.filter(eq => validEppIds.includes(eq.id_epp));

        eppsFiltrados.forEach(eq => {
            const option = document.createElement("option");
            option.value = eq.id_epp;
            option.textContent = `${eq.nombre_epp} - Stock: ${eq.stock}`;

            if (eq.stock <= 0) {
                option.disabled = true;
                option.textContent += ' (Agotado)';
            }
            selectEpp.appendChild(option);
        });

        selectEpp.disabled = eppsFiltrados.length === 0;
        if (eppsFiltrados.length === 0) {
            selectEpp.innerHTML = '<option value="" disabled selected>No hay EPPs asignados a esta área</option>';
        }
    }

    // Event listener para filtrar cuando cambia el Área
    selectArea.addEventListener("change", (e) => {
        const areaId = parseInt(e.target.value);
        const area = listaAreas.find(a => a.id_area === areaId);

        if (area) {
            populateSelectColaborador(area.nombre_area);
            populateSelectEpp(area);
        }
    });

    async function loadEntregas() {
        try {
            entregasGlobal = await fetchAPI("/entregas");
            renderTable(entregasGlobal);
        } catch (error) {
            console.error("Error al cargar las entregas:", error);
        }
    }

    window.editarEntrega = (id) => {
        const ent = entregasGlobal.find(e => e.id_entrega === id);
        if(!ent) return;

        editingId = id;
        
        const col = listaColaboradores.find(c => c.id_colaborador === ent.id_colaborador);
        if (col) {
            const areaObj = listaAreas.find(a => a.nombre_area.toLowerCase() === col.area.toLowerCase());
            if (areaObj) {
                selectArea.value = areaObj.id_area;
                // Force populate dropdowns
                populateSelectColaborador(areaObj.nombre_area);
                populateSelectEpp(areaObj);
            }
        }

        selectColaborador.value = ent.id_colaborador;
        selectEpp.value = ent.id_epp;
        document.getElementById("cantidad").value = ent.cantidad;
        
        if (ent.fecha && !ent.fecha.includes('T')) {
            document.getElementById("fecha").value = ent.fecha;
        } else if (ent.fecha) {
            document.getElementById("fecha").value = new Date(ent.fecha).toISOString().split('T')[0];
        }

        submitBtn.innerHTML = '<span class="material-symbols-outlined">update</span> Actualizar Entrega';
        submitBtn.style.background = '#f59e0b';
    };

    window.eliminarEntrega = async (id) => {
        if(!confirm("¿Está seguro de eliminar esta entrega? El EPP de esta entrega NO será reingresado al stock disponible.")) return;
        try {
            await fetchAPI(`/entregas/${id}`, "DELETE");
            await loadEntregas();
        } catch (error) {
            console.error("Error al eliminar", error);
            alert("No se pudo eliminar la entrega.");
        }
    };

    function renderTable(entregas) {
        tabla.innerHTML = "";
        entregas.forEach(ent => {
            const colName = listaColaboradores.find(c => c.id_colaborador === ent.id_colaborador)?.nombre_colaborador || 'Desconocido';
            const eqName = listaEpp.find(e => e.id_epp === ent.id_epp)?.nombre_epp || 'Desconocido';

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${ent.id_entrega}</td>
                <td><strong>${colName}</strong></td>
                <td>${eqName}</td>
                <td><span class="badge badge-green">${ent.cantidad}</span></td>
                <td>${ent.fecha}</td>
                <td style="text-align: right;">
                    <button class="material-symbols-outlined" onclick="editarEntrega(${ent.id_entrega})" style="background:none; border:none; color:var(--primary); cursor:pointer; margin-right: 5px;">edit</button>
                    <button class="material-symbols-outlined" onclick="eliminarEntrega(${ent.id_entrega})" style="background:none; border:none; color:var(--danger); cursor:pointer;">delete</button>
                </td>
            `;
            tabla.appendChild(tr);
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const id_colaborador = selectColaborador.value;
        const id_epp = selectEpp.value;
        const cantidad = document.getElementById("cantidad").value;
        const fecha = document.getElementById("fecha").value;

        if (!id_colaborador || !id_epp) {
            msg.textContent = "Por favor selecciona un colaborador y un EPP.";
            msg.style.color = "var(--danger)";
            msg.style.display = "block";
            return;
        }

        try {
            if (editingId) {
                await fetchAPI(`/entregas/${editingId}`, "PUT", { id_colaborador, id_epp, cantidad, fecha });
                msg.textContent = "¡Entrega actualizada exitosamente!";
                
                editingId = null;
                submitBtn.innerHTML = '<span class="material-symbols-outlined">assignment_turned_in</span> Registrar Entrega';
                submitBtn.style.background = '#8b5cf6';
            } else {
                await fetchAPI("/entregas", "POST", { id_colaborador, id_epp, cantidad, fecha });
                msg.textContent = "¡Entrega registrada exitosamente!";
            }

            form.reset();
            document.getElementById('fecha').valueAsDate = new Date();

            // Reiniciar estado
            selectColaborador.disabled = true;
            selectEpp.disabled = true;
            selectColaborador.innerHTML = '<option value="" disabled selected>Primero seleccione un área...</option>';
            selectEpp.innerHTML = '<option value="" disabled selected>Primero seleccione un área...</option>';

            msg.style.display = "block";
            msg.style.color = "var(--success)";

            setTimeout(() => { msg.style.display = "none"; }, 3000);

            await init();

        } catch (error) {
            msg.textContent = error.message || "Error al guardar la entrega.";
            msg.style.color = "var(--danger)";
            msg.style.display = "block";
        }
    });

    init();
});

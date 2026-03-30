import { fetchAPI } from './api.js';

document.addEventListener("DOMContentLoaded", async () => {
    const tabla = document.querySelector("#tablaColaboradores tbody");
    const form = document.querySelector("#formColaborador");
    const msg = document.querySelector("#form-msg");
    const selectArea = document.querySelector("#area");
    const submitBtn = form.querySelector('button[type="submit"]');

    let empleadosGlobal = [];
    let editingId = null;

    async function loadAreas() {
        try {
            const areas = await fetchAPI("/areas");
            selectArea.innerHTML = '<option value="" disabled selected>Seleccione el área</option>';
            areas.forEach(a => {
                selectArea.innerHTML += `<option value="${a.nombre_area}">${a.nombre_area}</option>`;
            });
        } catch (error) {
            console.error("No se pudieron cargar áreas", error);
            selectArea.innerHTML = '<option value="" disabled>Error al cargar áreas</option>';
        }
    }

    async function loadColaboradores() {
        try {
            empleadosGlobal = await fetchAPI("/empleados");
            renderTable(empleadosGlobal);
        } catch (error) {
            console.error("No se pudieron cargar colaboradores", error);
        }
    }

    window.editarColaborador = (id) => {
        const col = empleadosGlobal.find(c => c.id_colaborador === id);
        if(!col) return;

        editingId = id;
        document.getElementById("nombre").value = col.nombre_colaborador;
        document.getElementById("area").value = col.area;
        document.getElementById("cargo").value = col.cargo;

        submitBtn.innerHTML = '<span class="material-symbols-outlined">update</span> Actualizar Colaborador';
        submitBtn.style.background = '#f59e0b';
    };

    // Funcion global para eliminar, asignada a window si hace falta o con addeventlistener global
    window.eliminarColaborador = async (id) => {
        if (!confirm("¿Desea eliminar a este colaborador? Esta acción eliminará también sus entregas.")) return;
        try {
            await fetchAPI(`/empleados/${id}`, "DELETE");
            loadColaboradores();
        } catch (error) {
            console.error("Error al eliminar:", error);
            alert("No se pudo eliminar el colaborador.");
        }
    };

    function renderTable(colaboradores) {
        tabla.innerHTML = "";
        colaboradores.forEach(colaborador => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${colaborador.id_colaborador}</td>
                <td><strong>${colaborador.nombre_colaborador}</strong></td>
                <td><span class="badge badge-blue">${colaborador.area}</span></td>
                <td>${colaborador.cargo}</td>
                <td style="text-align: right;">
                    <button class="material-symbols-outlined" onclick="editarColaborador(${colaborador.id_colaborador})" style="background:none; border:none; color:var(--primary); cursor:pointer; margin-right: 5px;">edit</button>
                    <button class="material-symbols-outlined" onclick="eliminarColaborador(${colaborador.id_colaborador})" style="background:none; border:none; color:var(--danger); cursor:pointer;">delete</button>
                </td>
            `;
            tabla.appendChild(tr);
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const nombre_colaborador = document.getElementById("nombre").value;
        const area = document.getElementById("area").value;
        const cargo = document.getElementById("cargo").value;

        try {
            if (editingId) {
                await fetchAPI(`/empleados/${editingId}`, "PUT", { nombre_colaborador, area, cargo });
                msg.textContent = "¡Colaborador actualizado exitosamente!";
                
                editingId = null;
                submitBtn.innerHTML = '<span class="material-symbols-outlined">save</span> Guardar Colaborador';
                submitBtn.style.background = '#3b82f6';
            } else {
                await fetchAPI("/empleados", "POST", { nombre_colaborador, area, cargo });
                msg.textContent = "¡Colaborador guardado exitosamente!";
            }
            form.reset();
            msg.style.display = "block";
            
            setTimeout(() => { msg.style.display = "none"; }, 3000);
            
            loadColaboradores(); // Recargar la tabla
        } catch (error) {
            msg.textContent = "Error al procesar.";
            msg.style.color = "var(--danger)";
            msg.style.display = "block";
            console.error(error);
        }
    });

    // Carga inicial
    loadAreas();
    loadColaboradores();
});
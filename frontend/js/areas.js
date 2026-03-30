import { fetchAPI } from './api.js';

document.addEventListener("DOMContentLoaded", async () => {
    const tabla = document.querySelector("#tablaAreas tbody");
    const form = document.querySelector("#formArea");
    const msg = document.querySelector("#form-msg");
    const checkboxesContainer = document.getElementById("eppCheckboxes");
    const submitBtn = form.querySelector('button[type="submit"]');

    let listaEpp = [];
    let areasGlobal = [];
    let editingId = null;

    async function init() {
        try {
            listaEpp = await fetchAPI("/epp");
            populateCheckboxes();
            await loadAreas();
        } catch (error) {
            console.error("Error al inicializar áreas:", error);
        }
    }

    function populateCheckboxes() {
        checkboxesContainer.innerHTML = "";
        listaEpp.forEach(eq => {
            const label = document.createElement("label");
            label.innerHTML = `<input type="checkbox" value="${eq.id_epp}" class="epp-check"> ${eq.nombre_epp} (${eq.tipo})`;
            checkboxesContainer.appendChild(label);
        });
    }

    async function loadAreas() {
        try {
            areasGlobal = await fetchAPI("/areas");
            renderTable(areasGlobal);
        } catch (error) {
            console.error("Error al cargar las áreas:", error);
        }
    }

    window.editarArea = (id) => {
        const area = areasGlobal.find(a => a.id_area === id);
        if(!area) return;

        editingId = id;
        document.getElementById("nombreArea").value = area.nombre_area;

        // Limpiar checkboxes
        document.querySelectorAll('.epp-check').forEach(cb => cb.checked = false);
        // Marcar los asignados
        if(area.epps_asignados) {
            area.epps_asignados.forEach(eppId => {
                const cb = document.querySelector(`.epp-check[value="${eppId}"]`);
                if(cb) cb.checked = true;
            });
        }

        submitBtn.innerHTML = '<span class="material-symbols-outlined">update</span> Actualizar Área';
        submitBtn.style.background = '#f59e0b';
    };

    window.eliminarArea = async (id) => {
        if(!confirm("¿Está seguro de eliminar esta Área? Se eliminarán los EPPs asignados pero no los colaboradores.")) return;
        try {
            await fetchAPI(`/areas/${id}`, "DELETE");
            await loadAreas();
        } catch (error) {
            console.error("Error al eliminar área", error);
            alert("No se pudo eliminar el área");
        }
    };

    function renderTable(areas) {
        tabla.innerHTML = "";
        areas.forEach(area => {
            const tr = document.createElement("tr");
            const eppsAsignados = area.epps_asignados ? area.epps_asignados.length : 0;
            tr.innerHTML = `
                <td>${area.id_area}</td>
                <td><strong>${area.nombre_area}</strong></td>
                <td><span class="badge badge-green">${eppsAsignados}</span></td>
                <td style="text-align: right;">
                    <button class="material-symbols-outlined" onclick="editarArea(${area.id_area})" style="background:none; border:none; color:var(--primary); cursor:pointer; margin-right: 5px;">edit</button>
                    <button class="material-symbols-outlined" onclick="eliminarArea(${area.id_area})" style="background:none; border:none; color:var(--danger); cursor:pointer;">delete</button>
                </td>
            `;
            tabla.appendChild(tr);
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById("nombreArea").value.trim();
        
        // Obtener todos los checkbox seleccionados
        const checkboxes = document.querySelectorAll('.epp-check:checked');
        const epps_asignados = Array.from(checkboxes).map(cb => parseInt(cb.value));

        try {
            if (editingId) {
                await fetchAPI(`/areas/${editingId}`, "PUT", { nombre_area: nombre });
                await fetchAPI(`/areas/${editingId}/epp`, "POST", { epps_asignados });
                msg.textContent = "Área actualizada exitosamente!";
                
                editingId = null;
                submitBtn.innerHTML = '<span class="material-symbols-outlined">domain_add</span> Guardar Área';
                submitBtn.style.background = '#3b82f6';
            } else {
                await fetchAPI("/areas", "POST", { nombre_area: nombre, epps_asignados });
                msg.textContent = "Área guardada exitosamente!";
            }
            
            form.reset();
            msg.style.display = "block";
            msg.style.color = "var(--success)";
            
            setTimeout(() => { msg.style.display = "none"; }, 3000);
            
            await loadAreas();
        } catch (error) {
            msg.textContent = error.message || "Error al procesar el área.";
            msg.style.color = "var(--danger)";
            msg.style.display = "block";
        }
    });

    init();
});

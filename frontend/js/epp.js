import { fetchAPI } from './api.js';

document.addEventListener("DOMContentLoaded", async () => {
    const tabla = document.querySelector("#tablaEPP tbody");
    const form = document.querySelector("#formEPP");
    const msg = document.querySelector("#form-msg");
    const submitBtn = form.querySelector('button[type="submit"]');

    let equiposGlobal = [];
    let editingId = null;

    async function loadEPP() {
        try {
            equiposGlobal = await fetchAPI("/epp");
            renderTable(equiposGlobal);
        } catch (error) {
            console.error("Error al cargar EPP:", error);
        }
    }

    window.editarEPP = (id) => {
        const eq = equiposGlobal.find(e => e.id_epp === id);
        if(!eq) return;

        editingId = id;
        document.getElementById("nombre_epp").value = eq.nombre_epp;
        document.getElementById("tipo").value = eq.tipo;
        document.getElementById("stock").value = eq.stock;
        
        let eqDays = eq.vida_util_dias || 0;
        let t = "dias";
        if (eqDays >= 365 && eqDays % 365 === 0) {
            eqDays /= 365; t = "anios";
        } else if (eqDays >= 30 && eqDays % 30 === 0) {
            eqDays /= 30; t = "meses";
        } else if (eqDays >= 7 && eqDays % 7 === 0) {
            eqDays /= 7; t = "semanas";
        }
        document.getElementById("vida_util_num").value = eqDays || '';
        document.getElementById("vida_util_tipo").value = t;
        
        document.getElementById("costo").value = eq.costo || '';

        submitBtn.innerHTML = '<span class="material-symbols-outlined">update</span> Actualizar Equipo';
        submitBtn.style.background = '#f59e0b';
    };

    window.eliminarEPP = async (id) => {
        if(!confirm("¿Desea eliminar este equipo EPP?")) return;
        try {
            await fetchAPI(`/epp/${id}`, "DELETE");
            await loadEPP();
        } catch (error) {
            console.error("Error al eliminar EPP", error);
            alert("No se pudo eliminar el equipo EPP, puede que esté asignado a áreas o entregas.");
        }
    };

    function renderTable(equipos) {
        tabla.innerHTML = "";
        equipos.forEach(eq => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${eq.id_epp}</td>
                <td><strong>${eq.nombre_epp}</strong></td>
                <td><span class="badge badge-blue">${eq.tipo}</span></td>
                <td>
                    <span class="badge ${eq.stock > 10 ? 'badge-green' : 'badge-danger'}" style="${eq.stock <= 10 ? 'background:rgba(239, 68, 68, 0.2); color:#f87171; border:1px solid rgba(239,68,68,0.4);' : ''}">
                        ${eq.stock}
                    </span>
                </td>
                <td>${eq.vida_util_dias ? eq.vida_util_dias + ' días' : '-'}</td>
                <td>S/ ${eq.costo != null ? parseFloat(eq.costo).toFixed(2) : '0.00'}</td>
                <td style="text-align: right;">
                    <button class="material-symbols-outlined" onclick="editarEPP(${eq.id_epp})" style="background:none; border:none; color:var(--primary); cursor:pointer; margin-right: 5px;">edit</button>
                    <button class="material-symbols-outlined" onclick="eliminarEPP(${eq.id_epp})" style="background:none; border:none; color:var(--danger); cursor:pointer;">delete</button>
                </td>
            `;
            tabla.appendChild(tr);
        });
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombre_epp = document.getElementById("nombre_epp").value;
        const tipo = document.getElementById("tipo").value;
        const stock = document.getElementById("stock").value;
        
        const vida_util_num = parseInt(document.getElementById("vida_util_num").value) || 0;
        const vida_util_tipo = document.getElementById("vida_util_tipo").value;
        let vida_util_dias = vida_util_num;
        if (vida_util_tipo === "semanas") vida_util_dias *= 7;
        else if (vida_util_tipo === "meses") vida_util_dias *= 30;                      
        else if (vida_util_tipo === "anios") vida_util_dias *= 365;

        const costo = document.getElementById("costo").value;

        try {
            if (editingId) {
                await fetchAPI(`/epp/${editingId}`, "PUT", { nombre_epp, tipo, stock, vida_util_dias, costo });
                msg.textContent = "¡Equipo actualizado exitosamente!";
                
                editingId = null;
                submitBtn.innerHTML = '<span class="material-symbols-outlined">add_box</span> Guardar Equipo';
                submitBtn.style.background = '#10b981';
            } else {
                await fetchAPI("/epp", "POST", { nombre_epp, tipo, stock, vida_util_dias, costo });
                msg.textContent = "¡Equipo registrado exitosamente!";
            }

            form.reset();
            msg.style.display = "block";
            msg.style.color = "var(--success)";

            setTimeout(() => { msg.style.display = "none"; }, 3000);

            loadEPP();
        } catch (error) {
            msg.textContent = "Error al guardar el equipo.";
            msg.style.color = "var(--danger)";
            msg.style.display = "block";
            console.error(error);
        }
    });

    loadEPP();
});

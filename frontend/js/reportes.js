import { fetchAPI } from './api.js';

document.addEventListener("DOMContentLoaded", async () => {
    const radioTypes = document.querySelectorAll('input[name="reportType"]');
    const groupEspecifico = document.getElementById("groupEspecifico");

    const selectArea = document.getElementById("selectArea");
    const selectColaborador = document.getElementById("selectColaborador");

    const ctx = document.getElementById("eppChart").getContext("2d");
    const btnDownload = document.getElementById("btnDownload");
    const noDataMsg = document.getElementById("no-data-msg");

    // UI Panel Elements
    const colPanel = document.getElementById("colaboradorInfoPanel");
    const pNombre = document.getElementById("panelColNombre");
    const pCargo = document.getElementById("panelColCargo");
    const pProgress = document.getElementById("panelColProgressText");
    const pEpps = document.getElementById("panelColEpps");

    // UI Table Elements
    const dynamicTableContainer = document.getElementById("dynamicTableContainer");
    const tableAreaName = document.getElementById("tableAreaName");
    const monthlyEppTableHead = document.getElementById("monthlyEppTableHead");
    const monthlyEppTableBody = document.getElementById("monthlyEppTableBody");
    const monthlyNoDataMsg = document.getElementById("monthlyNoDataMsg");
    const monthlyEppTable = document.getElementById("monthlyEppTable");

    let chartInstance = null;
    let listaAreas = [];
    let listaColaboradores = [];

    // Inicializar data base
    try {
        [listaAreas, listaColaboradores] = await Promise.all([
            fetchAPI("/areas"),
            fetchAPI("/empleados")
        ]);

        selectArea.innerHTML = '<option value="" disabled selected>Seleccione un área...</option>';
        listaAreas.forEach(a => {
            const opt = document.createElement("option");
            opt.value = a.id_area;
            opt.textContent = a.nombre_area;
            selectArea.appendChild(opt);
        });

        // Cargar por defecto general
        loadGeneralReport();

    } catch (err) {
        console.error("Error inicializando reportes:", err);
    }

    // Cambios en los radio buttons
    radioTypes.forEach(radio => {
        radio.addEventListener("change", (e) => {
            const type = e.target.value;

            hidePanel();
            if (dynamicTableContainer) dynamicTableContainer.style.display = "none";

            if (type === "general") {
                groupEspecifico.style.display = "none";
                loadGeneralReport();
            } else if (type === "especifico") {
                groupEspecifico.style.display = "flex";
                if (selectArea.value) {
                    if (selectColaborador.value && selectColaborador.value !== "all") {
                        loadColaboradorReport(selectColaborador.value);
                    } else {
                        loadAreaReport(selectArea.value);
                    }
                } else {
                    clearChart();
                }
            }
        });
    });

    selectArea.addEventListener("change", (e) => {
        const areaId = parseInt(e.target.value);
        const areaObj = listaAreas.find(a => a.id_area === areaId);
        
        hidePanel();
        
        if (areaObj) {
            const filtrados = listaColaboradores.filter(c => c.area.toLowerCase() === areaObj.nombre_area.toLowerCase());
            
            selectColaborador.innerHTML = '<option value="all" selected>Todos los Colaboradores</option>';
            filtrados.forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.id_colaborador;
                opt.textContent = c.nombre_colaborador;
                selectColaborador.appendChild(opt);
            });
            selectColaborador.disabled = false;
        }
        
        loadAreaReport(areaId);
    });

    selectColaborador.addEventListener("change", (e) => {
        const colId = e.target.value;
        if (colId === "all") {
            hidePanel();
            if (selectArea.value) loadAreaReport(selectArea.value);
        } else {
            loadColaboradorReport(colId);
        }
    });

    function hidePanel() {
        if(colPanel) colPanel.style.display = "none";
    }

    async function loadGeneralReport() {
        try {
            const data = await fetchAPI('/areas/stats/general');
            renderChart(data.stats, "nombre_area", "Áreas");
        } catch (err) {
            console.error(err);
        }
    }

    async function loadAreaReport(areaId) {
        try {
            const data = await fetchAPI(`/areas/${areaId}/stats`);
            renderChart(data.stats, "nombre_epp", "Equipos (EPP)");
        } catch (err) {
            console.error(err);
        }
    }

    async function loadColaboradorReport(colId) {
        try {
            const data = await fetchAPI(`/areas/stats/colaborador/${colId}`);
            renderChart(data.stats, "nombre_epp", "Equipos (EPP)");
            renderColaboradorPanel(data.nombre_colaborador, colId, data.stats);
        } catch (err) {
            console.error(err);
            clearChart();
            hidePanel();
            noDataMsg.textContent = "El colaborador no pertenece a un área válida o no tiene EPPs asignados.";
            noDataMsg.style.display = "block";
        }
    }

    function renderColaboradorPanel(nombre, idStr, statsArray) {
        if(!colPanel) return;
        const idInt = parseInt(idStr);
        const colObj = listaColaboradores.find(c => c.id_colaborador === idInt);
        
        pNombre.textContent = nombre;
        pCargo.textContent = colObj ? `${colObj.cargo || 'Sin cargo'} - ${colObj.area}` : 'Desconocido';
        
        let reqTotal = statsArray.length;
        let entregados = statsArray.filter(s => s.entregados > 0).length;
        
        pProgress.textContent = `${entregados} de ${reqTotal} Entregados`;
        
        pEpps.innerHTML = '';
        statsArray.forEach(stat => {
            const isOk = stat.entregados > 0;
            const div = document.createElement('div');
            div.style.padding = '8px 12px';
            div.style.borderRadius = '4px';
            div.style.fontSize = '0.9rem';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';
            
            if (isOk) {
                div.style.background = 'rgba(16, 185, 129, 0.1)';
                div.style.border = '1px solid rgba(16, 185, 129, 0.4)';
                div.style.color = '#34d399';
                div.innerHTML = `<span>${stat.nombre_epp}</span> <span class="material-symbols-outlined" style="font-size:1.1rem">check_circle</span>`;
            } else {
                div.style.background = 'rgba(239, 68, 68, 0.1)';
                div.style.border = '1px solid rgba(239, 68, 68, 0.4)';
                div.style.color = '#f87171';
                div.innerHTML = `<span>${stat.nombre_epp}</span> <span class="material-symbols-outlined" style="font-size:1.1rem">cancel</span>`;
            }
            pEpps.appendChild(div);
        });
        
        colPanel.style.display = "block";
    }

    function clearChart() {
        if (chartInstance) {
            chartInstance.destroy();
        }
        noDataMsg.style.display = "block";
        btnDownload.disabled = true;
    }

    function renderChart(stats, labelKey, xAxisTitle) {
        if (chartInstance) {
            chartInstance.destroy();
        }

        if (!stats || stats.length === 0) {
            noDataMsg.textContent = "No hay datos para mostrar en este reporte.";
            noDataMsg.style.display = "block";
            btnDownload.disabled = true;
            return;
        }

        noDataMsg.style.display = "none";
        btnDownload.disabled = false;

        const labels = stats.map(s => s[labelKey]);
        const dataPorcentajes = stats.map(s => s.porcentaje);

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Porcentaje de Cumplimiento (%)',
                    data: dataPorcentajes,
                    backgroundColor: 'rgba(139, 92, 246, 0.6)',
                    borderColor: 'rgba(139, 92, 246, 1)',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                onClick: (e, elements) => {
                    if (elements && elements.length > 0 && xAxisTitle === "Áreas") {
                        const index = elements[0].index;
                        const clickedLabel = labels[index];
                        const areaObj = listaAreas.find(a => a.nombre_area === clickedLabel);
                        if (areaObj) {
                            loadMonthlyTable(areaObj.id_area);
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Porcentaje %',
                            color: '#e4e4e7'
                        },
                        ticks: { color: '#a1a1aa' },
                        grid: { color: 'rgba(255, 255, 255, 0.05)' }
                    },
                    x: {
                        title: { display: true, text: xAxisTitle, color: '#e4e4e7' },
                        ticks: { color: '#e4e4e7' },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: '#e4e4e7' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y + '%';
                                    
                                    const rawData = stats[context.dataIndex];
                                    if (rawData && rawData.requeridos !== undefined) {
                                        label += ` (${rawData.entregados} entregados de ${rawData.requeridos} requeridos)`;
                                    }
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    // Descargar gráfica
    btnDownload.addEventListener("click", () => {
        if (!chartInstance) return;

        const link = document.createElement('a');
        link.download = `reporte-${new Date().getTime()}.png`;
        link.href = document.getElementById("eppChart").toDataURL('image/png');
        link.click();
    });

    async function loadMonthlyTable(areaId) {
        try {
            const data = await fetchAPI(`/areas/${areaId}/entregas-mensuales`);
            tableAreaName.textContent = `Entregas Mensuales - Área: ${data.nombre_area}`;
            
            monthlyEppTableHead.innerHTML = '';
            monthlyEppTableBody.innerHTML = '';
            
            if (!data.periodos || data.periodos.length === 0) {
                monthlyNoDataMsg.style.display = 'block';
                monthlyEppTable.style.display = 'none';
            } else {
                monthlyNoDataMsg.style.display = 'none';
                monthlyEppTable.style.display = 'table';
                
                // Header (first col empty or 'Mes', rest epps)
                const thMes = document.createElement('th');
                thMes.textContent = 'Período';
                thMes.style.padding = '12px';
                thMes.style.borderBottom = '2px solid rgba(139, 92, 246, 0.5)';
                monthlyEppTableHead.appendChild(thMes);
                
                data.epps.forEach(epp => {
                    const th = document.createElement('th');
                    th.textContent = epp.nombre_epp;
                    th.style.padding = '12px';
                    th.style.borderBottom = '2px solid rgba(139, 92, 246, 0.5)';
                    monthlyEppTableHead.appendChild(th);
                });
                
                // Body rows
                data.periodos.forEach(periodo => {
                    const tr = document.createElement('tr');
                    
                    const tdMes = document.createElement('td');
                    tdMes.textContent = periodo;
                    tdMes.style.padding = '12px';
                    tdMes.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
                    tdMes.style.fontWeight = 'bold';
                    tr.appendChild(tdMes);
                    
                    data.epps.forEach(epp => {
                        const td = document.createElement('td');
                        const cantidad = data.matrix[periodo][epp.id_epp] || 0;
                        td.textContent = cantidad;
                        td.style.padding = '12px';
                        td.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
                        if (cantidad > 0) {
                            td.style.color = '#34d399';
                        }
                        tr.appendChild(td);
                    });
                    
                    monthlyEppTableBody.appendChild(tr);
                });
            }
            
            dynamicTableContainer.style.display = 'block';
            
            setTimeout(() => {
                dynamicTableContainer.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            
        } catch (error) {
            console.error("Error al cargar tabla mensual:", error);
        }
    }
});

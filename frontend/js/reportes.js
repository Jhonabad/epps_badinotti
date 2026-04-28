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

    const colaboradoresListaContainer = document.getElementById("colaboradoresListaContainer");
    const colaboradoresListaHead = document.getElementById("colaboradoresListaHead");
    const colaboradoresListaBody = document.getElementById("colaboradoresListaBody");

    const colaboradorMatrixPanel = document.getElementById("colaboradorMatrixPanel");
    const matrixColaboradorNombre = document.getElementById("matrixColaboradorNombre");
    const matrixColaboradorArea = document.getElementById("matrixColaboradorArea");
    const matrixColaboradorCargo = document.getElementById("matrixColaboradorCargo");
    const matrixColaboradorHead = document.getElementById("matrixColaboradorHead");
    const matrixColaboradorBody = document.getElementById("matrixColaboradorBody");
    const matrixColaboradorFoot = document.getElementById("matrixColaboradorFoot");

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
            if (colaboradoresListaContainer) colaboradoresListaContainer.style.display = "none";

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
            if (colaboradoresListaContainer) colaboradoresListaContainer.style.display = "none";
            loadColaboradorReport(colId);
        }
    });

    function hidePanel() {
        if(colPanel) colPanel.style.display = "none";
        if(colaboradoresListaContainer) colaboradoresListaContainer.style.display = "none";
        if(colaboradorMatrixPanel) colaboradorMatrixPanel.style.display = "none";
        const eppChartContainer = document.getElementById("eppChart").parentElement;
        if(eppChartContainer) eppChartContainer.style.display = "block";
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
            
            if (data.colaboradoresLista && data.colaboradoresLista.length > 0) {
                if(colaboradoresListaHead) {
                    let thHtml = `<th style="padding: 12px; border-bottom: 2px solid rgba(139, 92, 246, 0.5);">Colaborador</th>`;
                    data.stats.forEach(s => {
                        thHtml += `<th style="padding: 12px; border-bottom: 2px solid rgba(139, 92, 246, 0.5); text-align: center; font-size:0.85rem;">${s.nombre_epp}</th>`;
                    });
                    colaboradoresListaHead.innerHTML = `<tr>${thHtml}</tr>`;
                }

                if(colaboradoresListaBody) colaboradoresListaBody.innerHTML = '';
                data.colaboradoresLista.forEach(c => {
                    const tr = document.createElement("tr");
                    let tdHtml = `<td style="padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); font-weight: bold;">${c.nombre_colaborador}</td>`;
                    
                    data.stats.forEach(s => {
                        const cant = c.epps[s.id_epp] || 0;
                        tdHtml += `<td style="padding: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); text-align: center; color: ${cant > 0 ? '#34d399' : '#636369'}; font-weight: ${cant > 0 ? 'bold' : 'normal'};">${cant}</td>`;
                    });

                    tr.innerHTML = tdHtml;
                    if(colaboradoresListaBody) colaboradoresListaBody.appendChild(tr);
                });
                if(colaboradoresListaContainer) colaboradoresListaContainer.style.display = 'block';
            } else {
                if(colaboradoresListaContainer) colaboradoresListaContainer.style.display = 'none';
            }

        } catch (err) {
            console.error(err);
        }
    }

    async function loadColaboradorReport(colId) {
        try {
            const data = await fetchAPI(`/areas/stats/colaborador/${colId}`);
            
            const eppChartContainer = document.getElementById("eppChart").parentElement;
            if(eppChartContainer) eppChartContainer.style.display = "none"; 
            if(colPanel) colPanel.style.display = "none";
            if(colaboradoresListaContainer) colaboradoresListaContainer.style.display = "none";

            matrixColaboradorNombre.textContent = data.nombre_colaborador;
            matrixColaboradorArea.textContent = data.nombre_area;
            matrixColaboradorCargo.textContent = data.cargo;
            
            matrixColaboradorHead.innerHTML = "";
            matrixColaboradorBody.innerHTML = "";
            matrixColaboradorFoot.innerHTML = "";

            if (data.stats && data.stats.length > 0) {
                let trH1 = `<tr><th rowspan="2" style="border: 1px solid rgba(139, 92, 246, 0.5); padding: 5px;">Fechas</th>`;
                let trH2 = `<tr>`;
                
                data.stats.forEach(s => {
                    trH1 += `<th colspan="2" style="border: 1px solid rgba(139, 92, 246, 0.5); padding: 5px; font-size:0.85rem; background:rgba(255,255,255,0.05); text-transform:uppercase;">${s.nombre_epp}</th>`;
                    trH2 += `<th style="border: 1px solid rgba(139, 92, 246, 0.5); padding: 5px; font-weight:normal; font-size:0.75rem;">Entrega</th>
                             <th style="border: 1px solid rgba(139, 92, 246, 0.5); padding: 5px; font-weight:normal; font-size:0.75rem;">Devolución</th>`;
                });
                trH1 += `</tr>`;
                trH2 += `</tr>`;
                matrixColaboradorHead.innerHTML = trH1 + trH2;

                if (data.eventosLista) {
                    data.eventosLista.forEach(ev => {
                        let tr = `<tr>`;
                        tr += `<td style="border: 1px solid #3f3f46; padding: 5px; font-size:0.8rem; font-weight:bold;">${ev.fecha_evento}</td>`;
                        data.stats.forEach(s => {
                            const cell = ev.epps[s.id_epp];
                            if (cell) {
                                tr += `<td style="border: 1px solid #3f3f46; padding: 5px; color:#34d399; font-size:0.85rem;">[${cell.cantidad}] Entregado</td>`;
                                
                                let devHtml = "";
                                if (cell.estado_devolucion) {
                                    let devColor = cell.estado_devolucion === 'Reutilizable' ? '#3b82f6' : '#f59e0b';
                                    devHtml = `<span style="color:${devColor}; font-size:0.8rem;">${cell.estado_devolucion}</span>`;
                                } else {
                                    devHtml = `<button onclick="window.devolverEPP(${cell.id_entrega})" style="padding:4px 8px; font-size:0.75rem; background:#3f3f46; color:white; border:none; border-radius:4px; cursor:pointer;">Registrar</button>`;
                                }
                                tr += `<td style="border: 1px solid #3f3f46; padding: 5px; text-align:center;">${devHtml}</td>`;
                            } else {
                                tr += `<td style="border: 1px solid #3f3f46; padding: 5px;"></td>`;
                                tr += `<td style="border: 1px solid #3f3f46; padding: 5px;"></td>`;
                            }
                        });
                        tr += `</tr>`;
                        matrixColaboradorBody.innerHTML += tr;
                    });
                }

                let trF = `<tr><th style="border: 1px solid rgba(139, 92, 246, 0.5); padding: 5px; background:rgba(255,255,255,0.05); text-align:right;">Totales</th>`;
                data.stats.forEach(s => {
                    trF += `<th colspan="2" style="border: 1px solid rgba(139, 92, 246, 0.5); padding: 5px; background:rgba(255,255,255,0.05); color:#10b981; font-size:1rem;">${s.entregados}</th>`;
                });
                trF += `</tr>`;
                matrixColaboradorFoot.innerHTML = trF;
            }

            colaboradorMatrixPanel.style.display = "block";

        } catch (err) {
            console.error(err);
            clearChart();
            hidePanel();
            noDataMsg.textContent = "El colaborador no pertenece a un área válida o no tiene EPPs asignados.";
            noDataMsg.style.display = "block";
        }
    }

    window.devolverEPP = async (idEntrega) => {
        const estado = prompt("Ingrese tipo de devolución:\n1 para Reutilizable\n2 para Desechable");
        if(estado === '1' || estado === '2' || (estado && (estado.toLowerCase() === 'reutilizable' || estado.toLowerCase() === 'desechable'))) {
            const estadoFormateado = (estado === '1' || estado.toLowerCase() === 'reutilizable') ? 'Reutilizable' : 'Desechable';
            try {
                await fetchAPI(`/entregas/devolver/${idEntrega}`, "POST", { estado_devolucion: estadoFormateado });
                alert("Devolución registrada exitosamente.");
                if (document.getElementById("selectColaborador").value) {
                    loadColaboradorReport(document.getElementById("selectColaborador").value);
                }
            } catch(e) {
                alert("Error al registrar devolución.");
            }
        } else {
            if(estado) alert("Estado no válido. Operación cancelada.");
        }
    };

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
                
                // Header 
                const thEpp = document.createElement('th');
                thEpp.textContent = 'Equipo (EPP)';
                thEpp.style.padding = '12px';
                thEpp.style.borderBottom = '2px solid rgba(139, 92, 246, 0.5)';
                monthlyEppTableHead.appendChild(thEpp);
                
                data.periodos.forEach(periodo => {
                    const th = document.createElement('th');
                    th.textContent = periodo;
                    th.style.padding = '12px';
                    th.style.borderBottom = '2px solid rgba(139, 92, 246, 0.5)';
                    monthlyEppTableHead.appendChild(th);
                });
                
                // Body rows
                data.epps.forEach(epp => {
                    const tr = document.createElement('tr');
                    
                    const tdEpp = document.createElement('td');
                    tdEpp.textContent = epp.nombre_epp;
                    tdEpp.style.padding = '12px';
                    tdEpp.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
                    tdEpp.style.fontWeight = 'bold';
                    tr.appendChild(tdEpp);
                    
                    data.periodos.forEach(periodo => {
                        const td = document.createElement('td');
                        const cantidad = data.matrix[periodo] && data.matrix[periodo][epp.id_epp] ? data.matrix[periodo][epp.id_epp] : 0;
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

    // === Global Report Modal Logic ===
    const btnOpenGlobalModal = document.getElementById("btnOpenGlobalModal");
    const globalReportModal = document.getElementById("globalReportModal");
    const btnCloseGlobalModal = document.getElementById("btnCloseGlobalModal");
    const globalYearSelect = document.getElementById("globalYearSelect");
    const globalReportTableHead = document.getElementById("globalReportTableHead");
    const globalReportTableBody = document.getElementById("globalReportTableBody");
    const globalReportTotal = document.getElementById("globalReportTotal");
    const globalYearLabel = document.getElementById("globalYearLabel");

    if (btnOpenGlobalModal) {
        const currentYear = new Date().getFullYear();
        globalYearSelect.innerHTML = `
            <option value="${currentYear}">${currentYear}</option>
            <option value="${currentYear - 1}">${currentYear - 1}</option>
            <option value="${currentYear - 2}">${currentYear - 2}</option>
        `;

        btnOpenGlobalModal.addEventListener("click", () => {
            globalReportModal.style.display = "flex";
            loadGlobalReport(globalYearSelect.value);
        });

        btnCloseGlobalModal.addEventListener("click", () => {
            globalReportModal.style.display = "none";
        });

        globalYearSelect.addEventListener("change", (e) => {
            loadGlobalReport(e.target.value);
        });
    }

    async function loadGlobalReport(year) {
        globalYearLabel.textContent = `(${year})`;
        try {
            const data = await fetchAPI(`/entregas/reporte-global/${year}`);
            globalReportTableHead.innerHTML = "";
            globalReportTableBody.innerHTML = "";

            // Thead
            const thEq = document.createElement("th");
            thEq.style.padding = "10px";
            thEq.style.borderBottom = "2px solid #3f3f46";
            thEq.textContent = "EQUIPO (EPP)";
            globalReportTableHead.appendChild(thEq);

            data.periodos.forEach(m => {
                const th = document.createElement("th");
                th.style.padding = "10px";
                th.style.borderBottom = "2px solid #3f3f46";
                th.style.textAlign = "center";
                th.textContent = m.substring(0,3).toUpperCase();
                globalReportTableHead.appendChild(th);
            });

            const thTotalAnual = document.createElement("th");
            thTotalAnual.style.padding = "10px";
            thTotalAnual.style.borderBottom = "2px solid #10b981";
            thTotalAnual.style.textAlign = "center";
            thTotalAnual.textContent = "TOTAL AÑO";
            globalReportTableHead.appendChild(thTotalAnual);

            const thCostoUn = document.createElement("th");
            thCostoUn.style.padding = "10px";
            thCostoUn.style.borderBottom = "2px solid #3f3f46";
            thCostoUn.style.textAlign = "right";
            thCostoUn.textContent = "COSTO UND";
            globalReportTableHead.appendChild(thCostoUn);

            const thCostoTot = document.createElement("th");
            thCostoTot.style.padding = "10px";
            thCostoTot.style.borderBottom = "2px solid #10b981";
            thCostoTot.style.textAlign = "right";
            thCostoTot.textContent = "COSTO TOTAL";
            globalReportTableHead.appendChild(thCostoTot);

            // Tbody
            data.epps.forEach(epp => {
                const tr = document.createElement("tr");

                const tdName = document.createElement("td");
                tdName.style.padding = "10px";
                tdName.style.borderBottom = "1px solid #27272a";
                tdName.innerHTML = `<strong>${epp.nombre_epp}</strong> <br> <small style="color:#a1a1aa">Expira en: ${epp.vida_util_dias || 180} días</small>`;
                tr.appendChild(tdName);

                data.periodos.forEach(m => {
                    const cant = data.matrix[m][epp.id_epp] || 0;
                    const td = document.createElement("td");
                    td.style.padding = "10px";
                    td.style.borderBottom = "1px solid #27272a";
                    td.style.textAlign = "center";
                    td.textContent = cant;
                    if(cant > 0) td.style.color = "#34d399";
                    tr.appendChild(td);
                });

                const totalE = data.totales_anuales[epp.id_epp] || 0;
                const tdT = document.createElement("td");
                tdT.style.padding = "10px";
                tdT.style.borderBottom = "1px solid #27272a";
                tdT.style.textAlign = "center";
                tdT.style.fontWeight = "bold";
                tdT.style.color = totalE > 0 ? "#10b981" : "#a1a1aa";
                tdT.textContent = totalE;
                tr.appendChild(tdT);

                const costo = parseFloat(epp.costo) || 0;
                const tdCU = document.createElement("td");
                tdCU.style.padding = "10px";
                tdCU.style.borderBottom = "1px solid #27272a";
                tdCU.style.textAlign = "right";
                tdCU.textContent = `S/ ${costo.toFixed(2)}`;
                tr.appendChild(tdCU);

                const costoTot = data.costos_totales[epp.id_epp] || 0;
                const tdCT = document.createElement("td");
                tdCT.style.padding = "10px";
                tdCT.style.borderBottom = "1px solid #27272a";
                tdCT.style.textAlign = "right";
                tdCT.style.fontWeight = "bold";
                tdCT.style.color = costoTot > 0 ? "#10b981" : "#a1a1aa";
                tdCT.textContent = `S/ ${costoTot.toFixed(2)}`;
                tr.appendChild(tdCT);

                globalReportTableBody.appendChild(tr);
            });

            globalReportTotal.textContent = `S/ ${data.gasto_total_anual.toFixed(2)}`;

        } catch (error) {
            console.error("Error al cargar reporte global:", error);
        }
    }
});

// =======================================================
//  SISTEMA ADMIN — V. CON RENTABILIDAD

// =======================================================
//  INICIALIZAR FORMULARIO DE UPLOAD DE IMÁGENES
// =======================================================
let formProductosInicializado = false;

function initProductosForm() {
    if (window.formProductosInicializado) {
        console.log('⚠️ Formulario ya inicializado, saltando...');
        return;
    }
    
    console.log('🔄 Inicializando formulario de productos...');
    
    // =========================================================
    //  UPLOAD DE IMAGEN
    // =========================================================
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('prodImagen');
    const preview = document.getElementById('prodPreview');
    const previewWrapper = document.getElementById('previewWrapper');
    const uploadEmpty = document.getElementById('uploadEmpty');

    if (!uploadArea || !fileInput) {
        console.error('❌ Elementos de imagen no encontrados');
        return;
    }

    function handleImageSelect(file) {
        if (file.size > 5 * 1024 * 1024) {
            toast('⚠️ La imagen no debe superar los 5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            if (previewWrapper) previewWrapper.style.display = 'block';
            if (uploadEmpty) uploadEmpty.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    function removeImage(e) {
        e.stopPropagation();
        fileInput.value = '';
        preview.src = '';
        if (previewWrapper) previewWrapper.style.display = 'none';
        if (uploadEmpty) uploadEmpty.style.display = 'flex';
    }

    // Click en área de upload (delegación de eventos)
    uploadArea.onclick = function(e) {
        // Si click en botón eliminar
        if (e.target.closest('.btn-remove-img')) {
            removeImage(e);
            return;
        }
        // Si no, abrir selector de archivo
        fileInput.click();
    };

    // Change en input file
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (file) handleImageSelect(file);
    };

    // Drag & Drop
    uploadArea.ondragover = function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    };

    uploadArea.ondragleave = function() {
        uploadArea.classList.remove('dragover');
    };

    uploadArea.ondrop = function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageSelect(file);
        }
    };

    // =========================================================
    //  SKU AUTOMÁTICO
    // =========================================================
    const inputNombre = document.getElementById('prodNombre');
    const inputCategoria = document.getElementById('prodCategoria');
    const inputSKU = document.getElementById('prodSKU');

    function generarSKU() {
        const nombre = (inputNombre?.value || '').trim();
        const categoria = (inputCategoria?.value || '').trim();
        
        if (nombre.length >= 2) {
            const nombreCode = nombre
                .toUpperCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^A-Z0-9]/g, '')
                .substring(0, 3)
                .padEnd(3, 'X');
            
            const catCode = categoria
                ? categoria
                    .toUpperCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^A-Z0-9]/g, '')
                    .substring(0, 3)
                    .padEnd(3, 'X')
                : 'GEN';
            
            const num = String(Date.now()).slice(-3);
            
            if (inputSKU) inputSKU.value = `${nombreCode}-${catCode}-${num}`;
        } else {
            if (inputSKU) inputSKU.value = '';
        }
    }

    if (inputNombre) inputNombre.oninput = generarSKU;
    if (inputCategoria) inputCategoria.oninput = generarSKU;

    // =========================================================
    //  CÁLCULO DE MARGEN EN TIEMPO REAL
    // =========================================================
    const inputPrecioCompra = document.getElementById('prodPrecioCompra');
    const inputPrecioVenta = document.getElementById('prodPrecio');
    const previewGanancia = document.getElementById('previewGanancia');
    const previewMargen = document.getElementById('previewMargen');

    function calcularMargen() {
        const compra = Number(inputPrecioCompra?.value) || 0;
        const venta = Number(inputPrecioVenta?.value) || 0;
        
        const ganancia = venta - compra;
        const margen = venta > 0 ? (ganancia / venta) * 100 : 0;
        
        if (previewGanancia) {
            previewGanancia.textContent = `S/ ${ganancia.toFixed(2)}`;
            previewGanancia.style.color = ganancia >= 0 ? '#10b981' : '#ef4444';
        }
        
        if (previewMargen) {
            previewMargen.textContent = `${margen.toFixed(1)}%`;
            previewMargen.className = `margen-value margen-badge ${getMargenClass(margen)}`;
        }
    }

    if (inputPrecioCompra) inputPrecioCompra.oninput = calcularMargen;
    if (inputPrecioVenta) inputPrecioVenta.oninput = calcularMargen;

    // =========================================================
    //  TOGGLE DE VARIANTES
    // =========================================================
    const toggle = document.getElementById('prodTieneVariantes');
    const toggleLabel = document.getElementById('toggleLabel');

    if (toggle && toggleLabel) {
        toggle.onchange = function() {
            if (this.checked) {
                toggleLabel.textContent = 'Sí - Tiene múltiples tallas/colores';
                toggleLabel.style.color = '#3b82f6';
            } else {
                toggleLabel.textContent = 'No - Producto Simple';
                toggleLabel.style.color = '#475569';
            }
        };
    }

    // =========================================================
    //  MARCAR COMO INICIALIZADO
    // =========================================================
    window.formProductosInicializado = true;
    console.log('✅ Formulario de productos inicializado');
}
// =======================================================
//  FUNCIÓN PARA ABRIR MODAL DE IMAGEN (agrégala si no existe)
// =======================================================

async function cargarVista(nombre) {
    window.vistaActualAdmin = nombre;

    const cont = document.getElementById("contenido");

    try {
        const resp = await fetch(`components/admin/${nombre}.html`);
        const html = await resp.text();
        cont.innerHTML = html;

        if (typeof marcarMenuActivo === 'function') {
            marcarMenuActivo(nombre);
        }

        document.dispatchEvent(new Event("vista-cargada"));

    } catch (e) {
        console.error("❌ Error al cargar vista:", nombre, e);
        cont.innerHTML = "<p>Error cargando vista.</p>";
    }
}

async function inicializarProductos() {
    // ❌ NO cerrar el modal aquí
    await cargarSelectSucursales("prodSucursal");
    await renderizarTablaProductos();
    initProductosForm();
    const btn = document.getElementById("btnGuardarProducto");
    if (btn) btn.onclick = guardarProducto;
    
}


function toNumberSafe(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return Number.isFinite(val) ? val : 0;

  let s = String(val).trim();
  if (!s) return 0;

  // quitar moneda y espacios
  s = s.replace(/S\/\s?/gi, "").replace(/\s+/g, "");

  // si tiene coma decimal (ej: 12,50) => cambiar a punto
  if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(",", ".");

  // quitar separadores de miles (ej: 1,234.50 o 1.234,50)
  // si tiene ambos, asumimos el último separador como decimal
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    const decSep = lastComma > lastDot ? "," : ".";
    s = s.replace(/[.,]/g, (m, idx) => (idx === s.lastIndexOf(decSep) ? "." : ""));
  } else {
    // si solo hay comas, puede ser miles: 1,234 -> 1234
    s = s.replace(/,/g, "");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// ✅ Parse de fecha robusto: ISO o "dd/mm/yyyy hh:mm" (Sheets)
function parseFechaSafe(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;

  const s = String(valor).trim();
  if (!s) return null;

  // ISO típico
  if (s.includes("T") || /^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }

  // dd/mm/yyyy [hh:mm[:ss]]
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const dd = Number(m[1]), mm = Number(m[2]) - 1, yyyy = Number(m[3]);
    const hh = Number(m[4] || 0), mi = Number(m[5] || 0), ss = Number(m[6] || 0);
    const d = new Date(yyyy, mm, dd, hh, mi, ss);
    return isNaN(d) ? null : d;
  }

  // fallback
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

// Variables globales para cache
let sucursalesCache = [];
let productosCache = [];
let usuariosCache = [];


function convertirUrlGoogleDrive(url) {
    if (!url || url.trim() === '') return '';
    
    let fileId = '';
    
    // Formato 1: https://drive.google.com/uc?export=view&id=XXXXX
    let match = url.match(/[?&]id=([^&]+)/);
    if (match) {
        fileId = match[1];
    }
    
    // Formato 2: https://drive.google.com/file/d/XXXXX/view
    if (!fileId) {
        match = url.match(/\/file\/d\/([^\/]+)/);
        if (match) {
            fileId = match[1];
        }
    }
    
    // Formato 3: Solo el ID
    if (!fileId && url.match(/^[a-zA-Z0-9_-]{20,}$/)) {
        fileId = url;
    }
    
    // Devolver URL de thumbnail (siempre funciona)
    if (fileId) {
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    }
    
    return url;
}

// -------------------------
//  PROTEGER RUTA ADMIN
// -------------------------
function protegerAdmin() {
    const userStr = localStorage.getItem("user");
    if (!userStr) return (window.location.href = "index.html");

    const user = JSON.parse(userStr);
    if (user.rol !== "ADMIN") window.location.href = "index.html";
}

// -------------------------
//  INICIO
// -------------------------
window.onload = async () => {
    protegerAdmin();
    await cargarCaches();
    await cargarVista("dashboard");
};

function logoutAdmin() {
    localStorage.removeItem("user");
    window.location.href = "index.html";
}

// =======================================================
//  CACHES
// =======================================================

async function cargarCaches() {
    try {
        const [sucData, prodData, userData] = await Promise.all([
            apiCall({ action: "getSucursales" }),
            apiCall({ action: "getProductos" }),
            apiCall({ action: "getUsuarios" })
        ]);
        
        sucursalesCache = sucData.sucursales || [];
        productosCache = prodData.productos || [];
        usuariosCache = userData.usuarios || [];
    } catch (e) {
        console.error("Error cargando caches:", e);
    }
}

function getNombreSucursal(id) {
    if (!id) return '-';
    const sucursal = sucursalesCache.find(s => String(s.id) === String(id));
    return sucursal ? sucursal.nombre : `Sucursal ${id}`;
}

function getNombreProducto(id) {
    if (!id) return '-';
    const producto = productosCache.find(p => String(p.id) === String(id));
    return producto ? producto.nombre : `Producto ${id}`;
}

function getNombreEmpleado(id) {
    if (!id) return '-';
    const usuario = usuariosCache.find(u => String(u.id) === String(id));
    return usuario ? usuario.nombre : `Empleado ${id}`;
}

function getProductoPorId(id) {
    return productosCache.find(p => String(p.id) === String(id));
}

function actualizarToggleLabelEditar() {
    const toggle = document.getElementById('editProdTieneVariantes');
    const label = document.getElementById('editToggleLabel');
    
    if (toggle.checked) {
        label.textContent = 'Sí - Tiene múltiples tallas/colores';
        label.style.color = '#3b82f6';
    } else {
        label.textContent = 'No - Producto Simple';
        label.style.color = '#475569';
    }
}
// =======================================================
//  HELPERS DE FECHAS
// =======================================================

function obtenerRangoFechas(periodo, fechaDesde = null, fechaHasta = null) {
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    
    let desde, hasta;
    
    switch (periodo) {
        case 'hoy':
            desde = new Date(hoy);
            desde.setHours(0, 0, 0, 0);
            hasta = hoy;
            break;
        case 'semana':
            desde = new Date(hoy);
            const diaSemana = desde.getDay();
            const diffLunes = diaSemana === 0 ? 6 : diaSemana - 1;
            desde.setDate(desde.getDate() - diffLunes);
            desde.setHours(0, 0, 0, 0);
            hasta = hoy;
            break;
        case 'mes':
            desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            desde.setHours(0, 0, 0, 0);
            hasta = hoy;
            break;
        case 'anio':
            desde = new Date(hoy.getFullYear(), 0, 1);
            desde.setHours(0, 0, 0, 0);
            hasta = hoy;
            break;
        case 'todo':
            desde = null;
            hasta = null;
            break;
        case 'personalizado':
            desde = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null;
            hasta = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : null;
            break;
        default:
            desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            desde.setHours(0, 0, 0, 0);
            hasta = hoy;
    }
    
    return { desde, hasta };
}

function filtrarVentasPorFecha(ventas, desde, hasta) {
  if (!desde && !hasta) return ventas;

  return (ventas || []).filter(v => {
    const fechaVenta = parseFechaSafe(v?.fechaISO || v?.fecha || v?.createdAt);
    if (!fechaVenta) return true; // si viene raro, NO lo mates del filtro
    if (desde && fechaVenta < desde) return false;
    if (hasta && fechaVenta > hasta) return false;
    return true;
  });
}


function formatearFecha(fechaISO) {
  const d = parseFechaSafe(fechaISO);
  if (!d) return String(fechaISO || "-");

  return d.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
function inicializarCalculoMargen() {
    const inputPrecioCompra = document.getElementById('prodPrecioCompra');
    const inputPrecioVenta = document.getElementById('prodPrecio');
    const previewGanancia = document.getElementById('previewGanancia');
    const previewMargen = document.getElementById('previewMargen');
    
    if (!inputPrecioCompra || !inputPrecioVenta) return;
    
    function calcularMargen() {
        const compra = Number(inputPrecioCompra.value) || 0;
        const venta = Number(inputPrecioVenta.value) || 0;
        
        const ganancia = venta - compra;
        const margen = venta > 0 ? (ganancia / venta) * 100 : 0;
        
        if (previewGanancia) {
            previewGanancia.textContent = `S/ ${ganancia.toFixed(2)}`;
            previewGanancia.style.color = ganancia >= 0 ? '#10b981' : '#ef4444';
        }
        
        if (previewMargen) {
            previewMargen.textContent = `${margen.toFixed(1)}%`;
            previewMargen.className = `margen-value margen-badge ${getMargenClass(margen)}`;
        }
    }
    
    inputPrecioCompra.addEventListener('input', calcularMargen);
    inputPrecioVenta.addEventListener('input', calcularMargen);
}
function inicializarVistaProductos() {
    inicializarSKUAutomatico();
    inicializarCalculoMargen();
    cargarSelectSucursales('prodSucursal');
    renderizarTablaProductos();
    
    // Toggle de variantes
    const toggle = document.getElementById('prodTieneVariantes');
    const toggleLabel = document.getElementById('toggleLabel');
    
    if (toggle && toggleLabel) {
        toggle.addEventListener('change', function() {
            if (this.checked) {
                toggleLabel.textContent = 'Sí - Tiene múltiples tallas/colores';
                toggleLabel.style.color = '#3b82f6';
            } else {
                toggleLabel.textContent = 'No - Producto Simple';
                toggleLabel.style.color = '#475569';
            }
        });
    }
    
    // Evento del botón guardar
    const btnGuardar = document.getElementById('btnGuardarProducto');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarProducto);
    }
}
function getMargenClass(margen) {
    if (margen >= 40) return 'margen-excelente';
    if (margen >= 25) return 'margen-bueno';
    if (margen >= 10) return 'margen-regular';
    return 'margen-bajo';
}

// =======================================================
//  HELPERS DE RENTABILIDAD
// =======================================================

function calcularRentabilidadVenta(venta) {
  const producto = getProductoPorId(venta?.productoId);

  const precioCompra = toNumberSafe(producto?.precioCompra);
  const precioVenta  = toNumberSafe(producto?.precioVenta);
  const cantidad     = toNumberSafe(venta?.cantidad);

  // total puede venir como string "S/ 50", o vacío => usar fallback
  const totalVenta = toNumberSafe(venta?.total);
  const ventaTotal = totalVenta > 0 ? totalVenta : (precioVenta * cantidad);

  const costoTotal = precioCompra * cantidad;
  const ganancia = ventaTotal - costoTotal;
  const margen = ventaTotal > 0 ? (ganancia / ventaTotal) * 100 : 0;

  return { costo: costoTotal, ganancia, margen, ventaTotal };
}

function calcularResumenRentabilidad(ventas) {
    let totalVentas = 0;
    let totalCostos = 0;
    let totalGanancia = 0;
    let totalCantidad = 0;
    
    ventas.forEach(v => {
        const rent = calcularRentabilidadVenta(v);
        totalVentas += rent.ventaTotal;
        totalCostos += rent.costo;
        totalGanancia += rent.ganancia;
        totalCantidad += Number(v.cantidad) || 0;
    });
    
    const margenPromedio = totalVentas > 0 ? (totalGanancia / totalVentas) * 100 : 0;
    
    return {
        ventas: totalVentas,
        costos: totalCostos,
        ganancia: totalGanancia,
        margen: margenPromedio,
        cantidad: totalCantidad,
        transacciones: ventas.length
    };
}

function getMargenClass(margen) {
    if (margen >= 30) return 'margen-excelente';
    if (margen >= 20) return 'margen-bueno';
    if (margen >= 10) return 'margen-regular';
    return 'margen-bajo';
}

function getGananciaClass(ganancia) {
    return ganancia >= 0 ? 'ganancia-positiva' : 'ganancia-negativa';
}

// =======================================================
//  HELPERS DE SELECTS
// =======================================================

async function cargarSelectSucursales(id) {
    const sel = document.getElementById(id);
    if (!sel) return;

    sel.innerHTML = `<option value="">Todas</option>` +
        sucursalesCache.map(s => `<option value="${s.id}">${s.nombre}</option>`).join("");
}

async function cargarSelectEmpleados(id, incluirTodos = false) {
    const sel = document.getElementById(id);
    if (!sel) return;

    const empleados = usuariosCache.filter(u => u.rol === "EMPLEADO");
    
    sel.innerHTML =
        (incluirTodos ? `<option value="">Todos los empleados</option>` : `<option value="">Seleccione...</option>`) +
        empleados.map(u => `<option value="${u.id}">${u.nombre}</option>`).join("");
}

// =======================================================
//  DASHBOARD ADMIN CON RENTABILIDAD
// =======================================================
async function inicializarDashboardAdmin() {
    try {
        // Obtener datos
        const [dashData, ventasData] = await Promise.all([
            apiCall({ action: "getDashboardAdmin" }),
            apiCall({ action: "getVentasTotales" })
        ]);

        // KPIs básicos con valores seguros
        const kpiDia = document.getElementById("kpiVentasDia");
        const kpiMes = document.getElementById("kpiVentasMes");
        const kpiSuc = document.getElementById("kpiSucursales");
        const kpiStock = document.getElementById("kpiStockBajo");

        if (kpiDia) kpiDia.textContent = `S/ ${(Number(dashData.ventasDia) || 0).toFixed(2)}`;
        if (kpiMes) kpiMes.textContent = `S/ ${(Number(dashData.ventasMes) || 0).toFixed(2)}`;
        if (kpiSuc) kpiSuc.textContent = dashData.totalSucursales || 0;
        if (kpiStock) kpiStock.textContent = dashData.totalStockBajo || 0;

        // Calcular rentabilidad
        if (ventasData && ventasData.ventas && Array.isArray(ventasData.ventas)) {
            const hoy = new Date();
            const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
            const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            
            const ventasDia = ventasData.ventas.filter(v => new Date(v.fechaISO) >= inicioDia);
            const ventasMes = ventasData.ventas.filter(v => new Date(v.fechaISO) >= inicioMes);
            
            const rentDia = calcularResumenRentabilidad(ventasDia);
            const rentMes = calcularResumenRentabilidad(ventasMes);
            
            // KPIs de rentabilidad con valores seguros
            const kpiGananciaDia = document.getElementById("kpiGananciaDia");
            const kpiGananciaMes = document.getElementById("kpiGananciaMes");
            const kpiMargenDia = document.getElementById("kpiMargenDia");
            const kpiMargenMes = document.getElementById("kpiMargenMes");
            const kpiCostoDia = document.getElementById("kpiCostoDia");
            const kpiCostoMes = document.getElementById("kpiCostoMes");
            
            if (kpiGananciaDia) kpiGananciaDia.textContent = `S/ ${(rentDia.ganancia || 0).toFixed(2)}`;
            if (kpiGananciaMes) kpiGananciaMes.textContent = `S/ ${(rentMes.ganancia || 0).toFixed(2)}`;
            if (kpiMargenDia) kpiMargenDia.textContent = `Margen: ${(rentDia.margen || 0).toFixed(1)}%`;
            if (kpiMargenMes) kpiMargenMes.textContent = `Margen: ${(rentMes.margen || 0).toFixed(1)}%`;
            if (kpiCostoDia) kpiCostoDia.textContent = `S/ ${(rentDia.costos || 0).toFixed(2)}`;
            if (kpiCostoMes) kpiCostoMes.textContent = `S/ ${(rentMes.costos || 0).toFixed(2)}`;
            
            // Top productos vendidos
            const productoStats = {};
            ventasMes.forEach(v => {
                const pid = v.productoId;
                if (!productoStats[pid]) {
                    productoStats[pid] = { cantidad: 0, venta: 0, ganancia: 0 };
                }
                const rent = calcularRentabilidadVenta(v);
                productoStats[pid].cantidad += Number(v.cantidad) || 0;
                // ✅ AQUÍ ESTÁ EL FIX - asegurar que sean números
                productoStats[pid].venta += Number(rent.ventaTotal) || 0;
                productoStats[pid].ganancia += Number(rent.ganancia) || 0;
            });
            
            const topVendidos = Object.entries(productoStats)
                .map(([id, stats]) => ({ id, ...stats }))
                .sort((a, b) => b.cantidad - a.cantidad)
                .slice(0, 5);
                
            const topRentables = Object.entries(productoStats)
                .map(([id, stats]) => ({ 
                    id, 
                    ...stats,
                    margen: (stats.venta || 0) > 0 ? ((stats.ganancia || 0) / (stats.venta || 1)) * 100 : 0
                }))
                .sort((a, b) => (b.ganancia || 0) - (a.ganancia || 0))
                .slice(0, 5);
            
            const tbodyTop = document.getElementById("tablaTopProductos");
            if (tbodyTop) {
                tbodyTop.innerHTML = topVendidos.map(p => `
                    <tr>
                        <td>${getNombreProducto(p.id)}</td>
                        <td>${p.cantidad || 0}</td>
                        <td>S/ ${(p.venta || 0).toFixed(2)}</td>
                        <td class="${getGananciaClass(p.ganancia || 0)}">S/ ${(p.ganancia || 0).toFixed(2)}</td>
                    </tr>
                `).join("");
            }
            
            const tbodyRent = document.getElementById("tablaMasRentables");
            if (tbodyRent) {
                tbodyRent.innerHTML = topRentables.map(p => `
                    <tr>
                        <td>${getNombreProducto(p.id)}</td>
                        <td><span class="margen-badge ${getMargenClass(p.margen || 0)}">${(p.margen || 0).toFixed(1)}%</span></td>
                        <td class="${getGananciaClass(p.ganancia || 0)}">S/ ${(p.ganancia || 0).toFixed(2)}</td>
                    </tr>
                `).join("");
            }
            
            // Últimas ventas con ganancia
            const tbody = document.getElementById("tablaUltimasVentas");
            if (tbody) {
                const ultimas = ventasData.ventas.slice(-10).reverse();
                tbody.innerHTML = ultimas.map(v => {
                    const rent = calcularRentabilidadVenta(v);
                    return `
                        <tr>
                            <td>${formatearFecha(v.fechaISO)}</td>
                            <td>${getNombreSucursal(v.sucursalId)}</td>
                            <td>${getNombreEmpleado(v.empleadoId)}</td>
                            <td>${getNombreProducto(v.productoId)}</td>
                            <td>${v.cantidad || 0}</td>
                            <td>S/ ${(rent.ventaTotal || 0).toFixed(2)}</td>
                            <td class="${getGananciaClass(rent.ganancia || 0)}">S/ ${(rent.ganancia || 0).toFixed(2)}</td>
                        </tr>
                    `;
                }).join("");
            }
        }
    } catch (error) {
        console.error('Error en inicializarDashboardAdmin:', error);
        toast('❌ Error al cargar el dashboard');
    }
}

// =======================================================
//  PRODUCTOS CON MARGEN
// =======================================================
async function inicializarProductos() {
    await cargarSelectSucursales("prodSucursal");
    await renderizarTablaProductos();

    const btn = document.getElementById("btnGuardarProducto");
    if (btn) btn.onclick = guardarProducto;
}

// =======================================================
//  REEMPLAZA la función renderizarTablaProductos() en admin.js
// =======================================================

async function renderizarTablaProductos() {
    const data = await apiCall({ action: "getProductos" });
    productosCache = data.productos || [];
    
    // Actualizar contador
    const countEl = document.getElementById("productoCount");
    if (countEl) {
        countEl.textContent = `${productosCache.length} producto${productosCache.length !== 1 ? 's' : ''}`;
    }
    
    const tbody = document.getElementById("tablaProductos");
    if (!tbody) return;

    tbody.innerHTML = productosCache.map(p => {
        // Conversión segura de números
        const precioCompra = isNaN(Number(p.precioCompra)) ? 0 : Number(p.precioCompra);
        const precioVenta = isNaN(Number(p.precioVenta)) ? 0 : Number(p.precioVenta);
        const ganancia = precioVenta - precioCompra;
        const margen = precioVenta > 0 ? (ganancia / precioVenta) * 100 : 0;
        const stock = isNaN(Number(p.stock)) ? 0 : Number(p.stock);
        
        // Convertir URL de Google Drive
        const imagenUrl = convertirUrlGoogleDrive(p.imagenUrl);
        
        // Imagen con manejo de error
        const imagenHtml = imagenUrl 
            ? `<img src="${imagenUrl}" 
                    class="product-img-cell" 
                    onclick="abrirModalImagen('${p.imagenUrl}')"
                    onerror="this.outerHTML='<div class=\\'product-img-placeholder\\'>👔</div>'"
                    loading="lazy">`
            : `<div class="product-img-placeholder">👔</div>`;
        
        // Badge de variantes
        const tieneVariantes = p.tieneVariantes === 'SI';
        const variantesHtml = tieneVariantes
            ? `<span class="badge-variantes tiene" onclick="abrirModalVariantes('${p.id}')" title="Click para gestionar">🎨 Sí</span>`
            : `<span class="badge-variantes no-tiene">➖ No</span>`;
        
        // Botón de variantes (solo si tiene variantes habilitado)
        const btnVariantes = tieneVariantes
            ? `<button class="btn-action btn-variantes" onclick="abrirModalVariantes('${p.id}')" title="Gestionar Variantes">🎨</button>`
            : '';
        
        return `
            <tr>
                <td><code>${p.id}</code></td>
                <td>${imagenHtml}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.categoria || '-'}</td>
                <td>${p.tipo || '-'}</td>
                <td>S/ ${precioCompra.toFixed(2)}</td>
                <td><span style="color:#10b981;font-weight:600;">S/ ${precioVenta.toFixed(2)}</span></td>
                <td><span class="margen-badge ${getMargenClass(margen)}">${margen.toFixed(1)}%</span></td>
                <td><span class="${stock <= 5 ? 'stock-bajo' : ''}">${stock}</span></td>
                <td>${variantesHtml}</td>
                <td>${getNombreSucursal(p.sucursalId)}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editarProducto('${p.id}')" title="Editar">✏️</button>
                    ${btnVariantes}
                    <button class="btn-action btn-delete" onclick="eliminarProducto('${p.id}')" title="Eliminar">🗑️</button>
                </td>
            </tr>
        `;
    }).join("");
}
// =======================================================
//  FUNCIÓN PARA ABRIR MODAL DE IMAGEN (agrégala si no existe)
// =======================================================



function abrirModalImagen(url) {
    const modal = document.getElementById('modalImagen');
    const img = document.getElementById('imagenGrande');
    
    if (modal && img) {
        // Convertir URL para mostrar
        img.src = convertirUrlGoogleDrive(url);
        modal.classList.add('active');
    }
}


async function guardarProducto() {
    const nombre = document.getElementById("prodNombre").value.trim();
    const categoria = document.getElementById("prodCategoria").value.trim();
    const tipo = document.getElementById("prodTipo")?.value || 'Unisex';
    const sku = document.getElementById("prodSKU").value.trim();
    const precioCompra = document.getElementById("prodPrecioCompra").value;
    const precioVenta = document.getElementById("prodPrecio").value;
    const stock = document.getElementById("prodStock").value;
    const sucursalId = document.getElementById("prodSucursal").value;
    const tieneVariantes = document.getElementById("prodTieneVariantes")?.checked ? 'SI' : 'NO';

    // =========================================================
    //  VALIDACIONES
    // =========================================================
    if (!nombre) {
        toast("⚠️ El nombre es obligatorio");
        document.getElementById("prodNombre").focus();
        return;
    }
    
    if (!sucursalId) {
        toast("⚠️ Debes seleccionar una sucursal/tienda");
        document.getElementById("prodSucursal").focus();
        return;
    }
    
    if (!precioVenta || Number(precioVenta) <= 0) {
        toast("⚠️ El precio de venta debe ser mayor a 0");
        document.getElementById("prodPrecio").focus();
        return;
    }

    // Imagen en base64
    let imagenBase64 = null;
    const preview = document.getElementById("prodPreview");
    if (preview && preview.src && preview.src.startsWith('data:image')) {
        imagenBase64 = preview.src;
    }

    const btn = document.getElementById("btnGuardarProducto");
    const textoOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-small"></span> Guardando...';

    try {
        const resp = await apiCall({
            action: "crearProducto",
            nombre,
            categoria,
            tipo,
            sku,
            precioCompra: Number(precioCompra) || 0,
            precioVenta: Number(precioVenta) || 0,
            stock: Number(stock) || 0,
            sucursalId,
            tieneVariantes,
            imagenBase64
        });

        if (resp.success) {
            toast("✅ Producto guardado correctamente");
            limpiarFormularioProducto();
            await renderizarTablaProductos();
            
            if (tieneVariantes === 'SI' && resp.id) {
                if (confirm('¿Deseas agregar variantes (tallas/colores) ahora?')) {
                    setTimeout(() => abrirModalVariantes(resp.id), 300);
                }
            }
        } else {
            toast("❌ Error: " + (resp.error || "No se pudo guardar"));
        }
    } catch (error) {
        console.error("Error guardando producto:", error);
        toast("❌ Error al guardar el producto");
    } finally {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}
function limpiarFormularioProducto() {
    document.getElementById("prodNombre").value = '';
    document.getElementById("prodCategoria").value = '';
    document.getElementById("prodTipo").value = 'Hombre';
    document.getElementById("prodSKU").value = '';
    document.getElementById("prodPrecioCompra").value = '';
    document.getElementById("prodPrecio").value = '';
    document.getElementById("prodStock").value = '';
    document.getElementById("prodSucursal").value = '';
    document.getElementById("prodTieneVariantes").checked = false;
    document.getElementById("toggleLabel").textContent = 'No - Producto Simple';
    document.getElementById("toggleLabel").style.color = '#475569';
    
    // Limpiar imagen
    const preview = document.getElementById("prodPreview");
    const previewWrapper = document.getElementById("previewWrapper");
    const uploadEmpty = document.getElementById("uploadEmpty");
    const fileInput = document.getElementById("prodImagen");
    
    if (preview) preview.src = '';
    if (previewWrapper) previewWrapper.style.display = 'none';
    if (uploadEmpty) uploadEmpty.style.display = 'flex';
    if (fileInput) fileInput.value = '';
    
    // Reset margen preview
    document.getElementById("previewGanancia").textContent = 'S/ 0.00';
    document.getElementById("previewMargen").textContent = '0%';
}

function inicializarSKUAutomatico() {
    const inputNombre = document.getElementById('prodNombre');
    const inputCategoria = document.getElementById('prodCategoria');
    const inputSKU = document.getElementById('prodSKU');
    
    if (!inputNombre || !inputSKU) return;
    
    function generarSKU() {
        const nombre = inputNombre.value.trim();
        const categoria = inputCategoria ? inputCategoria.value.trim() : '';
        
        if (nombre.length >= 2) {
            // Limpiar y obtener primeras letras
            const nombreCode = nombre
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .substring(0, 3)
                .padEnd(3, 'X');
            
            const catCode = categoria
                ? categoria.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 3).padEnd(3, 'X')
                : 'GEN';
            
            // Número basado en timestamp para unicidad
            const num = String(Date.now()).slice(-3);
            
            inputSKU.value = `${nombreCode}-${catCode}-${num}`;
        } else {
            inputSKU.value = '';
        }
    }
    
    inputNombre.addEventListener('input', generarSKU);
    if (inputCategoria) {
        inputCategoria.addEventListener('input', generarSKU);
    }
}

async function eliminarProducto(id) {
    if (!confirm("¿Estás seguro de eliminar este producto?")) return;

    const resp = await apiCall({ action: "eliminarProducto", id });

    if (resp.success) {
        toast("✅ Producto eliminado");
        await renderizarTablaProductos();
    } else {
        toast("❌ Error al eliminar: " + (resp.error || ""));
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject("Error leyendo archivo");
        reader.readAsDataURL(file);
    });
}

// =======================================================
//  RENTABILIDAD
// =======================================================
async function inicializarRentabilidad() {
    await cargarSelectSucursales("filtroSucursal");
    await buscarRentabilidad();
    
    const btnBuscar = document.getElementById("btnBuscarRentabilidad");
    if (btnBuscar) btnBuscar.onclick = buscarRentabilidad;
}

async function buscarRentabilidad() {
    const periodo = document.getElementById("filtroPeriodo")?.value || 'mes';
    const sucursalId = document.getElementById("filtroSucursal")?.value || '';
    const fechaDesde = document.getElementById("filtroDesde")?.value;
    const fechaHasta = document.getElementById("filtroHasta")?.value;
    
    const { desde, hasta } = obtenerRangoFechas(periodo, fechaDesde, fechaHasta);
    
    const data = await apiCall({ 
        action: sucursalId ? "getVentasPorTienda" : "getVentasTotales",
        sucursalId 
    });
    
    if (!data.ventas) return;
    
    const ventasFiltradas = filtrarVentasPorFecha(data.ventas, desde, hasta);
    const resumen = calcularResumenRentabilidad(ventasFiltradas);
    
    // Actualizar KPIs
    document.getElementById("rentTotalVentas").textContent = `S/ ${resumen.ventas.toFixed(2)}`;
    document.getElementById("rentTotalCostos").textContent = `S/ ${resumen.costos.toFixed(2)}`;
    document.getElementById("rentGananciaBruta").textContent = `S/ ${resumen.ganancia.toFixed(2)}`;
    document.getElementById("rentMargenPromedio").textContent = `${resumen.margen.toFixed(1)}%`;
    
    // Gráfico de barras
    const pctCosto = resumen.ventas > 0 ? (resumen.costos / resumen.ventas) * 100 : 0;
    const pctGanancia = resumen.ventas > 0 ? (resumen.ganancia / resumen.ventas) * 100 : 0;
    
    document.getElementById("barCosto").style.width = `${pctCosto}%`;
    document.getElementById("barGanancia").style.width = `${Math.max(0, pctGanancia)}%`;
    document.getElementById("barCostoVal").textContent = `${pctCosto.toFixed(1)}%`;
    document.getElementById("barGananciaVal").textContent = `${pctGanancia.toFixed(1)}%`;
    
    // Rentabilidad por producto
    const productoStats = {};
    ventasFiltradas.forEach(v => {
        const pid = v.productoId;
        const producto = getProductoPorId(pid);
        if (!productoStats[pid]) {
            productoStats[pid] = { 
                cantidad: 0, 
                costoTotal: 0, 
                ventaTotal: 0, 
                ganancia: 0,
                precioCompra: producto?.precioCompra || 0,
                precioVenta: producto?.precioVenta || 0
            };
        }
        const rent = calcularRentabilidadVenta(v);
        productoStats[pid].cantidad += Number(v.cantidad) || 0;
        productoStats[pid].costoTotal += rent.costo;
        productoStats[pid].ventaTotal += rent.ventaTotal;
        productoStats[pid].ganancia += rent.ganancia;
    });
    
    const productosArray = Object.entries(productoStats)
        .map(([id, stats]) => ({
            id,
            ...stats,
            margen: stats.ventaTotal > 0 ? (stats.ganancia / stats.ventaTotal) * 100 : 0
        }))
        .sort((a, b) => b.ganancia - a.ganancia);
    
    // ✅ GUARDAR EN CACHE PARA EXPORTAR
    rentabilidadCache = productosArray.map(p => ({
        codigo: p.id,
        producto: getNombreProducto(p.id),
        cantidadVendida: p.cantidad,
        precioCompra: p.precioCompra,
        precioVenta: p.precioVenta,
        costos: p.costoTotal,
        ingresos: p.ventaTotal,
        ganancia: p.ganancia,
        margen: p.margen
    }));
    
    const tbodyProd = document.getElementById("tablaRentabilidadProductos");
    if (tbodyProd) {
        tbodyProd.innerHTML = productosArray.map(p => `
            <tr>
                <td><code>${p.id}</code></td>
                <td>${getNombreProducto(p.id)}</td>
                <td>${p.cantidad}</td>
                <td>S/ ${p.precioCompra.toFixed(2)}</td>
                <td>S/ ${p.precioVenta.toFixed(2)}</td>
                <td>S/ ${p.costoTotal.toFixed(2)}</td>
                <td>S/ ${p.ventaTotal.toFixed(2)}</td>
                <td class="${getGananciaClass(p.ganancia)}">S/ ${p.ganancia.toFixed(2)}</td>
                <td><span class="margen-badge ${getMargenClass(p.margen)}">${p.margen.toFixed(1)}%</span></td>
            </tr>
        `).join("");
    }
    
    // Rentabilidad por sucursal
    const sucursalStats = {};
    ventasFiltradas.forEach(v => {
        const sid = v.sucursalId || 'sin-sucursal';
        if (!sucursalStats[sid]) {
            sucursalStats[sid] = { ventas: 0, costos: 0, ganancia: 0, transacciones: 0 };
        }
        const rent = calcularRentabilidadVenta(v);
        sucursalStats[sid].ventas += rent.ventaTotal;
        sucursalStats[sid].costos += rent.costo;
        sucursalStats[sid].ganancia += rent.ganancia;
        sucursalStats[sid].transacciones++;
    });
    
    const sucursalesArray = Object.entries(sucursalStats)
        .map(([id, stats]) => ({
            id,
            ...stats,
            margen: stats.ventas > 0 ? (stats.ganancia / stats.ventas) * 100 : 0
        }))
        .sort((a, b) => b.ganancia - a.ganancia);
    
    const tbodySuc = document.getElementById("tablaRentabilidadSucursales");
    if (tbodySuc) {
        tbodySuc.innerHTML = sucursalesArray.map(s => `
            <tr>
                <td>${getNombreSucursal(s.id)}</td>
                <td>S/ ${s.ventas.toFixed(2)}</td>
                <td>S/ ${s.costos.toFixed(2)}</td>
                <td class="${getGananciaClass(s.ganancia)}">S/ ${s.ganancia.toFixed(2)}</td>
                <td><span class="margen-badge ${getMargenClass(s.margen)}">${s.margen.toFixed(1)}%</span></td>
                <td>${s.transacciones}</td>
            </tr>
        `).join("");
    }
}

// =======================================================
//  USUARIOS
// =======================================================
async function inicializarUsuarios() {
    await cargarSelectSucursales("userSucursal");

    const data = await apiCall({ action: "getUsuarios" });
    usuariosCache = data.usuarios || [];
    
    const tbody = document.getElementById("tablaUsuarios");
    if (tbody && data.usuarios) {
        tbody.innerHTML = data.usuarios.map(u => {
            const esActivo = u.estado === 'ACTIVO';
            const badgeEstado = esActivo 
                ? '<span class="badge-estado badge-activo">Activo</span>'
                : '<span class="badge-estado badge-inactivo">Inactivo</span>';
            
            const btnToggle = esActivo
                ? `<button class="btn-action btn-toggle-activo" onclick="toggleEstadoUsuario('${u.id}', 'INACTIVO')" title="Desactivar">🚫</button>`
                : `<button class="btn-action btn-toggle-inactivo" onclick="toggleEstadoUsuario('${u.id}', 'ACTIVO')" title="Activar">✅</button>`;
            
            return `
                <tr class="${!esActivo ? 'usuario-inactivo' : ''}">
                    <td>${u.id}</td>
                    <td>${u.nombre}</td>
                    <td>${u.email}</td>
                    <td><span class="badge ${u.rol === 'ADMIN' ? 'badge-admin' : 'badge-empleado'}">${u.rol}</span></td>
                    <td>${getNombreSucursal(u.sucursalId)}</td>
                    <td>${badgeEstado}</td>
                    <td>
                        <button class="btn-action btn-edit" onclick="editarUsuario('${u.id}')" title="Editar">✏️</button>
                        ${btnToggle}
                    </td>
                </tr>
            `;
        }).join("");
    }

    const btn = document.getElementById("btnGuardarUsuario");
    if (btn) {
        btn.onclick = async () => {
            const nombre = document.getElementById("userNombre").value.trim();
            const email = document.getElementById("userEmail").value.trim();
            const password = document.getElementById("userPassword").value;
            const rol = document.getElementById("userRol").value;
            const sucursalId = document.getElementById("userSucursal").value;

            if (!nombre || !email || !password) {
                toast("❌ Completa todos los campos requeridos");
                return;
            }

            const resp = await apiCall({ action: "crearUsuario", nombre, email, password, rol, sucursalId });

            if (resp.success) {
                toast("✅ Usuario creado");
                ['userNombre', 'userEmail', 'userPassword'].forEach(id => document.getElementById(id).value = '');
                document.getElementById("userRol").value = "EMPLEADO";
                document.getElementById("userSucursal").value = "";
                inicializarUsuarios();
            } else {
                toast("❌ Error: " + (resp.error || ""));
            }
        };
    }
}

// Toggle estado de usuario (Activar/Desactivar)
window.toggleEstadoUsuario = async function(id, nuevoEstado) {
    const accion = nuevoEstado === 'ACTIVO' ? 'activar' : 'desactivar';
    
    if (!confirm(`¿Estás seguro de ${accion} este usuario?`)) return;
    
    try {
        const resp = await apiCall({
            action: 'actualizarUsuario',
            id: id,
            estado: nuevoEstado
        });
        
        if (resp.success) {
            toast(nuevoEstado === 'ACTIVO' ? '✅ Usuario activado' : '🚫 Usuario desactivado');
            inicializarUsuarios();
        } else {
            toast('❌ Error: ' + (resp.error || 'No se pudo actualizar'));
        }
    } catch (error) {
        console.error('Error:', error);
        toast('❌ Error al actualizar usuario');
    }
};

// Editar usuario (placeholder - puedes expandir)
window.editarUsuario = function(id) {
    const usuario = usuariosCache.find(u => String(u.id) === String(id));
    if (!usuario) {
        toast('❌ Usuario no encontrado');
        return;
    }
    
    // Por ahora solo muestra info, puedes agregar modal de edición después
    toast(`📝 Editar: ${usuario.nombre}`);
};

// =======================================================
//  SUCURSALES
// =======================================================
async function inicializarSucursales() {
    const data = await apiCall({ action: "getSucursales" });
    sucursalesCache = data.sucursales || [];
    
    const tbody = document.getElementById("tablaSucursales");
    if (tbody && data.sucursales) {
        tbody.innerHTML = data.sucursales.map(s => `
            <tr>
                <td>${s.id}</td>
                <td>${s.nombre}</td>
                <td>${s.direccion || '-'}</td>
                <td>${s.telefono || '-'}</td>
            </tr>
        `).join("");
    }

    const btn = document.getElementById("btnGuardarSucursal");
    if (btn) {
        btn.onclick = async () => {
            const nombre = document.getElementById("sucNombre").value.trim();
            if (!nombre) {
                toast("❌ El nombre es requerido");
                return;
            }

            const resp = await apiCall({
                action: "crearSucursal",
                nombre,
                direccion: document.getElementById("sucDireccion").value,
                telefono: document.getElementById("sucTelefono").value
            });

            if (resp.success) {
                toast("✅ Sucursal guardada");
                ['sucNombre', 'sucDireccion', 'sucTelefono'].forEach(id => document.getElementById(id).value = '');
                await cargarCaches();
                inicializarSucursales();
            } else {
                toast("❌ Error: " + (resp.error || ""));
            }
        };
    }
}

// =======================================================
//  VENTAS (TOTALES, TIENDA, EMPLEADO)
// =======================================================
async function inicializarVentasTotales() {
    await buscarVentasTotales();
    const btnBuscar = document.getElementById("btnBuscarVentas");
    if (btnBuscar) btnBuscar.onclick = buscarVentasTotales;
}

async function buscarVentasTotales() {
    const periodo = document.getElementById("filtroPeriodo")?.value || 'mes';
    const fechaDesde = document.getElementById("filtroDesde")?.value;
    const fechaHasta = document.getElementById("filtroHasta")?.value;

    const { desde, hasta } = obtenerRangoFechas(periodo, fechaDesde, fechaHasta);
    const data = await apiCall({ action: "getVentasTotales" });

    if (!data || !Array.isArray(data.ventas)) return;

    const ventasFiltradas = filtrarVentasPorFecha(data.ventas, desde, hasta);
    const resumen = calcularResumenRentabilidad(ventasFiltradas);

    // 🟢 KPIs seguros
    document.getElementById("resumenTotal").textContent =
        `S/ ${(Number(resumen.ventas) || 0).toFixed(2)}`;

    document.getElementById("resumenCantidad").textContent =
        `${Number(resumen.cantidad) || 0} unidades`;

    document.getElementById("resumenTransacciones").textContent =
        Number(resumen.transacciones) || 0;

    const tbody = document.getElementById("tablaVentasTotales");
    if (!tbody) return;

    tbody.innerHTML = ventasFiltradas.reverse().map(v => {
        const rent = calcularRentabilidadVenta(v);

        const ventaTotal = Number(rent?.ventaTotal) || 0;
        const cantidad = Number(v?.cantidad) || 0;

        return `
            <tr>
                <td>${formatearFecha(v?.fechaISO)}</td>
                <td>${getNombreSucursal(v?.sucursalId)}</td>
                <td>${getNombreEmpleado(v?.empleadoId)}</td>
                <td><code>${v?.productoId ?? '-'}</code></td>
                <td>${getNombreProducto(v?.productoId)}</td>
                <td>${cantidad}</td>
                <td><strong>S/ ${ventaTotal.toFixed(2)}</strong></td>
            </tr>
        `;
    }).join("");
}


async function inicializarVentasPorTienda() {
    const sel = document.getElementById("filtroSucursal");
    if (sel) {
        sel.innerHTML = `<option value="">Todas las sucursales</option>` +
            sucursalesCache.map(s => `<option value="${s.id}">${s.nombre}</option>`).join("");
    }
    await buscarVentasTienda();
    const btnBuscar = document.getElementById("btnBuscarVentas");
    if (btnBuscar) btnBuscar.onclick = buscarVentasTienda;
}

async function buscarVentasTienda() {
    const sucursalId = document.getElementById("filtroSucursal")?.value || '';
    const periodo = document.getElementById("filtroPeriodo")?.value || 'mes';
    const fechaDesde = document.getElementById("filtroDesde")?.value;
    const fechaHasta = document.getElementById("filtroHasta")?.value;
    
    const { desde, hasta } = obtenerRangoFechas(periodo, fechaDesde, fechaHasta);
    const data = await apiCall({ 
        action: sucursalId ? "getVentasPorTienda" : "getVentasTotales",
        sucursalId 
    });
    
    if (!data.ventas) return;
    
    const ventasFiltradas = filtrarVentasPorFecha(data.ventas, desde, hasta);
    
    // ✅ GUARDAR EN CACHE PARA EXPORTAR
    ventasTiendaCache = ventasFiltradas.map(v => ({
        fecha: v.fechaISO,
        sucursalNombre: getNombreSucursal(v.sucursalId),
        empleadoNombre: getNombreEmpleado(v.empleadoId),
        codigo: v.productoId,
        producto: getNombreProducto(v.productoId),
        cantidad: v.cantidad,
        total: v.total
    }));
    
    const resumen = calcularResumenRentabilidad(ventasFiltradas);
    
    document.getElementById("resumenTotal").textContent = `S/ ${resumen.ventas.toFixed(2)}`;
    document.getElementById("resumenCantidad").textContent = `${resumen.cantidad} unidades`;
    document.getElementById("resumenTransacciones").textContent = resumen.transacciones;
    
    const tbody = document.getElementById("tablaVentasTienda");
    if (tbody) {
        tbody.innerHTML = ventasFiltradas.reverse().map(v => `
            <tr>
                <td>${formatearFecha(v.fechaISO)}</td>
                <td>${getNombreSucursal(v.sucursalId)}</td>
                <td>${getNombreEmpleado(v.empleadoId)}</td>
                <td><code>${v.productoId}</code></td>
                <td>${getNombreProducto(v.productoId)}</td>
                <td>${v.cantidad}</td>
                <td><strong>S/ ${v.total}</strong></td>
            </tr>
        `).join("");
    }
}

async function inicializarVentasPorEmpleado() {
    await cargarSelectEmpleados("filtroEmpleado", true);
    await buscarVentasEmpleado();
    const btnBuscar = document.getElementById("btnBuscarVentas");
    if (btnBuscar) btnBuscar.onclick = buscarVentasEmpleado;
}

async function buscarVentasEmpleado() {
    const empleadoId = document.getElementById("filtroEmpleado")?.value || '';
    const periodo = document.getElementById("filtroPeriodo")?.value || 'mes';
    const fechaDesde = document.getElementById("filtroDesde")?.value;
    const fechaHasta = document.getElementById("filtroHasta")?.value;
    
    const { desde, hasta } = obtenerRangoFechas(periodo, fechaDesde, fechaHasta);
    const data = await apiCall({ 
        action: empleadoId ? "getVentasPorEmpleado" : "getVentasTotales",
        empleadoId 
    });
    
    if (!data.ventas) return;
    
    const ventasFiltradas = filtrarVentasPorFecha(data.ventas, desde, hasta);
    const resumen = calcularResumenRentabilidad(ventasFiltradas);
    
    document.getElementById("resumenTotal").textContent = `S/ ${resumen.ventas.toFixed(2)}`;
    document.getElementById("resumenCantidad").textContent = `${resumen.cantidad} unidades`;
    document.getElementById("resumenTransacciones").textContent = resumen.transacciones;
    
    const tbody = document.getElementById("tablaVentasEmpleado");
    if (tbody) {
        tbody.innerHTML = ventasFiltradas.reverse().map(v => `
            <tr>
                <td>${formatearFecha(v.fechaISO)}</td>
                <td>${getNombreEmpleado(v.empleadoId)}</td>
                <td>${getNombreSucursal(v.sucursalId)}</td>
                <td><code>${v.productoId}</code></td>
                <td>${getNombreProducto(v.productoId)}</td>
                <td>${v.cantidad}</td>
                <td><strong>S/ ${v.total}</strong></td>
            </tr>
        `).join("");
    }
}

// =======================================================
//  ALERTAS STOCK
// =======================================================
async function inicializarAlertasStock() {
    const data = await apiCall({ action: "getAlertasStock" });
    const tbody = document.getElementById("tablaStockBajo");
    if (tbody && data.productos) {
        tbody.innerHTML = data.productos.map(p => `
            <tr>
                <td>${p.id}</td>
                <td>${p.nombre}</td>
                <td><span class="stock-bajo">${p.stock}</span></td>
                <td>${getNombreSucursal(p.sucursalId)}</td>
            </tr>
        `).join("");
    }
}

// =======================================================
//  CONFIGURACIÓN
// =======================================================
async function inicializarConfiguracion() {
    const data = await apiCall({ action: "getConfig" });
    const stockMin = document.getElementById("stockMinimo");
    const nombreTienda = document.getElementById("nombreTienda");

    if (stockMin) stockMin.value = data.config?.stockMinimo || "";
    if (nombreTienda) nombreTienda.value = data.config?.nombreTienda || "";

    const btn = document.getElementById("btnGuardarConfig");
    if (btn) {
        btn.onclick = async () => {
            const resp = await apiCall({
                action: "guardarConfig",
                config: {
                    stockMinimo: document.getElementById("stockMinimo").value,
                    nombreTienda: document.getElementById("nombreTienda").value
                }
            });
            toast(resp.success ? "✅ Configuración guardada" : "❌ Error al guardar");
        };
    }
}
// =======================================================
//  CATÁLOGO DE PRODUCTOS - FUNCIONES
//  Agregar estas funciones al final de admin.js
// =======================================================

// Variables para el catálogo
let catalogoProductos = [];
let catalogoFiltrado = [];
let vistaActual = 'grid';

// Inicializar catálogo (admin ve todo, empleado solo su sucursal)
async function inicializarCatalogo() {
    const loading = document.getElementById('loadingState');
    const catalogo = document.getElementById('catalogoProductos');
    const empty = document.getElementById('emptyState');
    
    if (loading) loading.style.display = 'block';
    if (catalogo) catalogo.style.display = 'none';
    if (empty) empty.style.display = 'none';

    try {
        // Obtener usuario actual
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const esAdmin = user?.rol === 'ADMIN';

        // Cargar productos según rol
        let data;
        if (esAdmin) {
            data = await apiCall({ action: 'getProductos' });
            // Mostrar filtro de sucursal solo para admin
            const filtroSucContainer = document.getElementById('filtroSucursalContainer');
            if (filtroSucContainer) filtroSucContainer.style.display = 'flex';
            
            // Cargar select de sucursales
            await cargarFiltroSucursales();
        } else {
            // Empleado: solo productos de su sucursal
            data = await apiCall({ 
                action: 'getProductosPorSucursal', 
                sucursalId: user?.sucursalId 
            });
            // Ocultar filtro de sucursal para empleado
            const filtroSucContainer = document.getElementById('filtroSucursalContainer');
            if (filtroSucContainer) filtroSucContainer.style.display = 'none';
        }

        catalogoProductos = data.productos || [];
        catalogoFiltrado = [...catalogoProductos];

        // Cargar filtros de categoría y tipo
        cargarFiltrosCatalogo();

        // Renderizar catálogo
        renderizarCatalogo();

        // Configurar eventos de filtros
        configurarEventosCatalogo();

    } catch (error) {
        console.error('Error cargando catálogo:', error);
        toast('❌ Error al cargar el catálogo');
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

// Cargar select de sucursales (solo admin)
async function cargarFiltroSucursales() {
    const select = document.getElementById('filtroSucursal');
    if (!select) return;

    if (sucursalesCache.length === 0) {
        const data = await apiCall({ action: 'getSucursales' });
        sucursalesCache = data.sucursales || [];
    }

    select.innerHTML = '<option value="">Todas las sucursales</option>' +
        sucursalesCache.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
}

// Cargar filtros de categoría y tipo únicos
function cargarFiltrosCatalogo() {
    const categorias = [...new Set(catalogoProductos.map(p => p.categoria).filter(Boolean))];
    const tipos = [...new Set(catalogoProductos.map(p => p.tipo).filter(Boolean))];

    const selectCategoria = document.getElementById('filtroCategoria');
    const selectTipo = document.getElementById('filtroTipo');

    if (selectCategoria) {
        selectCategoria.innerHTML = '<option value="">Todas</option>' +
            categorias.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    if (selectTipo) {
        selectTipo.innerHTML = '<option value="">Todos</option>' +
            tipos.map(t => `<option value="${t}">${t}</option>`).join('');
    }
}

// Configurar eventos de filtros
function configurarEventosCatalogo() {
    // Filtro de búsqueda (con debounce)
    const inputBusqueda = document.getElementById('filtroBusqueda');
    let timeoutBusqueda;
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', () => {
            clearTimeout(timeoutBusqueda);
            timeoutBusqueda = setTimeout(aplicarFiltrosCatalogo, 300);
        });
    }

    // Filtros select
    ['filtroSucursal', 'filtroCategoria', 'filtroTipo', 'filtroOrden'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', aplicarFiltrosCatalogo);
        }
    });

    // Botón limpiar filtros
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFiltrosCatalogo);
    }

    // Botones de vista
    const btnGrid = document.getElementById('btnVistaGrid');
    const btnLista = document.getElementById('btnVistaLista');
    
    if (btnGrid) {
        btnGrid.addEventListener('click', () => cambiarVistaCatalogo('grid'));
    }
    if (btnLista) {
        btnLista.addEventListener('click', () => cambiarVistaCatalogo('lista'));
    }

    // Modal producto
    const modalClose = document.getElementById('modalProductoClose');
    const modal = document.getElementById('modalProducto');
    
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }
}

// Aplicar filtros
function aplicarFiltrosCatalogo() {
    const busqueda = document.getElementById('filtroBusqueda')?.value.toLowerCase().trim() || '';
    const sucursal = document.getElementById('filtroSucursal')?.value || '';
    const categoria = document.getElementById('filtroCategoria')?.value || '';
    const tipo = document.getElementById('filtroTipo')?.value || '';
    const orden = document.getElementById('filtroOrden')?.value || 'nombre-asc';

    // Filtrar
    catalogoFiltrado = catalogoProductos.filter(p => {
        // Búsqueda por nombre
        if (busqueda && !p.nombre.toLowerCase().includes(busqueda)) {
            return false;
        }
        // Filtro por sucursal
        if (sucursal && String(p.sucursalId) !== String(sucursal)) {
            return false;
        }
        // Filtro por categoría
        if (categoria && p.categoria !== categoria) {
            return false;
        }
        // Filtro por tipo
        if (tipo && p.tipo !== tipo) {
            return false;
        }
        return true;
    });

    // Ordenar
    const [campo, direccion] = orden.split('-');
    catalogoFiltrado.sort((a, b) => {
        let valA, valB;
        
        if (campo === 'nombre') {
            valA = a.nombre.toLowerCase();
            valB = b.nombre.toLowerCase();
        } else if (campo === 'precio') {
            valA = Number(a.precioVenta) || 0;
            valB = Number(b.precioVenta) || 0;
        } else if (campo === 'stock') {
            valA = Number(a.stock) || 0;
            valB = Number(b.stock) || 0;
        }
        
        if (direccion === 'asc') {
            return valA > valB ? 1 : -1;
        } else {
            return valA < valB ? 1 : -1;
        }
    });

    // Actualizar chips de filtros activos
    actualizarChipsFiltros(busqueda, sucursal, categoria, tipo);

    // Renderizar
    renderizarCatalogo();
}

// Actualizar chips de filtros activos
function actualizarChipsFiltros(busqueda, sucursal, categoria, tipo) {
    const container = document.getElementById('filtrosActivos');
    if (!container) return;

    let chips = [];

    if (busqueda) {
        chips.push(`<span class="filtro-chip">🔍 "${busqueda}" <button onclick="quitarFiltro('busqueda')">✕</button></span>`);
    }
    if (sucursal) {
        const nombreSuc = getNombreSucursal(sucursal);
        chips.push(`<span class="filtro-chip">🏬 ${nombreSuc} <button onclick="quitarFiltro('sucursal')">✕</button></span>`);
    }
    if (categoria) {
        chips.push(`<span class="filtro-chip">📁 ${categoria} <button onclick="quitarFiltro('categoria')">✕</button></span>`);
    }
    if (tipo) {
        chips.push(`<span class="filtro-chip">👔 ${tipo} <button onclick="quitarFiltro('tipo')">✕</button></span>`);
    }

    container.innerHTML = chips.join('');
}

// Quitar filtro individual
function quitarFiltro(tipo) {
    switch(tipo) {
        case 'busqueda':
            document.getElementById('filtroBusqueda').value = '';
            break;
        case 'sucursal':
            document.getElementById('filtroSucursal').value = '';
            break;
        case 'categoria':
            document.getElementById('filtroCategoria').value = '';
            break;
        case 'tipo':
            document.getElementById('filtroTipo').value = '';
            break;
    }
    aplicarFiltrosCatalogo();
}

// Limpiar todos los filtros
function limpiarFiltrosCatalogo() {
    document.getElementById('filtroBusqueda').value = '';
    const filtroSucursal = document.getElementById('filtroSucursal');
    if (filtroSucursal) filtroSucursal.value = '';
    document.getElementById('filtroCategoria').value = '';
    document.getElementById('filtroTipo').value = '';
    document.getElementById('filtroOrden').value = 'nombre-asc';
    
    aplicarFiltrosCatalogo();
}

// Cambiar vista grid/lista
function cambiarVistaCatalogo(vista) {
    vistaActual = vista;
    const catalogo = document.getElementById('catalogoProductos');
    const btnGrid = document.getElementById('btnVistaGrid');
    const btnLista = document.getElementById('btnVistaLista');

    if (vista === 'grid') {
        catalogo.classList.remove('vista-lista');
        btnGrid.classList.add('active');
        btnLista.classList.remove('active');
    } else {
        catalogo.classList.add('vista-lista');
        btnLista.classList.add('active');
        btnGrid.classList.remove('active');
    }
}

// Renderizar catálogo
function renderizarCatalogo() {
    const catalogo = document.getElementById('catalogoProductos');
    const empty = document.getElementById('emptyState');
    const contador = document.getElementById('contadorResultados');

    if (!catalogo) return;

    // Actualizar contador
    if (contador) {
        contador.textContent = `${catalogoFiltrado.length} producto${catalogoFiltrado.length !== 1 ? 's' : ''}`;
    }

    // Estado vacío
    if (catalogoFiltrado.length === 0) {
        catalogo.style.display = 'none';
        if (empty) empty.style.display = 'block';
        return;
    }

    catalogo.style.display = 'grid';
    if (empty) empty.style.display = 'none';

    // Renderizar productos
    catalogo.innerHTML = catalogoFiltrado.map(p => {
        const stock = Number(p.stock) || 0;
        let stockClass = '';
        let stockBadge = '';
        
        if (stock === 0) {
            stockClass = 'agotado';
            stockBadge = '<span class="producto-badge sin-stock">Agotado</span>';
        } else if (stock <= 5) {
            stockClass = 'bajo';
            stockBadge = '<span class="producto-badge stock-bajo">Stock bajo</span>';
        }

        // ✅ CONVERTIR URL DE GOOGLE DRIVE
        const imagenUrl = convertirUrlGoogleDrive(p.imagenUrl);
        
        const imagen = imagenUrl
            ? `<img src="${imagenUrl}" alt="${p.nombre}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'producto-imagen-placeholder\\'>👔</div>'">`
            : '<div class="producto-imagen-placeholder">👔</div>';

        return `
            <div class="producto-card" onclick="verDetalleProducto('${p.id}')">
                <div class="producto-imagen">
                    ${imagen}
                    ${stockBadge}
                </div>
                <div class="producto-info">
                    <div class="producto-categoria">${p.categoria || 'Sin categoría'}</div>
                    <h3 class="producto-nombre">${p.nombre}</h3>
                    <div class="producto-tipo">${p.tipo || '-'}</div>
                    <div class="producto-footer">
                        <span class="producto-precio">S/ ${Number(p.precioVenta || 0).toFixed(2)}</span>
                        <span class="producto-stock ${stockClass}">${stock} uds</span>
                    </div>
                    <div class="producto-sucursal">📍 ${getNombreSucursal(p.sucursalId)}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Ver detalle de producto en modal
function verDetalleProducto(id) {
    productoActualId = id;
    
    const producto = catalogoProductos.find(p => String(p.id) === String(id));
    if (!producto) return;

    const modal = document.getElementById('modalProducto');
    const stock = Number(producto.stock) || 0;
    let stockClass = 'disponible';
    if (stock === 0) stockClass = 'agotado';
    else if (stock <= 5) stockClass = 'bajo';

    // ✅ CONVERTIR URL DE GOOGLE DRIVE
    const imagenUrl = convertirUrlGoogleDrive(producto.imagenUrl);

    // Llenar datos del modal
    const modalImagen = document.getElementById('modalImagen');
    if (modalImagen) {
        modalImagen.src = imagenUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text y=".9em" font-size="50" x="25">👔</text></svg>';
        modalImagen.onerror = function() {
            this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text y=".9em" font-size="50" x="25">👔</text></svg>';
        };
    }
    
    document.getElementById('modalCategoria').textContent = producto.categoria || 'Sin categoría';
    document.getElementById('modalNombre').textContent = producto.nombre;
    document.getElementById('modalTipo').textContent = producto.tipo || '-';
    document.getElementById('modalPrecio').textContent = `S/ ${Number(producto.precioVenta).toFixed(2)}`;
    
    // Precio compra y margen
    const precioCompra = Number(producto.precioCompra) || 0;
    const precioVenta = Number(producto.precioVenta) || 0;
    const margen = precioVenta > 0 ? ((precioVenta - precioCompra) / precioVenta * 100).toFixed(1) : 0;
    
    const modalPrecioCompra = document.getElementById('modalPrecioCompra');
    if (modalPrecioCompra) modalPrecioCompra.textContent = `S/ ${precioCompra.toFixed(2)}`;
    
    const modalMargen = document.getElementById('modalMargen');
    if (modalMargen) modalMargen.textContent = `${margen}%`;
    
    const stockEl = document.getElementById('modalStock');
    stockEl.textContent = stock === 0 ? 'Agotado' : `${stock} unidades disponibles`;
    stockEl.className = `stock-valor ${stockClass}`;
    
    document.getElementById('modalSucursal').textContent = getNombreSucursal(producto.sucursalId);
    document.getElementById('modalCodigo').textContent = producto.sku || producto.id;

    // ✅ MOSTRAR ESTADO DE VARIANTES
    const tieneVariantes = producto.tieneVariantes === 'SI';
    const modalTieneVariantes = document.getElementById('modalTieneVariantes');
    if (modalTieneVariantes) {
        modalTieneVariantes.textContent = tieneVariantes ? 'Sí' : 'No';
        modalTieneVariantes.style.color = tieneVariantes ? '#10b981' : '#64748b';
    }
    
    // ✅ GUARDAR PRODUCTO ACTUAL PARA VARIANTES
    productoModalActual = producto;
    
    // ✅ CARGAR VARIANTES SI TIENE
    const variantesSection = document.getElementById('modalVariantesSection');
    if (variantesSection) {
        if (tieneVariantes) {
            variantesSection.style.display = 'block';
            cargarVariantesModal(producto.id);
        } else {
            variantesSection.style.display = 'none';
        }
    }

    modal.classList.add('active');
}
// Variable para producto actual en modal catálogo
let productoModalActual = null;
let variantesModalActuales = [];

// Cargar variantes en el modal del catálogo
async function cargarVariantesModal(productoId) {
    const section = document.getElementById('modalVariantesSection');
    const lista = document.getElementById('variantesListaModal');
    
    if (!section || !lista) return;
    
    if (!productoModalActual || productoModalActual.tieneVariantes !== 'SI') {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    lista.innerHTML = '<div class="variantes-empty">Cargando...</div>';
    
    try {
        const resp = await apiCall({ action: 'getVariantesPorProducto', productoId: productoId });
        variantesModalActuales = (resp.variantes || []).filter(v => v.estado !== 'INACTIVO');
        
        renderizarVariantesModal();
    } catch (error) {
        lista.innerHTML = '<div class="variantes-empty">Error al cargar</div>';
    }
}

// Renderizar lista de variantes en modal
function renderizarVariantesModal() {
    const lista = document.getElementById('variantesListaModal');
    if (!lista) return;
    
    if (variantesModalActuales.length === 0) {
        lista.innerHTML = '<div class="variantes-empty">📭 No hay variantes registradas</div>';
        return;
    }
    
    let stockTotal = 0;
    
    const html = variantesModalActuales.map(v => {
        const stock = Number(v.stock) || 0;
        stockTotal += stock;
        
        let stockClass = '';
        if (stock === 0) stockClass = 'agotado';
        else if (stock <= 3) stockClass = 'bajo';
        
        return `
            <div class="variante-item-modal">
                <div class="variante-color-dot" style="background: ${getColorHex(v.color)};"></div>
                <div class="variante-detalle">
                    <span class="variante-talla-label">${v.talla}</span>
                    <span class="variante-color-label">${v.color}</span>
                </div>
                <span class="variante-stock-badge ${stockClass}">${stock} uds</span>
            </div>
        `;
    }).join('');
    
    lista.innerHTML = html + `
        <div class="variantes-resumen">
            <span>Total variantes: <strong>${variantesModalActuales.length}</strong></span>
            <span>Stock total: <strong>${stockTotal} unidades</strong></span>
        </div>
    `;
}
// Editar stock de variante desde modal
async function editarStockVarianteModal(id, stockActual) {
    const nuevoStock = prompt(`Stock actual: ${stockActual}\nNuevo stock:`, stockActual);
    if (nuevoStock === null) return;
    
    try {
        const resp = await apiCall({
            action: 'actualizarVariante',
            id: id,
            stock: Number(nuevoStock) || 0
        });
        
        if (resp.success) {
            toast('✅ Stock actualizado');
            await cargarVariantesModal(productoModalActual.id);
        }
    } catch (error) {
        toast('❌ Error');
    }
}

// Eliminar variante desde modal
async function eliminarVarianteModal(id) {
    if (!confirm('¿Eliminar esta variante?')) return;
    
    try {
        const resp = await apiCall({
            action: 'actualizarVariante',
            id: id,
            estado: 'INACTIVO'
        });
        
        if (resp.success) {
            toast('🗑️ Variante eliminada');
            await cargarVariantesModal(productoModalActual.id);
        }
    } catch (error) {
        toast('❌ Error');
    }
}
// =======================================================
//  FUNCIONES PARA NOTA DE VENTA PDF Y EXPORTAR EXCEL
//  Agregar al final de empleado.js y admin.js
// =======================================================

// Variable para guardar datos de la última venta
let ultimaVenta = null;

// =======================================================
//  GENERAR NOTA DE VENTA (después de registrar venta)
// =======================================================

function mostrarNotaVenta(datosVenta) {
    ultimaVenta = datosVenta;
    
    const modal = document.getElementById('modalNotaVenta');
    if (!modal) return;
    
    // Llenar datos de la nota
    document.getElementById('notaNumero').textContent = datosVenta.numeroNota || generarNumeroNota();
    document.getElementById('notaFecha').textContent = formatearFechaHora(new Date());
    document.getElementById('notaSucursal').textContent = datosVenta.sucursalNombre || '-';
    document.getElementById('notaVendedor').textContent = datosVenta.vendedorNombre || '-';
    
    // Producto
    const tbody = document.getElementById('notaProductos');
    tbody.innerHTML = `
        <tr>
            <td>${datosVenta.productoNombre}</td>
            <td>${datosVenta.cantidad}</td>
            <td>S/ ${datosVenta.precioUnitario.toFixed(2)}</td>
            <td>S/ ${datosVenta.total.toFixed(2)}</td>
        </tr>
    `;
    
    // Totales
    document.getElementById('notaSubtotal').textContent = `S/ ${datosVenta.total.toFixed(2)}`;
    document.getElementById('notaTotal').textContent = `S/ ${datosVenta.total.toFixed(2)}`;
    document.getElementById('notaMetodoPago').textContent = datosVenta.metodoPago || 'EFECTIVO';
    
    // Nombre de la tienda (si existe en config)
    const nombreTienda = localStorage.getItem('nombreTienda') || 'Tienda de Ropa';
    document.getElementById('notaTienda').textContent = nombreTienda;
    
    // Mostrar modal
    modal.classList.add('active');
    
    // Eventos de botones
    document.getElementById('btnCerrarNota').onclick = () => modal.classList.remove('active');
    document.getElementById('btnDescargarPDF').onclick = descargarNotaPDF;
    document.getElementById('btnImprimirNota').onclick = imprimirNota;
}

function generarNumeroNota() {
    const fecha = new Date();
    const año = fecha.getFullYear().toString().slice(-2);
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `NV${año}${mes}${dia}-${random}`;
}

function formatearFechaHora(fecha) {
    return fecha.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// =======================================================
//  DESCARGAR NOTA DE VENTA COMO PDF
// =======================================================

function descargarNotaPDF() {
    const contenido = document.getElementById('notaVentaContent');
    if (!contenido) return;
    
    // Crear ventana para imprimir/guardar como PDF
    const ventana = window.open('', '_blank');
    
    ventana.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Nota de Venta - ${ultimaVenta?.numeroNota || ''}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Courier New', monospace;
                    padding: 20px;
                    max-width: 300px;
                    margin: 0 auto;
                }
                .nota-header { text-align: center; margin-bottom: 20px; }
                .nota-logo { font-size: 40px; }
                .nota-titulo { font-size: 16px; font-weight: bold; letter-spacing: 2px; margin: 8px 0; }
                .nota-subtitulo { font-size: 11px; color: #666; }
                .nota-info { margin-bottom: 15px; }
                .nota-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
                .nota-row span { color: #666; }
                .nota-divider { border-top: 2px dashed #ccc; margin: 15px 0; }
                .nota-tabla { width: 100%; font-size: 11px; border-collapse: collapse; }
                .nota-tabla th { text-align: left; padding: 6px 2px; border-bottom: 1px solid #ddd; font-size: 9px; }
                .nota-tabla td { padding: 6px 2px; }
                .nota-tabla td:last-child { text-align: right; font-weight: bold; }
                .nota-totales { margin-top: 15px; }
                .nota-total-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 5px; }
                .nota-total-final { font-size: 16px; font-weight: bold; padding-top: 8px; border-top: 2px solid #000; margin-top: 8px; }
                .nota-footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 2px dashed #ccc; }
                .nota-footer p { font-size: 12px; font-weight: bold; }
                .nota-footer small { font-size: 9px; color: #999; }
                @media print {
                    body { padding: 10px; }
                    @page { size: 80mm auto; margin: 0; }
                }
            </style>
        </head>
        <body>
            ${contenido.innerHTML}
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            </script>
        </body>
        </html>
    `);
    
    ventana.document.close();
}

// =======================================================
//  IMPRIMIR NOTA DE VENTA
// =======================================================

function imprimirNota() {
    descargarNotaPDF(); // Usa el mismo método
}

// =======================================================
//  EXPORTAR REPORTES A EXCEL
// =======================================================

function exportarExcel(datos, nombreArchivo, columnas) {
    if (!datos || datos.length === 0) {
        toast('❌ No hay datos para exportar');
        return;
    }
    
    // Crear contenido CSV con BOM para caracteres especiales
    let csv = '\uFEFF'; // BOM para UTF-8
    
    // Separador para Excel en Latinoamérica
    const separador = ';';
    
    // Encabezados
    csv += columnas.map(c => `"${c.titulo}"`).join(separador) + '\n';
    
    // Filas de datos
    datos.forEach(row => {
        const fila = columnas.map(c => {
            let valor = row[c.campo];
            
            // Formatear según tipo
            if (c.tipo === 'moneda') {
                valor = Number(valor || 0).toFixed(2);
            } else if (c.tipo === 'fecha') {
                valor = formatearFechaExcel(valor);
            } else if (c.tipo === 'numero') {
                valor = Number(valor || 0);
            } else {
                valor = valor || '-';
            }
            
            // Escapar comillas y envolver en comillas
            return `"${String(valor).replace(/"/g, '""')}"`;
        });
        csv += fila.join(separador) + '\n';
    });
    
    // Crear blob y descargar como .csv
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${nombreArchivo}_${obtenerFechaArchivo()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast('✅ Archivo exportado correctamente');
}

function formatearFechaExcel(fechaISO) {
    if (!fechaISO) return '-';
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function obtenerFechaArchivo() {
    const fecha = new Date();
    return `${fecha.getFullYear()}${(fecha.getMonth()+1).toString().padStart(2,'0')}${fecha.getDate().toString().padStart(2,'0')}`;
}

// =======================================================
//  FUNCIONES DE EXPORTACIÓN ESPECÍFICAS
// =======================================================

// Exportar Ventas Totales
function exportarVentasTotales() {
    const tbody = document.getElementById('tablaVentasTotales');
    if (!tbody) return;
    
    const filas = Array.from(tbody.querySelectorAll('tr'));
    const datos = filas.map(tr => {
        const celdas = tr.querySelectorAll('td');
        return {
            fecha: celdas[0]?.textContent || '',
            sucursal: celdas[1]?.textContent || '',
            empleado: celdas[2]?.textContent || '',
            codigoProducto: celdas[3]?.textContent || '',
            producto: celdas[4]?.textContent || '',
            cantidad: celdas[5]?.textContent || '',
            total: celdas[6]?.textContent?.replace('S/ ', '').replace(',', '') || ''
        };
    });
    
    exportarExcel(datos, 'Ventas_Totales', [
        { titulo: 'Fecha', campo: 'fecha', tipo: 'texto' },
        { titulo: 'Sucursal', campo: 'sucursal', tipo: 'texto' },
        { titulo: 'Empleado', campo: 'empleado', tipo: 'texto' },
        { titulo: 'Código', campo: 'codigoProducto', tipo: 'texto' },
        { titulo: 'Producto', campo: 'producto', tipo: 'texto' },
        { titulo: 'Cantidad', campo: 'cantidad', tipo: 'numero' },
        { titulo: 'Total (S/)', campo: 'total', tipo: 'moneda' }
    ]);
}

// Exportar ventas por empleado
function exportarVentasEmpleado() {
    if (!ventasEmpleadoCache || ventasEmpleadoCache.length === 0) {
        toast('❌ No hay datos para exportar');
        return;
    }
    
    const columnas = [
        { titulo: 'Fecha', campo: 'fecha', tipo: 'fecha' },
        { titulo: 'Empleado', campo: 'empleadoNombre', tipo: 'texto' },
        { titulo: 'Sucursal', campo: 'sucursalNombre', tipo: 'texto' },
        { titulo: 'Código', campo: 'codigo', tipo: 'texto' },
        { titulo: 'Producto', campo: 'producto', tipo: 'texto' },
        { titulo: 'Cantidad', campo: 'cantidad', tipo: 'numero' },
        { titulo: 'Total', campo: 'total', tipo: 'moneda' }
    ];
    
    exportarExcel(ventasEmpleadoCache, 'ventas-empleado', columnas);
}
// Exportar Ventas por Tienda
let ventasTiendaCache = [];
let ventasEmpleadoCache = [];
let rentabilidadCache = [];
let ventasTotalesCache = [];
function exportarVentasTienda() {
    if (!ventasTiendaCache || ventasTiendaCache.length === 0) {
        toast('❌ No hay datos para exportar');
        return;
    }
    
    const columnas = [
        { titulo: 'Fecha', campo: 'fecha', tipo: 'fecha' },
        { titulo: 'Sucursal', campo: 'sucursalNombre', tipo: 'texto' },
        { titulo: 'Empleado', campo: 'empleadoNombre', tipo: 'texto' },
        { titulo: 'Código', campo: 'codigo', tipo: 'texto' },
        { titulo: 'Producto', campo: 'producto', tipo: 'texto' },
        { titulo: 'Cantidad', campo: 'cantidad', tipo: 'numero' },
        { titulo: 'Total', campo: 'total', tipo: 'moneda' }
    ];
    
    exportarExcel(ventasTiendaCache, 'ventas-tienda', columnas);
}
async function exportarProductosConVariantes() {
    if (!productosCache || productosCache.length === 0) {
        toast('❌ No hay datos para exportar');
        return;
    }
    
    toast('⏳ Generando reporte...');
    
    const datosExportar = [];
    
    for (const producto of productosCache) {
        if (producto.tieneVariantes === 'SI') {
            // Obtener variantes del producto
            try {
                const resp = await apiCall({ action: 'getVariantesPorProducto', productoId: producto.id });
                const variantes = (resp.variantes || []).filter(v => v.estado !== 'INACTIVO');
                
                if (variantes.length > 0) {
                    // Agregar una fila por cada variante
                    variantes.forEach(v => {
                        datosExportar.push({
                            id: producto.id,
                            nombre: producto.nombre,
                            categoria: producto.categoria,
                            tipo: producto.tipo,
                            skuProducto: producto.sku,
                            precioCompra: producto.precioCompra,
                            precioVenta: producto.precioVenta,
                            color: v.color,
                            talla: v.talla,
                            skuVariante: v.sku,
                            stockVariante: v.stock,
                            tieneVariantes: 'SI'
                        });
                    });
                } else {
                    // Producto con variantes pero sin variantes registradas
                    datosExportar.push({
                        id: producto.id,
                        nombre: producto.nombre,
                        categoria: producto.categoria,
                        tipo: producto.tipo,
                        skuProducto: producto.sku,
                        precioCompra: producto.precioCompra,
                        precioVenta: producto.precioVenta,
                        color: '-',
                        talla: '-',
                        skuVariante: '-',
                        stockVariante: producto.stock,
                        tieneVariantes: 'SI (sin variantes)'
                    });
                }
            } catch (error) {
                console.error('Error obteniendo variantes:', error);
            }
        } else {
            // Producto simple sin variantes
            datosExportar.push({
                id: producto.id,
                nombre: producto.nombre,
                categoria: producto.categoria,
                tipo: producto.tipo,
                skuProducto: producto.sku,
                precioCompra: producto.precioCompra,
                precioVenta: producto.precioVenta,
                color: '-',
                talla: '-',
                skuVariante: '-',
                stockVariante: producto.stock,
                tieneVariantes: 'NO'
            });
        }
    }
    
    const columnas = [
        { titulo: 'ID', campo: 'id', tipo: 'texto' },
        { titulo: 'Producto', campo: 'nombre', tipo: 'texto' },
        { titulo: 'Categoría', campo: 'categoria', tipo: 'texto' },
        { titulo: 'Género', campo: 'tipo', tipo: 'texto' },
        { titulo: 'SKU Producto', campo: 'skuProducto', tipo: 'texto' },
        { titulo: 'P. Compra', campo: 'precioCompra', tipo: 'moneda' },
        { titulo: 'P. Venta', campo: 'precioVenta', tipo: 'moneda' },
        { titulo: 'Color', campo: 'color', tipo: 'texto' },
        { titulo: 'Talla', campo: 'talla', tipo: 'texto' },
        { titulo: 'SKU Variante', campo: 'skuVariante', tipo: 'texto' },
        { titulo: 'Stock', campo: 'stockVariante', tipo: 'numero' },
        { titulo: 'Tiene Variantes', campo: 'tieneVariantes', tipo: 'texto' }
    ];
    
    exportarExcel(datosExportar, 'productos-inventario', columnas);
}

// Exportar Ventas por Empleado
function exportarVentasEmpleado() {
    const tbody = document.getElementById('tablaVentasEmpleado');
    if (!tbody) return;
    
    const filas = Array.from(tbody.querySelectorAll('tr'));
    const datos = filas.map(tr => {
        const celdas = tr.querySelectorAll('td');
        return {
            fecha: celdas[0]?.textContent || '',
            empleado: celdas[1]?.textContent || '',
            sucursal: celdas[2]?.textContent || '',
            codigoProducto: celdas[3]?.textContent || '',
            producto: celdas[4]?.textContent || '',
            cantidad: celdas[5]?.textContent || '',
            total: celdas[6]?.textContent?.replace('S/ ', '').replace(',', '') || ''
        };
    });
    
    exportarExcel(datos, 'Ventas_por_Empleado', [
        { titulo: 'Fecha', campo: 'fecha', tipo: 'texto' },
        { titulo: 'Empleado', campo: 'empleado', tipo: 'texto' },
        { titulo: 'Sucursal', campo: 'sucursal', tipo: 'texto' },
        { titulo: 'Código', campo: 'codigoProducto', tipo: 'texto' },
        { titulo: 'Producto', campo: 'producto', tipo: 'texto' },
        { titulo: 'Cantidad', campo: 'cantidad', tipo: 'numero' },
        { titulo: 'Total (S/)', campo: 'total', tipo: 'moneda' }
    ]);
}

function exportarRentabilidad() {
    if (!rentabilidadCache || rentabilidadCache.length === 0) {
        toast('❌ No hay datos para exportar');
        return;
    }
    
    const columnas = [
        { titulo: 'Producto', campo: 'producto', tipo: 'texto' },
        { titulo: 'Categoría', campo: 'categoria', tipo: 'texto' },
        { titulo: 'Cantidad Vendida', campo: 'cantidadVendida', tipo: 'numero' },
        { titulo: 'Precio Compra', campo: 'precioCompra', tipo: 'moneda' },
        { titulo: 'Precio Venta', campo: 'precioVenta', tipo: 'moneda' },
        { titulo: 'Ingresos', campo: 'ingresos', tipo: 'moneda' },
        { titulo: 'Costos', campo: 'costos', tipo: 'moneda' },
        { titulo: 'Ganancia', campo: 'ganancia', tipo: 'moneda' },
        { titulo: 'Margen %', campo: 'margen', tipo: 'numero' }
    ];
    
    exportarExcel(rentabilidadCache, 'rentabilidad', columnas);
}
// Exportar Mis Ventas (empleado)
function exportarMisVentas() {
    const tbody = document.getElementById('tablaMisVentas');
    if (!tbody) return;
    
    const filas = Array.from(tbody.querySelectorAll('tr'));
    const datos = filas.map(tr => {
        const celdas = tr.querySelectorAll('td');
        return {
            fecha: celdas[0]?.textContent || '',
            codigoProducto: celdas[1]?.textContent || '',
            producto: celdas[2]?.textContent || '',
            cantidad: celdas[3]?.textContent || '',
            total: celdas[4]?.textContent?.replace('S/ ', '').replace(',', '') || ''
        };
    });
    
    exportarExcel(datos, 'Mis_Ventas', [
        { titulo: 'Fecha', campo: 'fecha', tipo: 'texto' },
        { titulo: 'Código', campo: 'codigoProducto', tipo: 'texto' },
        { titulo: 'Producto', campo: 'producto', tipo: 'texto' },
        { titulo: 'Cantidad', campo: 'cantidad', tipo: 'numero' },
        { titulo: 'Total (S/)', campo: 'total', tipo: 'moneda' }
    ]);
}

// Exportar Productos
function exportarProductos() {
    const tbody = document.getElementById('tablaProductos');
    if (!tbody) return;
    
    const filas = Array.from(tbody.querySelectorAll('tr'));
    const datos = filas.map(tr => {
        const celdas = tr.querySelectorAll('td');
        return {
            id: celdas[0]?.textContent || '',
            nombre: celdas[2]?.textContent || '',
            categoria: celdas[3]?.textContent || '',
            tipo: celdas[4]?.textContent || '',
            precioCompra: celdas[5]?.textContent?.replace('S/ ', '') || '',
            precioVenta: celdas[6]?.textContent?.replace('S/ ', '') || '',
            margen: celdas[7]?.textContent?.replace('%', '') || '',
            stock: celdas[8]?.textContent || '',
            sucursal: celdas[9]?.textContent || ''
        };
    });
    
    exportarExcel(datos, 'Productos', [
        { titulo: 'ID', campo: 'id', tipo: 'texto' },
        { titulo: 'Nombre', campo: 'nombre', tipo: 'texto' },
        { titulo: 'Categoría', campo: 'categoria', tipo: 'texto' },
        { titulo: 'Tipo', campo: 'tipo', tipo: 'texto' },
        { titulo: 'P. Compra (S/)', campo: 'precioCompra', tipo: 'moneda' },
        { titulo: 'P. Venta (S/)', campo: 'precioVenta', tipo: 'moneda' },
        { titulo: 'Margen (%)', campo: 'margen', tipo: 'numero' },
        { titulo: 'Stock', campo: 'stock', tipo: 'numero' },
        { titulo: 'Sucursal', campo: 'sucursal', tipo: 'texto' }
    ]);
}
// =======================================================
//  FUNCIONES DE NOTIFICACIONES PARA ADMIN
//  Agregar al final de admin.js
// =======================================================

let notificacionesCache = [];
let intervaloNotificaciones = null;

// =======================================================
//  INICIALIZAR SISTEMA DE NOTIFICACIONES
// =======================================================

function inicializarNotificaciones() {
    // Cargar notificaciones al inicio
    cargarNotificaciones();
    
    // Verificar cada 30 segundos
    intervaloNotificaciones = setInterval(cargarNotificaciones, 30000);
}

// Llamar al cargar la página del admin
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(inicializarNotificaciones, 1000);
    inicializarSKUAutomatico()
});

// =======================================================
//  CARGAR NOTIFICACIONES
// =======================================================

async function cargarNotificaciones() {
    try {
        const data = await apiCall({ action: 'getNotificacionesPendientes' });
        
        notificacionesCache = data.notificaciones || [];
        actualizarBadgeNotificaciones();
        
        // Si el panel está abierto, actualizar lista
        const panel = document.getElementById('notificacionesPanel');
        if (panel && panel.classList.contains('active')) {
            renderizarNotificaciones();
        }
        
    } catch (error) {
        console.error('Error cargando notificaciones:', error);
    }
}

// =======================================================
//  ACTUALIZAR BADGE
// =======================================================

function actualizarBadgeNotificaciones() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    
    const total = notificacionesCache.length;
    
    badge.textContent = total > 99 ? '99+' : total;
    badge.style.display = total > 0 ? 'flex' : 'none';
    
    // Efecto visual si hay nuevas
    if (total > 0) {
        const btn = document.getElementById('notificacionesBtn');
        if (btn) {
            btn.classList.add('tiene-notif');
        }
    }
}

// =======================================================
//  TOGGLE PANEL
// =======================================================

function toggleNotificaciones() {
    const panel = document.getElementById('notificacionesPanel');
    const overlay = document.getElementById('notifOverlay');
    
    if (panel.classList.contains('active')) {
        cerrarNotificaciones();
    } else {
        panel.classList.add('active');
        if (overlay) overlay.classList.add('active');
        renderizarNotificaciones();
    }
}

function cerrarNotificaciones() {
    const panel = document.getElementById('notificacionesPanel');
    const overlay = document.getElementById('notifOverlay');
    
    panel.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

// =======================================================
//  RENDERIZAR NOTIFICACIONES
// =======================================================

function renderizarNotificaciones() {
    const lista = document.getElementById('notifLista');
    const vacio = document.getElementById('notifVacio');
    
    if (!lista) return;
    
    if (notificacionesCache.length === 0) {
        lista.innerHTML = '';
        if (vacio) vacio.style.display = 'block';
        return;
    }
    
    if (vacio) vacio.style.display = 'none';
    
    lista.innerHTML = notificacionesCache.map(notif => {
        const fecha = new Date(notif.fecha);
        const tiempoRelativo = obtenerTiempoRelativo(fecha);
        
        return `
            <div class="notif-item" onclick="verDetalleNotificacion('${notif.id}')">
                <div class="notif-icono">🧾</div>
                <div class="notif-contenido">
                    <div class="notif-titulo">Nueva Venta - ${notif.numeroNota}</div>
                    <div class="notif-detalle">
                        ${notif.empleado} • ${notif.sucursal}<br>
                        Cliente: ${notif.cliente} (${notif.clienteDoc})
                    </div>
                    <div class="notif-meta">
                        <span class="notif-monto">S/ ${Number(notif.total).toFixed(2)}</span>
                        <span class="notif-tiempo">${tiempoRelativo}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// =======================================================
//  TIEMPO RELATIVO
// =======================================================

function obtenerTiempoRelativo(fecha) {
    const ahora = new Date();
    const diff = ahora - fecha;
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);
    
    if (minutos < 1) return 'Ahora';
    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    if (dias < 7) return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
    
    return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
}

// =======================================================
//  VER DETALLE DE NOTIFICACIÓN
// =======================================================

async function verDetalleNotificacion(id) {
    const notif = notificacionesCache.find(n => n.id === id);
    if (!notif) return;
    
    // Marcar como leída
    await marcarNotificacionLeidaAdmin(id);
    
    // Mostrar detalle (puedes personalizar esto)
    const mensaje = `
📋 NOTA DE VENTA: ${notif.numeroNota}

👤 Cliente: ${notif.cliente}
📄 Doc: ${notif.clienteDoc}
💰 Total: S/ ${Number(notif.total).toFixed(2)}
💳 Pago: ${notif.metodoPago}

👨‍💼 Vendedor: ${notif.empleado}
🏬 Sucursal: ${notif.sucursal}
📅 Fecha: ${new Date(notif.fecha).toLocaleString('es-PE')}

⚠️ Pendiente de emitir boleta/factura
    `;
    
    alert(mensaje);
    
    // Opcional: redirigir a una vista de detalle
    // cargarVista('detalle-venta');
}

// =======================================================
//  MARCAR COMO LEÍDA
// =======================================================

async function marcarNotificacionLeidaAdmin(id) {
    try {
        await apiCall({ action: 'marcarNotificacionLeida', id: id });
        
        // Remover de cache local
        notificacionesCache = notificacionesCache.filter(n => n.id !== id);
        actualizarBadgeNotificaciones();
        renderizarNotificaciones();
        
    } catch (error) {
        console.error('Error marcando notificación:', error);
    }
}

// =======================================================
//  MARCAR TODAS COMO LEÍDAS
// =======================================================

async function marcarTodasLeidasAdmin() {
    if (notificacionesCache.length === 0) return;
    
    try {
        await apiCall({ action: 'marcarTodasLeidas' });
        
        notificacionesCache = [];
        actualizarBadgeNotificaciones();
        renderizarNotificaciones();
        
        toast('✅ Todas las notificaciones marcadas como leídas');
        
    } catch (error) {
        console.error('Error marcando todas:', error);
        toast('❌ Error al marcar notificaciones');
    }
}

// =======================================================
//  SONIDO DE NOTIFICACIÓN (OPCIONAL)
// =======================================================

function reproducirSonidoNotificacion() {
    try {
        // Crear sonido simple usando Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
    } catch (error) {
        console.log('No se pudo reproducir sonido');
    }
}

async function editarProducto(id) {
    console.log('🔍 Abriendo modal para producto:', id);
    
    const producto = productosCache.find(p => p.id == id);
    if (!producto) {
        console.error('❌ Producto no encontrado');
        return;
    }

    // Resetear estado de imagen
    imagenEditarBase64 = null;
    imagenEditarCambiada = false;

    // Llenar campos
    document.getElementById("editProdId").value = producto.id;
    document.getElementById("editProdNombre").value = producto.nombre;
    document.getElementById("editProdCategoria").value = producto.categoria;
    document.getElementById("editProdGenero").value = producto.tipo;
    document.getElementById("editProdPrecioCompra").value = producto.precioCompra;
    document.getElementById("editProdPrecioVenta").value = producto.precioVenta;
    document.getElementById("editProdStock").value = producto.stock;
    
    // ✅ CARGAR SKU
    const skuField = document.getElementById("editProdSKU");
    if (skuField) skuField.value = producto.sku || '';

    // ✅ CARGAR TOGGLE DE VARIANTES
    const tieneVariantes = producto.tieneVariantes === 'SI';
    const toggleEdit = document.getElementById("editProdTieneVariantes");
    const toggleLabelEdit = document.getElementById("editToggleLabel");
    
    if (toggleEdit) {
        toggleEdit.checked = tieneVariantes;
    }
    
    if (toggleLabelEdit) {
        toggleLabelEdit.textContent = tieneVariantes 
            ? 'Sí - Tiene múltiples tallas/colores' 
            : 'No - Producto Simple';
        toggleLabelEdit.style.color = tieneVariantes ? '#3b82f6' : '#475569';
    }

    // Mostrar imagen actual
    if (producto.imagenUrl) {
        const imgUrl = convertirUrlGoogleDrive(producto.imagenUrl);
        mostrarPreviewImagenEditar(imgUrl);
    } else {
        ocultarPreviewImagenEditar();
    }

    await cargarSelectSucursales("editProdSucursal");
    document.getElementById("editProdSucursal").value = producto.sucursalId;

    // ABRIR MODAL
    const modal = document.getElementById("modalEditarProducto");
    // Mostrar/ocultar botón de variantes
    const btnVariantesEnEditar = document.getElementById('btnVariantesEnEditar');
    if (btnVariantesEnEditar) {
        btnVariantesEnEditar.style.display = producto.tieneVariantes === 'SI' ? 'inline-flex' : 'none';
    }
    modal.classList.add("active");
    console.log('✅ Modal abierto');
}

// Ir a gestionar variantes desde modal editar
function irAVariantesDesdeEditar() {
    const id = document.getElementById('editProdId').value;
    if (!id) return;
    
    cerrarModalEditarManual();
    
    setTimeout(() => {
        abrirModalVariantes(id);
    }, 300);
}
function cerrarModalVariantes() {
    document.getElementById('modalVariantes').classList.remove('active');
    productoVariantesActual = null;
    variantesActuales = [];
    
    // Recargar catálogo si estamos en catálogo
    if (typeof cargarCatalogoProductos === 'function') {
        cargarCatalogoProductos();
    }
    
    // Recargar tabla productos si estamos en productos
    if (typeof renderizarTablaProductos === 'function') {
        renderizarTablaProductos();
    }
}
function confirmarAccion() {
    if (!accionPendiente) return;

    switch (accionPendiente.tipo) {
        case 'editar':
            abrirModalEditarProducto(accionPendiente.id);
            break;

        case 'eliminar':
            eliminarProductoConfirmado(accionPendiente.id);
            break;
    }

    accionPendiente = null;
    cerrarModalConfirmacion();
}


// ❌ ELIMINA LAS DUPLICADAS - Deja solo UNA función cerrarModalEditar
function cerrarModalEditar() {
  // 🔒 Si el modal se acaba de abrir, ignorar el cierre
  if (window.modalEditarAbierto) {
    console.log('⚠️ Modal protegido, ignorando cierre automático');
    window.modalEditarAbierto = false;
    return;
  }
  
  console.log('❌ Cerrando modal');
  const modal = document.getElementById("modalEditarProducto");
  if (modal) {
    modal.classList.remove("active");
  }
}
// Agregar esta función en admin.js
function cerrarModalEditarManual() {
  window.modalEditarAbierto = false; // Desbloquear
  cerrarModalEditar();
}
async function guardarEdicionProducto() {
    const id = document.getElementById("editProdId").value;
    const nombre = document.getElementById("editProdNombre").value.trim();
    const categoria = document.getElementById("editProdCategoria").value.trim();
    const tipo = document.getElementById("editProdGenero").value;
    const sku = document.getElementById("editProdSKU").value.trim();
    const precioCompra = document.getElementById("editProdPrecioCompra").value;
    const precioVenta = document.getElementById("editProdPrecioVenta").value;
    const stock = document.getElementById("editProdStock").value;
    const sucursalId = document.getElementById("editProdSucursal").value;
    const tieneVariantes = document.getElementById("editProdTieneVariantes").checked ? 'SI' : 'NO';

    if (!nombre) {
        toast("⚠️ El nombre es obligatorio");
        return;
    }

    // Verificar si hay nueva imagen
    let imagenBase64 = undefined; // undefined = no cambiar
    const fileInput = document.getElementById("editProdImagen");
    if (fileInput && fileInput.files && fileInput.files[0]) {
        // Hay una nueva imagen seleccionada
        const preview = document.getElementById("editProdImagenPreview");
        if (preview && preview.src && preview.src.startsWith('data:image')) {
            imagenBase64 = preview.src;
        }
    }

    try {
        const dataToSend = {
            action: "actualizarProducto",
            id,
            nombre,
            categoria,
            tipo,
            sku,
            precioCompra: Number(precioCompra) || 0,
            precioVenta: Number(precioVenta) || 0,
            stock: Number(stock) || 0,
            sucursalId,
            tieneVariantes
        };
        
        // Solo incluir imagen si se cambió
        if (imagenBase64 !== undefined) {
            dataToSend.imagenBase64 = imagenBase64;
        }

        const resp = await apiCall(dataToSend);

        if (resp.success) {
            toast("✅ Producto actualizado");
            cerrarModalEditarManual();
            
            // Recargar catálogo si estamos en catálogo
            if (typeof cargarCatalogoProductos === 'function') {
                await cargarCatalogoProductos();
            }
            
            // También actualizar productosCache si existe
            if (typeof renderizarTablaProductos === 'function') {
                await renderizarTablaProductos();
            }
        } else {
            toast("❌ Error: " + (resp.error || "No se pudo actualizar"));
        }
    } catch (error) {
        console.error("Error actualizando producto:", error);
        toast("❌ Error al actualizar");
    }
}


// =======================================================
//  CATÁLOGO - MODAL DE DETALLE PRODUCTO
// =======================================================
let productoActualId = null;
let vieneDeCatalogo = false;
let productoIdParaVolver = null;

function abrirModalProducto(id) {
    const producto = productosCache.find(p => p.id == id);
    if (!producto) {
        console.error('❌ Producto no encontrado en cache');
        return;
    }
    
    productoActualId = id;
    
    // Llenar datos del modal del catálogo
    const imgUrl = typeof convertirUrlGoogleDrive === 'function' 
        ? convertirUrlGoogleDrive(producto.imagenUrl) 
        : producto.imagenUrl;
    
    document.getElementById('modalImagen').src = imgUrl || '';
    document.getElementById('modalNombre').textContent = producto.nombre || '-';
    document.getElementById('modalCategoria').textContent = producto.categoria || '-';
    document.getElementById('modalTipo').textContent = producto.tipo || '-';
    document.getElementById('modalPrecioCompra').textContent = `S/ ${(producto.precioCompra || 0).toFixed(2)}`;
    document.getElementById('modalPrecio').textContent = `S/ ${(producto.precioVenta || 0).toFixed(2)}`;
    
    const precioCompra = producto.precioCompra || 0;
    const precioVenta = producto.precioVenta || 0;
    const margen = precioVenta > 0 ? ((precioVenta - precioCompra) / precioVenta * 100) : 0;
    document.getElementById('modalMargen').textContent = `${margen.toFixed(1)}%`;
    
    document.getElementById('modalStock').textContent = `${producto.stock || 0} unidades`;
    document.getElementById('modalSucursal').textContent = getNombreSucursal(producto.sucursalId);
    document.getElementById('modalCodigo').textContent = producto.id || '-';
    document.getElementById('modalTallaColor').textContent = `${producto.talla || '-'} / ${producto.color || '-'}`;
    
    // Abrir modal
    document.getElementById('modalProducto').classList.add('active');
}

function cerrarModalProducto() {
    const modal = document.getElementById('modalProducto');
    if (modal) modal.classList.remove('active');
    productoActualId = null;
}

async function editarProductoDesdeModal() {
    if (!productoActualId) {
        console.error('❌ No hay producto seleccionado');
        return;
    }
    
    // Buscar producto en el cache del catálogo
    const producto = catalogoProductos.find(p => String(p.id) === String(productoActualId));
    if (!producto) {
        toast('❌ Producto no encontrado');
        return;
    }
    
    // Cerrar modal del catálogo
    cerrarModalProducto();
    
    // Guardar referencia para recargar después
    productoModalActual = producto;
    
    // Resetear estado de imagen
    imagenEditarBase64 = null;
    imagenEditarCambiada = false;

    // Llenar campos del modal de edición
    document.getElementById("editProdId").value = producto.id;
    document.getElementById("editProdNombre").value = producto.nombre;
    document.getElementById("editProdCategoria").value = producto.categoria || '';
    document.getElementById("editProdGenero").value = producto.tipo || 'Unisex';
    document.getElementById("editProdPrecioCompra").value = producto.precioCompra || 0;
    document.getElementById("editProdPrecioVenta").value = producto.precioVenta || 0;
    document.getElementById("editProdStock").value = producto.stock || 0;
    
    // SKU
    const skuField = document.getElementById("editProdSKU");
    if (skuField) skuField.value = producto.sku || '';

    // Toggle de variantes
    const tieneVariantes = producto.tieneVariantes === 'SI';
    const toggleEdit = document.getElementById("editProdTieneVariantes");
    const toggleLabelEdit = document.getElementById("editToggleLabel");
    
    if (toggleEdit) toggleEdit.checked = tieneVariantes;
    if (toggleLabelEdit) {
        toggleLabelEdit.textContent = tieneVariantes 
            ? 'Sí - Tiene múltiples tallas/colores' 
            : 'No - Producto Simple';
        toggleLabelEdit.style.color = tieneVariantes ? '#3b82f6' : '#475569';
    }

    // Imagen
    if (producto.imagenUrl) {
        const imgUrl = convertirUrlGoogleDrive(producto.imagenUrl);
        mostrarPreviewImagenEditar(imgUrl);
    } else {
        ocultarPreviewImagenEditar();
    }

    // Cargar sucursales
    await cargarSelectSucursales("editProdSucursal");
    document.getElementById("editProdSucursal").value = producto.sucursalId || '';

    // Mostrar/ocultar botón de variantes
    const btnVariantesEnEditar = document.getElementById('btnVariantesEnEditar');
    if (btnVariantesEnEditar) {
        btnVariantesEnEditar.style.display = tieneVariantes ? 'inline-flex' : 'none';
    }

    // Abrir modal de edición
    document.getElementById("modalEditarProducto").classList.add("active");
}

// Interceptar el guardado para volver al catálogo automáticamente
(function() {
    const originalGuardar = window.guardarEdicionProducto;
    
    window.guardarEdicionProducto = async function() {
        const id = document.getElementById("editProdId").value;
        
        // Llamar la función original
        await originalGuardar();
        
        // Si viene del catálogo, volver automáticamente
        if (vieneDeCatalogo && productoIdParaVolver) {
            const idProducto = productoIdParaVolver;
            vieneDeCatalogo = false;
            productoIdParaVolver = null;
            
            setTimeout(() => {
                cargarVista('catalogo').then(() => {
                    setTimeout(() => {
                        abrirModalProducto(Number(idProducto));
                    }, 500);
                });
            }, 300);
        }
    };
})();

// =======================================================
//  EDITAR IMAGEN DE PRODUCTO
// =======================================================
let imagenEditarBase64 = null;
let imagenEditarCambiada = false;

function inicializarEditorImagen() {
    const fileInput = document.getElementById('editProdImagen');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    mostrarPreviewImagenEditar(event.target.result);
                    imagenEditarBase64 = event.target.result.split(',')[1];
                    imagenEditarCambiada = true;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function mostrarPreviewImagenEditar(src) {
    const preview = document.getElementById('editProdImagenPreview');
    const placeholder = document.getElementById('editProdImagenPlaceholder');
    
    if (preview && src) {
        preview.src = src;
        preview.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    }
}

function ocultarPreviewImagenEditar() {
    const preview = document.getElementById('editProdImagenPreview');
    const placeholder = document.getElementById('editProdImagenPlaceholder');
    
    if (preview) {
        preview.src = '';
        preview.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'block';
}


function eliminarImagenEditar() {
    ocultarPreviewImagenEditar();
    imagenEditarBase64 = '';
    imagenEditarCambiada = true;
    
    const fileInput = document.getElementById('editProdImagen');
    if (fileInput) fileInput.value = '';
}

// Inicializar cuando carga la vista
document.addEventListener('vista-cargada', () => {
    if (window.vistaActualAdmin === 'productos') {
        inicializarEditorImagen();
    }
});

// ⚠️ FUNCIÓN PARA GENERAR SKU
function generarSKU(categoria, color, talla) {
    // Obtener iniciales de categoría (primeras 3 letras)
    const catCode = (categoria || 'PRD').substring(0, 3).toUpperCase().replace(/\s/g, '');
    
    // Obtener iniciales de color (primeras 3 letras)
    const colorCode = (color || 'STD').substring(0, 3).toUpperCase().replace(/\s/g, '');
    
    // Talla
    const tallaCode = (talla || 'U').toUpperCase();
    
    // Número aleatorio de 4 dígitos
    const random = Math.floor(1000 + Math.random() * 9000);
    
    // Formato: CAT-COL-TAL-RANDOM
    // Ejemplo: POL-NEG-M-5847
    return `${catCode}-${colorCode}-${tallaCode}-${random}`;
}

// ⚠️ FUNCIÓN PARA ACTUALIZAR SKU EN TIEMPO REAL
function actualizarSKUPreview() {
    const categoria = document.getElementById("prodCategoria")?.value.trim() || '';
    const color = document.getElementById("prodColor")?.value.trim() || '';
    const talla = document.getElementById("prodTalla")?.value || '';
    
    const skuInput = document.getElementById("prodSKU");
    
    if (categoria || color || talla) {
        const sku = generarSKU(categoria, color, talla);
        if (skuInput) skuInput.value = sku;
    } else {
        if (skuInput) skuInput.value = '';
    }
}

//VARIANTES
// =======================================================
//  MODAL DE VARIANTES
// =======================================================

let productoVariantesActual = null;
let variantesActuales = [];

// Abrir modal de variantes
window.abrirModalVariantes = function(id) {
    const producto = productosCache.find(p => String(p.id) === String(id));
    if (!producto) {
        toast('❌ Producto no encontrado');
        return;
    }
    
    productoVariantesActual = producto;
    
    // Mostrar info del producto
    document.getElementById('variantesProductoNombre').textContent = producto.nombre;
    document.getElementById('variantesProductoId').textContent = 'ID: ' + producto.id;
    
    // Limpiar formulario
    document.getElementById('varianteColor').value = '';
    document.getElementById('varianteTalla').value = '';
    document.getElementById('varianteStock').value = '0';
    document.getElementById('varianteSKU').value = '';
    
    // Cargar variantes existentes
    cargarVariantesProducto(id);
    
    // Abrir modal
    document.getElementById('modalVariantes').classList.add('active');
};

// Cargar variantes del producto
async function cargarVariantesProducto(productoId) {
    try {
        const resp = await apiCall({ action: 'getVariantesPorProducto', productoId: productoId });
        variantesActuales = resp.variantes || [];
        renderizarTablaVariantes();
    } catch (error) {
        console.error('Error cargando variantes:', error);
        variantesActuales = [];
        renderizarTablaVariantes();
    }
}

// Renderizar tabla de variantes
function renderizarTablaVariantes() {
    const tbody = document.getElementById('tablaVariantes');
    const empty = document.getElementById('variantesEmpty');
    const activas = variantesActuales.filter(v => v.estado !== 'INACTIVO');
    
    // Calcular stock
    const stockUsado = activas.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    const stockMaximo = Number(productoVariantesActual?.stock) || 0;
    const stockDisponible = stockMaximo - stockUsado;
    
    if (activas.length === 0) {
        tbody.innerHTML = '';
        if (empty) empty.style.display = 'block';
        document.getElementById('totalVariantes').textContent = '0';
        document.getElementById('stockTotalVariantes').textContent = `0 / ${stockMaximo}`;
        return;
    }
    
    if (empty) empty.style.display = 'none';
    
    tbody.innerHTML = activas.map(v => `
        <tr>
            <td><span style="background: ${getColorHex(v.color)}; padding: 4px 10px; border-radius: 12px; color: ${v.color === 'Blanco' || v.color === 'Amarillo' ? '#333' : '#fff'}; font-size: 12px;">${v.color}</span></td>
            <td><strong>${v.talla}</strong></td>
            <td><code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${v.sku || '-'}</code></td>
            <td>${v.stock}</td>
            <td>
                <button class="btn-action btn-edit" onclick="editarVariante('${v.id}')" title="Editar">✏️</button>
                <button class="btn-action btn-delete" onclick="eliminarVariante('${v.id}')" title="Eliminar">🗑️</button>
            </td>
        </tr>
    `).join('');
    
    document.getElementById('totalVariantes').textContent = activas.length;
    document.getElementById('stockTotalVariantes').innerHTML = `${stockUsado} / ${stockMaximo} <small style="color: ${stockDisponible > 0 ? '#10b981' : '#ef4444'};">(${stockDisponible} disponible)</small>`;
}

function getColorHex(color) {
    const colores = {
        'Negro': '#1e1e1e', 'Blanco': '#ffffff', 'Gris': '#6b7280',
        'Azul': '#3b82f6', 'Rojo': '#ef4444', 'Verde': '#22c55e',
        'Amarillo': '#eab308', 'Rosado': '#ec4899', 'Morado': '#a855f7',
        'Naranja': '#f97316', 'Beige': '#d4a574', 'Celeste': '#38bdf8', 'Marron': '#92400e'
    };
    return colores[color] || '#6b7280';
}

window.agregarVariante = async function() {
    console.log('🚀 Iniciando agregarVariante');
    
    const color = document.getElementById('varianteColor').value;
    const talla = document.getElementById('varianteTalla').value;
    const stock = Number(document.getElementById('varianteStock').value) || 0;
    
    console.log('📋 Datos:', { color, talla, stock });
    
    if (!color || !talla) {
        toast('⚠️ Selecciona color y talla');
        console.log('❌ Falta color o talla');
        return;
    }
    
    if (variantesActuales.find(v => v.color === color && v.talla === talla && v.estado !== 'INACTIVO')) {
        toast('⚠️ Ya existe esa variante');
        console.log('❌ Variante duplicada');
        return;
    }
    
    const stockActualVariantes = variantesActuales
        .filter(v => v.estado !== 'INACTIVO')
        .reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    
    const stockMaximo = Number(productoVariantesActual.stock) || 0;
    const stockDisponible = stockMaximo - stockActualVariantes;
    
    console.log('📦 Stock:', { stockActualVariantes, stockMaximo, stockDisponible });
    
    if (stock > stockDisponible) {
        toast(`⚠️ Stock máximo disponible: ${stockDisponible} unidades`);
        console.log('❌ Stock excedido');
        return;
    }
    
    const skuBase = productoVariantesActual.sku || productoVariantesActual.nombre.substring(0, 3).toUpperCase();
    const skuVariante = `${skuBase}-${color.substring(0, 3).toUpperCase()}-${talla}`;
    
    console.log('🏷️ SKU:', skuVariante);
    console.log('📤 Enviando a API...');
    
    try {
        const resp = await apiCall({
            action: 'crearVariante',
            productoId: productoVariantesActual.id,
            color, talla, stock: stock, sku: skuVariante, estado: 'ACTIVO'
        });
        
        console.log('📥 Respuesta:', resp);
        
        if (resp.success) {
            toast('✅ Variante agregada');
            document.getElementById('varianteColor').value = '';
            document.getElementById('varianteTalla').value = '';
            document.getElementById('varianteStock').value = '0';
            console.log('🔄 Recargando variantes...');
            await cargarVariantesProducto(productoVariantesActual.id);
            console.log('✅ Completado');
        } else {
            toast('❌ ' + (resp.error || 'Error'));
            console.log('❌ Error del servidor:', resp.error);
        }
    } catch (error) {
        console.error('❌ Error catch:', error);
        toast('❌ Error al agregar');
    }
};

window.editarVariante = async function(id) {
    const variante = variantesActuales.find(v => String(v.id) === String(id));
    if (!variante) return;
    
    const nuevoStock = prompt(`Stock actual: ${variante.stock}\nNuevo stock:`, variante.stock);
    if (nuevoStock === null) return;
    
    const resp = await apiCall({ action: 'actualizarVariante', id, stock: Number(nuevoStock) || 0 });
    if (resp.success) {
        toast('✅ Actualizado');
        await cargarVariantesProducto(productoVariantesActual.id);
    }
};

window.eliminarVariante = async function(id) {
    if (!confirm('¿Eliminar variante?')) return;
    
    const resp = await apiCall({ action: 'actualizarVariante', id, estado: 'INACTIVO' });
    if (resp.success) {
        toast('🗑️ Eliminada');
        await cargarVariantesProducto(productoVariantesActual.id);
    }
};

window.cerrarModalVariantes = function() {
    document.getElementById('modalVariantes').classList.remove('active');
    productoVariantesActual = null;
    variantesActuales = [];
    renderizarTablaProductos();
};

// =======================================================
//  SWITCH DE VISTAS
// =======================================================
document.addEventListener("vista-cargada", () => {
    const vista = window.vistaActualAdmin;

    switch (vista) {
        case "dashboard": 
            inicializarDashboardAdmin(); 
            break;
            
        case "productos": 
            inicializarProductos();
            setTimeout(() => initProductosForm(), 100); // ⚠️ Ambos juntos
            break;
            
        case "usuarios": 
            inicializarUsuarios(); 
            break;
            
        case "sucursales": 
            inicializarSucursales(); 
            break;
            
        case "ventas-totales": 
            inicializarVentasTotales(); 
            break;
            
        case "ventas-tienda": 
            inicializarVentasPorTienda(); 
            break;
            
        case "ventas-empleado": 
            inicializarVentasPorEmpleado(); 
            break;
            
        case "rentabilidad": 
            inicializarRentabilidad(); 
            break;
            
        case "stock-alertas": 
            inicializarAlertasStock(); 
            break;
            
        case "configuracion": 
            inicializarConfiguracion(); 
            break;
            
        case "catalogo": 
            inicializarCatalogo(); 
            break;
    }
});


// =======================================================
//  SISTEMA ADMIN — V. CON RENTABILIDAD

// =======================================================
//  INICIALIZAR FORMULARIO DE UPLOAD DE IMÁGENES
// =======================================================
let formProductosInicializado = false;

function initProductosForm() {
    if (formProductosInicializado) {
        console.log('⚠️ Formulario ya inicializado, saltando...');
        return;
    }
    
    console.log('🔄 Inicializando formulario de productos...');
    
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('prodImagen');
    const preview = document.getElementById('prodPreview');
    const previewWrapper = document.getElementById('previewWrapper');
    const uploadEmpty = document.getElementById('uploadEmpty');
    const btnRemove = document.getElementById('btnRemoveImg');
    
    if (!uploadArea) {
        console.error('❌ uploadArea no encontrado');
        return;
    }
    if (!fileInput) {
        console.error('❌ prodImagen no encontrado');
        return;
    }
    
    console.log('✅ Elementos encontrados correctamente');
    
    // ⚠️ LIMPIAR eventos anteriores clonando el elemento
    const nuevoUploadArea = uploadArea.cloneNode(true);
    uploadArea.parentNode.replaceChild(nuevoUploadArea, uploadArea);
    
    // ⚠️ Usar onclick en lugar de addEventListener
    document.getElementById('uploadArea').onclick = function(e) {
        console.log('🖱️ Click detectado');
        
        // Evitar si se hace click en el botón de remover
        if (e.target.closest('.btn-remove-img')) {
            console.log('⚠️ Click en botón remover, ignorando...');
            return;
        }
        
        console.log('📂 Abriendo selector...');
        document.getElementById('prodImagen').click();
    };
    
    // Change en input file
    fileInput.onchange = function(e) {
        console.log('📷 Archivo seleccionado');
        const file = e.target.files[0];
        if (file) {
            handleImageSelect(file);
        }
    };
    
    // Función para manejar la imagen seleccionada
    function handleImageSelect(file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen no debe superar los 5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            if (previewWrapper) previewWrapper.style.display = 'block';
            if (uploadEmpty) uploadEmpty.style.display = 'none';
            console.log('✅ Preview cargado');
        };
        reader.readAsDataURL(file);
    }
    
    // Botón remover imagen
    if (btnRemove) {
        btnRemove.onclick = function(e) {
            e.stopPropagation();
            fileInput.value = '';
            preview.src = '';
            if (previewWrapper) previewWrapper.style.display = 'none';
            if (uploadEmpty) uploadEmpty.style.display = 'flex';
            console.log('🗑️ Imagen removida');
        };
    }
    
    // Drag & Drop
    const area = document.getElementById('uploadArea');
    
    area.ondragover = function(e) {
        e.preventDefault();
        area.classList.add('dragover');
    };
    
    area.ondragleave = function() {
        area.classList.remove('dragover');
    };
    
    area.ondrop = function(e) {
        e.preventDefault();
        area.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageSelect(file);
        }
    };
    
    formProductosInicializado = true;
    console.log('✅ Formulario inicializado correctamente');
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
        // ✅ CONVERSIÓN SEGURA DE NÚMEROS
        const precioCompra = isNaN(Number(p.precioCompra)) ? 0 : Number(p.precioCompra);
        const precioVenta = isNaN(Number(p.precioVenta)) ? 0 : Number(p.precioVenta);
        const ganancia = precioVenta - precioCompra;
        const margen = precioVenta > 0 ? (ganancia / precioVenta) * 100 : 0;
        const stock = isNaN(Number(p.stock)) ? 0 : Number(p.stock);
        
        // ✅ CONVERTIR URL DE GOOGLE DRIVE
        const imagenUrl = convertirUrlGoogleDrive(p.imagenUrl);
        
        // Imagen con manejo de error
        const imagenHtml = imagenUrl 
            ? `<img src="${imagenUrl}" 
                    class="product-img-cell" 
                    onclick="abrirModalImagen('${p.imagenUrl}')"
                    onerror="this.outerHTML='<div class=\\'product-img-placeholder\\'>👔</div>'"
                    loading="lazy">`
            : `<div class="product-img-placeholder">👔</div>`;
        
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
                <td>${getNombreSucursal(p.sucursalId)}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editarProducto(${p.id})" title="Editar">✏️</button>
                    <button class="btn-action btn-delete" onclick="eliminarProducto(${p.id})" title="Eliminar">🗑️</button>
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
    const tipo = document.getElementById("prodTipo")?.value.trim() || '';
    const precioCompra = Number(document.getElementById("prodPrecioCompra").value || 0);
    const precioVenta = Number(document.getElementById("prodPrecio").value || 0);
    const stock = Number(document.getElementById("prodStock").value || 0);
    const sucursalId = document.getElementById("prodSucursal").value;

    if (!nombre) {
        toast("❌ El nombre es requerido");
        return;
    }

    if (precioVenta <= 0) {
        toast("❌ El precio de venta debe ser mayor a 0");
        return;
    }

    const loadingEl = document.getElementById("imageLoading");
    const btnGuardar = document.getElementById("btnGuardarProducto");
    
    if (loadingEl) loadingEl.style.display = "flex";
    if (btnGuardar) btnGuardar.disabled = true;

    try {
        const fileInput = document.getElementById("prodImagen");
        const file = fileInput?.files[0] || null;
        let imagenBase64 = "";

        if (file) {
            const base64Full = await fileToBase64(file);
            imagenBase64 = base64Full.split(",")[1];
        }

        const resp = await apiCall({
            action: "crearProducto",
            nombre,
            categoria,
            tipo,
            precioCompra,
            precioVenta,
            stock,
            sucursalId,
            imagenBase64
        });

        if (resp.success) {
            toast("✅ Producto guardado correctamente");
            limpiarFormularioProducto();
            await renderizarTablaProductos();
        } else {
            toast("❌ Error: " + (resp.error || "No se pudo guardar"));
        }

    } catch (error) {
        console.error("Error guardando producto:", error);
        toast("❌ Error inesperado al guardar");
    } finally {
        if (loadingEl) loadingEl.style.display = "none";
        if (btnGuardar) btnGuardar.disabled = false;
    }
}

function limpiarFormularioProducto() {
    ['prodNombre', 'prodCategoria', 'prodTipo', 'prodPrecioCompra', 'prodPrecio', 'prodStock', 'prodSucursal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    const fileInput = document.getElementById("prodImagen");
    const preview = document.getElementById("prodPreview");
    const previewWrapper = document.getElementById("previewWrapper");
    const uploadEmpty = document.getElementById("uploadEmpty");
    const previewGanancia = document.getElementById("previewGanancia");
    const previewMargen = document.getElementById("previewMargen");
    
    if (fileInput) fileInput.value = "";
    if (preview) preview.src = "";
    if (previewWrapper) previewWrapper.style.display = "none";
    if (uploadEmpty) uploadEmpty.style.display = "flex";
    if (previewGanancia) previewGanancia.textContent = "S/ 0.00";
    if (previewMargen) previewMargen.textContent = "0%";
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
        tbody.innerHTML = data.usuarios.map(u => `
            <tr>
                <td>${u.id}</td>
                <td>${u.nombre}</td>
                <td>${u.email}</td>
                <td><span class="badge ${u.rol === 'ADMIN' ? 'badge-admin' : 'badge-empleado'}">${u.rol}</span></td>
                <td>${getNombreSucursal(u.sucursalId)}</td>
            </tr>
        `).join("");
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
    
    const stockEl = document.getElementById('modalStock');
    stockEl.textContent = stock === 0 ? 'Agotado' : `${stock} unidades disponibles`;
    stockEl.className = `stock-valor ${stockClass}`;
    
    document.getElementById('modalSucursal').textContent = getNombreSucursal(producto.sucursalId);
    document.getElementById('modalCodigo').textContent = producto.id;

    modal.classList.add('active');
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
    
    // Encabezados
    csv += columnas.map(c => `"${c.titulo}"`).join(',') + '\n';
    
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
        csv += fila.join(',') + '\n';
    });
    
    // Crear blob y descargar
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

// Exportar Ventas por Tienda
function exportarVentasTienda() {
    const tbody = document.getElementById('tablaVentasTienda');
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
    
    exportarExcel(datos, 'Ventas_por_Tienda', [
        { titulo: 'Fecha', campo: 'fecha', tipo: 'texto' },
        { titulo: 'Sucursal', campo: 'sucursal', tipo: 'texto' },
        { titulo: 'Empleado', campo: 'empleado', tipo: 'texto' },
        { titulo: 'Código', campo: 'codigoProducto', tipo: 'texto' },
        { titulo: 'Producto', campo: 'producto', tipo: 'texto' },
        { titulo: 'Cantidad', campo: 'cantidad', tipo: 'numero' },
        { titulo: 'Total (S/)', campo: 'total', tipo: 'moneda' }
    ]);
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

// Exportar Rentabilidad por Producto
function exportarRentabilidadProductos() {
    const tbody = document.getElementById('tablaRentabilidadProductos');
    if (!tbody) return;
    
    const filas = Array.from(tbody.querySelectorAll('tr'));
    const datos = filas.map(tr => {
        const celdas = tr.querySelectorAll('td');
        return {
            codigo: celdas[0]?.textContent || '',
            producto: celdas[1]?.textContent || '',
            cantidad: celdas[2]?.textContent || '',
            precioCompra: celdas[3]?.textContent?.replace('S/ ', '') || '',
            precioVenta: celdas[4]?.textContent?.replace('S/ ', '') || '',
            costoTotal: celdas[5]?.textContent?.replace('S/ ', '') || '',
            ventaTotal: celdas[6]?.textContent?.replace('S/ ', '') || '',
            ganancia: celdas[7]?.textContent?.replace('S/ ', '') || '',
            margen: celdas[8]?.textContent?.replace('%', '') || ''
        };
    });
    
    exportarExcel(datos, 'Rentabilidad_Productos', [
        { titulo: 'Código', campo: 'codigo', tipo: 'texto' },
        { titulo: 'Producto', campo: 'producto', tipo: 'texto' },
        { titulo: 'Cantidad', campo: 'cantidad', tipo: 'numero' },
        { titulo: 'P. Compra (S/)', campo: 'precioCompra', tipo: 'moneda' },
        { titulo: 'P. Venta (S/)', campo: 'precioVenta', tipo: 'moneda' },
        { titulo: 'Costo Total (S/)', campo: 'costoTotal', tipo: 'moneda' },
        { titulo: 'Venta Total (S/)', campo: 'ventaTotal', tipo: 'moneda' },
        { titulo: 'Ganancia (S/)', campo: 'ganancia', tipo: 'moneda' },
        { titulo: 'Margen (%)', campo: 'margen', tipo: 'numero' }
    ]);
}

// Exportar Rentabilidad por Sucursal
function exportarRentabilidadSucursales() {
    const tbody = document.getElementById('tablaRentabilidadSucursales');
    if (!tbody) return;
    
    const filas = Array.from(tbody.querySelectorAll('tr'));
    const datos = filas.map(tr => {
        const celdas = tr.querySelectorAll('td');
        return {
            sucursal: celdas[0]?.textContent || '',
            ventas: celdas[1]?.textContent?.replace('S/ ', '') || '',
            costos: celdas[2]?.textContent?.replace('S/ ', '') || '',
            ganancia: celdas[3]?.textContent?.replace('S/ ', '') || '',
            margen: celdas[4]?.textContent?.replace('%', '') || '',
            transacciones: celdas[5]?.textContent || ''
        };
    });
    
    exportarExcel(datos, 'Rentabilidad_Sucursales', [
        { titulo: 'Sucursal', campo: 'sucursal', tipo: 'texto' },
        { titulo: 'Ventas (S/)', campo: 'ventas', tipo: 'moneda' },
        { titulo: 'Costos (S/)', campo: 'costos', tipo: 'moneda' },
        { titulo: 'Ganancia (S/)', campo: 'ganancia', tipo: 'moneda' },
        { titulo: 'Margen (%)', campo: 'margen', tipo: 'numero' },
        { titulo: 'Transacciones', campo: 'transacciones', tipo: 'numero' }
    ]);
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
    modal.classList.add("active");
    console.log('✅ Modal abierto');
}


function cerrarModalEditarManual() {
  const modal = document.getElementById("modalEditarProducto");
  modal.classList.remove("active");
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

    const datos = {
        action: "actualizarProducto",
        id,
        nombre: document.getElementById("editProdNombre").value,
        categoria: document.getElementById("editProdCategoria").value,
        tipo: document.getElementById("editProdGenero").value,
        precioCompra: Number(document.getElementById("editProdPrecioCompra").value),
        precioVenta: Number(document.getElementById("editProdPrecioVenta").value),
        stock: Number(document.getElementById("editProdStock").value),
        sucursalId: document.getElementById("editProdSucursal").value
    };

    // Solo enviar imagen si cambió
    if (imagenEditarCambiada) {
        datos.imagenBase64 = imagenEditarBase64 || '';
    }

    const resp = await apiCall(datos);

    if (resp.success) {
        toast("✅ Producto actualizado");
        window.modalEditarAbierto = false;
        cerrarModalEditar();
        await cargarCaches();
        
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
        } else {
            renderizarTablaProductos();
        }
    } else {
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
    
    const idGuardado = productoActualId;
    cerrarModalProducto();
    
    // Marcar que viene del catálogo
    vieneDeCatalogo = true;
    productoIdParaVolver = idGuardado;
    
    // Ir a productos y abrir modal de editar
    cargarVista('productos').then(() => {
        setTimeout(() => {
            editarProducto(idGuardado);
        }, 500);
    });
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


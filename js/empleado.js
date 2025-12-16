// =======================================================
//  SISTEMA EMPLEADO — V. COMPLETA CON VARIANTES
// =======================================================

// Variables globales para cache
let productosCache = [];
let sucursalesCache = [];
let usuarioActual = null;

// Variables para venta actual
let precioActual = 0;
let stockActual = 0;

// Variables para el catálogo y carrito
let catalogoProductos = [];
let catalogoFiltrado = [];
let vistaActual = 'grid';
let carrito = [];
let productoModalActual = null;

// Variables para el modal de variantes
let productoSeleccionadoVenta = null;
let variantesProductoActual = [];
let colorSeleccionado = null;
let tallaSeleccionada = null;
let varianteSeleccionada = null;
let maxStockDisponible = 0;

// Mapeo de colores a clases CSS
const coloresCSS = {
    'Negro': 'color-negro',
    'Blanco': 'color-blanco',
    'Gris': 'color-gris',
    'Azul': 'color-azul',
    'Rojo': 'color-rojo',
    'Verde': 'color-verde',
    'Amarillo': 'color-amarillo',
    'Rosado': 'color-rosado',
    'Morado': 'color-morado',
    'Naranja': 'color-naranja',
    'Beige': 'color-beige',
    'Celeste': 'color-celeste'
};

// -------------------------
//  CARGAR VISTAS
// -------------------------
async function cargarVistaEmpleado(nombre) {
    window.vistaActualEmpleado = nombre;
    const cont = document.getElementById("contenidoEmpleado");
    if (!cont) { console.error("❌ Falta #contenidoEmpleado"); return; }
    try {
        const resp = await fetch(`components/empleado/${nombre}.html`);
        if (!resp.ok) { cont.innerHTML = "<p>Error cargando vista.</p>"; return; }
        cont.innerHTML = await resp.text();
        if (typeof marcarMenuActivoEmpleado === 'function') marcarMenuActivoEmpleado(nombre);
        document.dispatchEvent(new Event("vista-empleado-cargada"));
    } catch (err) {
        console.error("❌ Error cargarVista empleado:", err);
        cont.innerHTML = "<p>Error inesperado.</p>";
    }
}

function convertirUrlGoogleDrive(url) {
    if (!url || url.trim() === '') return '';
    let fileId = '';
    let match = url.match(/[?&]id=([^&]+)/);
    if (match) fileId = match[1];
    if (!fileId) { match = url.match(/\/file\/d\/([^\/]+)/); if (match) fileId = match[1]; }
    if (!fileId && url.match(/^[a-zA-Z0-9_-]{20,}$/)) fileId = url;
    if (fileId) return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
    return url;
}

function protegerEmpleado() {
    const userStr = localStorage.getItem("user");
    if (!userStr) { window.location.href = "index.html"; return false; }
    usuarioActual = JSON.parse(userStr);
    if (usuarioActual.rol !== "EMPLEADO") { window.location.href = "index.html"; return false; }
    return true;
}

window.onload = async () => {
    if (!protegerEmpleado()) return;
    await cargarCaches();
    inicializarCarrito();
    await cargarVistaEmpleado("dashboard");
};

function logoutEmpleado() {
    localStorage.removeItem("user");
    window.location.href = "index.html";
}

// =======================================================
//  CACHES
// =======================================================
async function cargarCaches() {
    try {
        const [prodData, sucData] = await Promise.all([
            apiCall({ action: "getProductosPorSucursal", sucursalId: usuarioActual.sucursalId }),
            apiCall({ action: "getSucursales" })
        ]);
        productosCache = prodData.productos || [];
        sucursalesCache = sucData.sucursales || [];
    } catch (e) { console.error("Error cargando caches:", e); }
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

function getProductoPorId(id) {
    return productosCache.find(p => String(p.id) === String(id));
}

// =======================================================
//  HELPERS DE FECHAS
// =======================================================
function obtenerRangoFechas(periodo, fechaDesde = null, fechaHasta = null) {
    const hoy = new Date(); hoy.setHours(23, 59, 59, 999);
    let desde, hasta;
    switch (periodo) {
        case 'hoy': desde = new Date(hoy); desde.setHours(0, 0, 0, 0); hasta = hoy; break;
        case 'semana':
            desde = new Date(hoy);
            const diaSemana = desde.getDay();
            const diffLunes = diaSemana === 0 ? 6 : diaSemana - 1;
            desde.setDate(desde.getDate() - diffLunes);
            desde.setHours(0, 0, 0, 0); hasta = hoy; break;
        case 'mes': desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1); desde.setHours(0, 0, 0, 0); hasta = hoy; break;
        case 'anio': desde = new Date(hoy.getFullYear(), 0, 1); desde.setHours(0, 0, 0, 0); hasta = hoy; break;
        case 'personalizado':
            desde = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null;
            hasta = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : null; break;
        default: desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1); desde.setHours(0, 0, 0, 0); hasta = hoy;
    }
    return { desde, hasta };
}

function filtrarVentasPorFecha(ventas, desde, hasta) {
    if (!desde && !hasta) return ventas;
    return ventas.filter(v => {
        const fechaVenta = new Date(v.fechaISO);
        if (desde && fechaVenta < desde) return false;
        if (hasta && fechaVenta > hasta) return false;
        return true;
    });
}

function calcularResumen(ventas) {
    let total = 0, cantidad = 0;
    ventas.forEach(v => { total += Number(v.total || 0); cantidad += Number(v.cantidad || 0); });
    return { total, cantidad, transacciones: ventas.length };
}

function formatearFecha(fechaISO) {
    if (!fechaISO) return '-';
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// =======================================================
//  DASHBOARD EMPLEADO
// =======================================================
async function inicializarDashboardEmpleado() {
    if (!usuarioActual) return;
    const data = await apiCall({ action: "getResumenEmpleado", empleadoId: usuarioActual.id });
    const kpiDia = document.getElementById("kpiVentasDiaEmpleado");
    const kpiMes = document.getElementById("kpiVentasMesEmpleado");
    const kpiTrans = document.getElementById("kpiTransaccionesHoy");
    const kpiUnidades = document.getElementById("kpiUnidadesHoy");
    if (kpiDia) kpiDia.textContent = `S/ ${data.ventasDia || 0}`;
    if (kpiMes) kpiMes.textContent = `S/ ${data.ventasMes || 0}`;
    
    const ventasData = await apiCall({ action: "getMisVentas", empleadoId: usuarioActual.id });
    if (ventasData.ventas) {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const ventasHoy = ventasData.ventas.filter(v => new Date(v.fechaISO) >= hoy);
        const resumenHoy = calcularResumen(ventasHoy);
        if (kpiTrans) kpiTrans.textContent = resumenHoy.transacciones;
        if (kpiUnidades) kpiUnidades.textContent = resumenHoy.cantidad;
        
        const tbody = document.getElementById("tablaUltimasVentasEmpleado");
        if (tbody) {
            const ultimas = ventasData.ventas.slice(-10).reverse();
            tbody.innerHTML = ultimas.map(v => `<tr><td>${formatearFecha(v.fechaISO)}</td><td><code>${v.productoId}</code></td><td>${getNombreProducto(v.productoId)}</td><td>${v.cantidad}</td><td><strong>S/ ${v.total}</strong></td></tr>`).join("");
        }
    }
}

// =======================================================
//  REGISTRAR VENTA
// =======================================================
async function inicializarRegistrarVenta() {
    precioActual = 0; stockActual = 0;
    const select = document.getElementById("ventaProducto");
    if (!select) return;
    const data = await apiCall({ action: "getProductosPorSucursal", sucursalId: usuarioActual.sucursalId });
    productosCache = data.productos || [];
    select.innerHTML = `<option value="">-- Seleccionar producto --</option>` + productosCache.filter(p => Number(p.stock) > 0).map(p => `<option value="${p.id}" data-precio="${p.precioVenta}" data-stock="${p.stock}">${p.nombre} - S/ ${p.precioVenta}</option>`).join("");
    select.addEventListener('change', onProductoChange);
    
    const btnMenos = document.getElementById("btnMenos");
    const btnMas = document.getElementById("btnMas");
    const inputCantidad = document.getElementById("ventaCantidad");
    if (btnMenos) btnMenos.addEventListener('click', () => { let val = parseInt(inputCantidad.value) || 1; if (val > 1) { inputCantidad.value = val - 1; calcularTotalVenta(); } });
    if (btnMas) btnMas.addEventListener('click', () => { let val = parseInt(inputCantidad.value) || 1; if (stockActual > 0 && val < stockActual) { inputCantidad.value = val + 1; calcularTotalVenta(); } else if (stockActual > 0) { toast('⚠️ Stock máximo: ' + stockActual); } });
    if (inputCantidad) inputCantidad.addEventListener('input', () => { let val = parseInt(inputCantidad.value) || 1; if (val > stockActual && stockActual > 0) { inputCantidad.value = stockActual; toast('⚠️ Stock máximo: ' + stockActual); } if (val < 1) inputCantidad.value = 1; calcularTotalVenta(); });
    
    const btn = document.getElementById("btnRegistrarVenta");
    if (btn) btn.onclick = registrarVenta;
}

function onProductoChange() {
    const select = document.getElementById("ventaProducto");
    const option = select.options[select.selectedIndex];
    const productoInfo = document.getElementById("productoInfo");
    const infoPrecio = document.getElementById("infoPrecio");
    const infoStock = document.getElementById("infoStock");
    const inputCantidad = document.getElementById("ventaCantidad");
    
    if (select.value) {
        precioActual = parseFloat(option.dataset.precio) || 0;
        stockActual = parseInt(option.dataset.stock) || 0;
        if (infoPrecio) infoPrecio.textContent = `S/ ${precioActual.toFixed(2)}`;
        if (infoStock) { infoStock.textContent = `${stockActual} unidades`; infoStock.style.color = stockActual <= 5 ? '#ef4444' : '#10b981'; }
        if (productoInfo) productoInfo.style.display = 'flex';
        if (inputCantidad) { inputCantidad.max = stockActual; inputCantidad.value = 1; }
        calcularTotalVenta();
    } else {
        if (productoInfo) productoInfo.style.display = 'none';
        precioActual = 0; stockActual = 0;
        const totalVenta = document.getElementById("totalVenta");
        if (totalVenta) totalVenta.textContent = 'S/ 0.00';
    }
}

function calcularTotalVenta() {
    const inputCantidad = document.getElementById("ventaCantidad");
    const totalVenta = document.getElementById("totalVenta");
    const cantidad = parseInt(inputCantidad?.value) || 0;
    const total = precioActual * cantidad;
    if (totalVenta) totalVenta.textContent = `S/ ${total.toFixed(2)}`;
}

async function registrarVenta() {
    const productoId = document.getElementById("ventaProducto").value;
    const cantidad = parseInt(document.getElementById("ventaCantidad").value) || 0;
    const metodoPagoEl = document.querySelector('input[name="metodoPago"]:checked');
    const metodoPago = metodoPagoEl ? metodoPagoEl.value : 'EFECTIVO';
    if (!productoId) { toast("❌ Selecciona un producto"); return; }
    if (cantidad < 1) { toast("❌ La cantidad debe ser mayor a 0"); return; }
    const producto = getProductoPorId(productoId);
    if (!producto) { toast("❌ Producto no encontrado"); return; }
    if (cantidad > producto.stock) { toast(`❌ Stock insuficiente. Disponible: ${producto.stock}`); return; }
    const total = producto.precioVenta * cantidad;
    const btn = document.getElementById("btnRegistrarVenta");
    const btnTextoOriginal = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="btn-icon">⏳</span> Registrando...'; }
    try {
        const resp = await apiCall({ action: "registrarVenta", sucursalId: usuarioActual.sucursalId, empleadoId: usuarioActual.id, productoId: productoId, cantidad: cantidad, total: total, metodoPago: metodoPago });
        if (resp.success) {
            toast("✅ Venta registrada correctamente");
            document.getElementById("ventaProducto").value = "";
            document.getElementById("ventaCantidad").value = "1";
            document.getElementById("totalVenta").textContent = "S/ 0.00";
            const productoInfo = document.getElementById("productoInfo");
            if (productoInfo) productoInfo.style.display = "none";
            const efectivoRadio = document.querySelector('input[name="metodoPago"][value="EFECTIVO"]');
            if (efectivoRadio) efectivoRadio.checked = true;
            precioActual = 0; stockActual = 0;
            await inicializarRegistrarVenta();
        } else { toast("❌ Error: " + (resp.error || "No se pudo registrar")); }
    } catch (error) { console.error("Error registrando venta:", error); toast("❌ Error inesperado"); }
    finally { if (btn) { btn.disabled = false; btn.innerHTML = btnTextoOriginal || '<span class="btn-icon">✓</span> Registrar Venta'; } }
}

// =======================================================
//  MIS VENTAS
// =======================================================
async function inicializarMisVentas() {
    await buscarMisVentas();
    const btnFiltrar = document.getElementById("btnFiltrarMisVentas");
    if (btnFiltrar) btnFiltrar.onclick = buscarMisVentas;
    const selectPeriodo = document.getElementById('filtroPeriodo');
    const rangoFechas = document.getElementById('filtroRangoFechas');
    if (selectPeriodo && rangoFechas) selectPeriodo.addEventListener('change', () => { rangoFechas.style.display = selectPeriodo.value === 'personalizado' ? 'flex' : 'none'; });
}

async function buscarMisVentas() {
    const periodo = document.getElementById("filtroPeriodo")?.value || 'mes';
    const fechaDesde = document.getElementById("filtroDesde")?.value;
    const fechaHasta = document.getElementById("filtroHasta")?.value;
    const { desde, hasta } = obtenerRangoFechas(periodo, fechaDesde, fechaHasta);
    const data = await apiCall({ action: "getMisVentas", empleadoId: usuarioActual.id });
    if (!data.ventas) return;
    const ventasFiltradas = filtrarVentasPorFecha(data.ventas, desde, hasta);
    const resumen = calcularResumen(ventasFiltradas);
    const resumenTotal = document.getElementById("resumenTotal");
    const resumenCantidad = document.getElementById("resumenCantidad");
    const resumenTransacciones = document.getElementById("resumenTransacciones");
    if (resumenTotal) resumenTotal.textContent = `S/ ${resumen.total.toFixed(2)}`;
    if (resumenCantidad) resumenCantidad.textContent = resumen.cantidad;
    if (resumenTransacciones) resumenTransacciones.textContent = resumen.transacciones;
    const tbody = document.getElementById("tablaMisVentas");
    const emptyState = document.getElementById("emptyState");
    if (tbody) {
        if (ventasFiltradas.length === 0) { tbody.innerHTML = ""; if (emptyState) emptyState.style.display = "block"; }
        else { if (emptyState) emptyState.style.display = "none"; tbody.innerHTML = ventasFiltradas.reverse().map(v => `<tr><td>${formatearFecha(v.fechaISO)}</td><td><code>${v.productoId}</code></td><td>${getNombreProducto(v.productoId)}</td><td>${v.cantidad}</td><td><strong>S/ ${v.total}</strong></td></tr>`).join(""); }
    }
}

// =======================================================
//  PERFIL
// =======================================================
async function inicializarPerfil() {
    if (!usuarioActual) return;
    const nombreDisplay = document.getElementById("perfilNombreDisplay");
    const inicial = document.getElementById("perfilInicial");
    const rolBadge = document.getElementById("perfilRolBadge");
    if (nombreDisplay) nombreDisplay.textContent = usuarioActual.nombre;
    if (inicial) inicial.textContent = usuarioActual.nombre.charAt(0).toUpperCase();
    if (rolBadge) rolBadge.textContent = usuarioActual.rol;
    const perfilNombre = document.getElementById("perfilNombre");
    const perfilEmail = document.getElementById("perfilEmail");
    const perfilSucursal = document.getElementById("perfilSucursal");
    const perfilRol = document.getElementById("perfilRol");
    if (perfilNombre) perfilNombre.value = usuarioActual.nombre;
    if (perfilEmail) perfilEmail.value = usuarioActual.email;
    if (perfilSucursal) perfilSucursal.value = getNombreSucursal(usuarioActual.sucursalId);
    if (perfilRol) perfilRol.value = usuarioActual.rol === 'EMPLEADO' ? 'Empleado' : 'Administrador';
    document.querySelectorAll('.btn-toggle-pass').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (input) { if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; } else { input.type = 'password'; btn.textContent = '👁️'; } }
        });
    });
    const btnCambiar = document.getElementById("btnCambiarPass");
    if (btnCambiar) btnCambiar.onclick = cambiarPassword;
}

async function cambiarPassword() {
    const passActual = document.getElementById("perfilPassActual").value;
    const passNueva = document.getElementById("perfilPassNueva").value;
    const passConfirmar = document.getElementById("perfilPassConfirmar").value;
    if (!passActual || !passNueva || !passConfirmar) { toast("❌ Completa todos los campos"); return; }
    if (passNueva.length < 6) { toast("❌ La contraseña debe tener al menos 6 caracteres"); return; }
    if (passNueva !== passConfirmar) { toast("❌ Las contraseñas no coinciden"); return; }
    try {
        const resp = await apiCall({ action: "actualizarUsuario", id: usuarioActual.id, password: passNueva });
        if (resp.success) { toast("✅ Contraseña actualizada correctamente"); document.getElementById("perfilPassActual").value = ""; document.getElementById("perfilPassNueva").value = ""; document.getElementById("perfilPassConfirmar").value = ""; }
        else { toast("❌ Error: " + (resp.error || "No se pudo actualizar")); }
    } catch (error) { console.error("Error cambiando contraseña:", error); toast("❌ Error inesperado"); }
}

// =======================================================
//  CATÁLOGO DE PRODUCTOS
// =======================================================
async function inicializarCatalogo() {
    const loading = document.getElementById('loadingState');
    const catalogo = document.getElementById('catalogoProductos');
    const empty = document.getElementById('emptyState');
    if (loading) loading.style.display = 'block';
    if (catalogo) catalogo.style.display = 'none';
    if (empty) empty.style.display = 'none';
    try {
        const data = await apiCall({ action: 'getProductosPorSucursal', sucursalId: usuarioActual?.sucursalId });
        const filtroSucContainer = document.getElementById('filtroSucursalContainer');
        if (filtroSucContainer) filtroSucContainer.style.display = 'none';
        catalogoProductos = data.productos || [];
        catalogoFiltrado = [...catalogoProductos];
        cargarFiltrosCatalogo();
        renderizarCatalogo();
        configurarEventosCatalogo();
        actualizarBadgeCarrito();
    } catch (error) { console.error('Error cargando catálogo:', error); toast('❌ Error al cargar el catálogo'); }
    finally { if (loading) loading.style.display = 'none'; }
}

function cargarFiltrosCatalogo() {
    const categorias = [...new Set(catalogoProductos.map(p => p.categoria).filter(Boolean))];
    const tipos = [...new Set(catalogoProductos.map(p => p.tipo).filter(Boolean))];
    const selectCategoria = document.getElementById('filtroCategoria');
    const selectTipo = document.getElementById('filtroTipo');
    if (selectCategoria) selectCategoria.innerHTML = '<option value="">Todas</option>' + categorias.map(c => `<option value="${c}">${c}</option>`).join('');
    if (selectTipo) selectTipo.innerHTML = '<option value="">Todos</option>' + tipos.map(t => `<option value="${t}">${t}</option>`).join('');
}

function configurarEventosCatalogo() {
    const inputBusqueda = document.getElementById('filtroBusqueda');
    let timeoutBusqueda;
    if (inputBusqueda) inputBusqueda.addEventListener('input', () => { clearTimeout(timeoutBusqueda); timeoutBusqueda = setTimeout(aplicarFiltrosCatalogo, 300); });
    ['filtroSucursal', 'filtroCategoria', 'filtroTipo', 'filtroOrden'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', aplicarFiltrosCatalogo);
    });
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarFiltrosCatalogo);
}

function aplicarFiltrosCatalogo() {
    const busqueda = document.getElementById('filtroBusqueda')?.value.toLowerCase().trim() || '';
    const sucursal = document.getElementById('filtroSucursal')?.value || '';
    const categoria = document.getElementById('filtroCategoria')?.value || '';
    const tipo = document.getElementById('filtroTipo')?.value || '';
    const orden = document.getElementById('filtroOrden')?.value || 'nombre-asc';
    catalogoFiltrado = catalogoProductos.filter(p => {
        if (busqueda && !p.nombre.toLowerCase().includes(busqueda)) return false;
        if (sucursal && String(p.sucursalId) !== String(sucursal)) return false;
        if (categoria && p.categoria !== categoria) return false;
        if (tipo && p.tipo !== tipo) return false;
        return true;
    });
    const [campo, direccion] = orden.split('-');
    catalogoFiltrado.sort((a, b) => {
        let valA, valB;
        if (campo === 'nombre') { valA = a.nombre.toLowerCase(); valB = b.nombre.toLowerCase(); }
        else if (campo === 'precio') { valA = Number(a.precioVenta) || 0; valB = Number(b.precioVenta) || 0; }
        else if (campo === 'stock') { valA = Number(a.stock) || 0; valB = Number(b.stock) || 0; }
        return direccion === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
    actualizarChipsFiltros(busqueda, sucursal, categoria, tipo);
    renderizarCatalogo();
}

function actualizarChipsFiltros(busqueda, sucursal, categoria, tipo) {
    const container = document.getElementById('filtrosActivos');
    if (!container) return;
    let chips = [];
    if (busqueda) chips.push(`<span class="filtro-chip">🔍 "${busqueda}" <button onclick="quitarFiltro('busqueda')">✕</button></span>`);
    if (sucursal) chips.push(`<span class="filtro-chip">🏬 ${getNombreSucursal(sucursal)} <button onclick="quitarFiltro('sucursal')">✕</button></span>`);
    if (categoria) chips.push(`<span class="filtro-chip">📁 ${categoria} <button onclick="quitarFiltro('categoria')">✕</button></span>`);
    if (tipo) chips.push(`<span class="filtro-chip">👔 ${tipo} <button onclick="quitarFiltro('tipo')">✕</button></span>`);
    container.innerHTML = chips.join('');
}

function quitarFiltro(tipo) {
    switch(tipo) {
        case 'busqueda': document.getElementById('filtroBusqueda').value = ''; break;
        case 'sucursal': document.getElementById('filtroSucursal').value = ''; break;
        case 'categoria': document.getElementById('filtroCategoria').value = ''; break;
        case 'tipo': document.getElementById('filtroTipo').value = ''; break;
    }
    aplicarFiltrosCatalogo();
}

function limpiarFiltrosCatalogo() {
    document.getElementById('filtroBusqueda').value = '';
    const filtroSucursal = document.getElementById('filtroSucursal');
    if (filtroSucursal) filtroSucursal.value = '';
    document.getElementById('filtroCategoria').value = '';
    document.getElementById('filtroTipo').value = '';
    document.getElementById('filtroOrden').value = 'nombre-asc';
    aplicarFiltrosCatalogo();
}

// =======================================================
//  RENDERIZAR CATÁLOGO (CORREGIDO)
// =======================================================
function renderizarCatalogo() {
    const catalogo = document.getElementById('catalogoProductos');
    const empty = document.getElementById('emptyState');
    const contador = document.getElementById('contadorResultados');
    if (!catalogo) return;
    if (contador) contador.textContent = `${catalogoFiltrado.length} producto${catalogoFiltrado.length !== 1 ? 's' : ''}`;
    if (catalogoFiltrado.length === 0) { catalogo.style.display = 'none'; if (empty) empty.style.display = 'block'; return; }
    catalogo.style.display = 'grid';
    if (empty) empty.style.display = 'none';

    catalogo.innerHTML = catalogoFiltrado.map(p => {
        const stock = Number(p.stock) || 0;
        let stockClass = '', stockBadge = '', btnDisabled = '';
        if (stock === 0) { stockClass = 'agotado'; stockBadge = '<span class="producto-badge sin-stock">Agotado</span>'; btnDisabled = 'disabled'; }
        else if (stock <= 5) { stockClass = 'bajo'; stockBadge = '<span class="producto-badge stock-bajo">Poco stock</span>'; }
        const imagenUrl = convertirUrlGoogleDrive(p.imagenUrl);
        const imagen = imagenUrl ? `<img src="${imagenUrl}" alt="${p.nombre}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'producto-imagen-placeholder\\'>👔</div>'">` : '<div class="producto-imagen-placeholder">👔</div>';
        const btnTexto = stock === 0 ? 'Sin Stock' : '🛒 Agregar';
        
        // ✅ CORREGIDO: Usar abrirSelectorVariante
        return `
            <div class="producto-card">
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
                    <button class="btn-agregar-card" onclick="abrirSelectorVariante('${p.id}')" ${btnDisabled}>
                        ${btnTexto}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// =======================================================
//  SISTEMA DE CARRITO DE COMPRAS
// =======================================================
function inicializarCarrito() {
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) carrito = JSON.parse(carritoGuardado);
    actualizarBadgeCarrito();
}

function guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

function actualizarBadgeCarrito() {
    const badge = document.getElementById('carritoBadge');
    if (!badge) return;
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'flex' : 'none';
}

function animarBadgeCarrito() {
    const badge = document.getElementById('carritoBadge');
    if (badge) { badge.classList.add('pulse'); setTimeout(() => badge.classList.remove('pulse'), 500); }
}

// =======================================================
//  SELECTOR DE VARIANTES (CORREGIDO)
// =======================================================
async function abrirSelectorVariante(productoId) {
    // ✅ CORREGIDO: Usar catalogoProductos en lugar de productosEmpleado
    const producto = catalogoProductos.find(p => String(p.id) === String(productoId));
    if (!producto) { toast('❌ Producto no encontrado'); return; }
    
    productoSeleccionadoVenta = producto;
    colorSeleccionado = null;
    tallaSeleccionada = null;
    varianteSeleccionada = null;
    maxStockDisponible = 0;
    
    // Mostrar info del producto
    const varianteCategoria = document.getElementById('varianteCategoria');
    const varianteNombre = document.getElementById('varianteNombre');
    const varianteTipo = document.getElementById('varianteTipo');
    const variantePrecio = document.getElementById('variantePrecio');
    
    if (varianteCategoria) varianteCategoria.textContent = producto.categoria || 'Sin categoría';
    if (varianteNombre) varianteNombre.textContent = producto.nombre;
    if (varianteTipo) varianteTipo.textContent = producto.tipo || '';
    if (variantePrecio) variantePrecio.textContent = `S/ ${Number(producto.precioVenta || 0).toFixed(2)}`;
    
    // Imagen
    const imgContainer = document.getElementById('varianteImagen');
    const imagenUrl = convertirUrlGoogleDrive(producto.imagenUrl);
    if (imgContainer) {
        imgContainer.innerHTML = imagenUrl 
            ? `<img src="${imagenUrl}" alt="${producto.nombre}" onerror="this.outerHTML='<div class=\\'variante-img-placeholder\\'>👔</div>'">`
            : '<div class="variante-img-placeholder">👔</div>';
    }
    
    // Cargar variantes del producto
    try {
        const data = await apiCall({ action: 'getVariantesDisponibles', productoId: productoId });
        variantesProductoActual = data.variantes || [];
        
        if (variantesProductoActual.length === 0) {
            // Producto sin variantes - agregar directo al carrito con modal simple
            abrirModalAgregar(productoId);
            return;
        }
        
        // Renderizar opciones de color y talla
        renderizarOpcionesColor();
        renderizarOpcionesTalla();
        
        // Reset UI
        const stockInfo = document.getElementById('stockInfo');
        if (stockInfo) { stockInfo.className = 'stock-info'; stockInfo.querySelector('.stock-texto').textContent = 'Selecciona color y talla'; }
        const cantidadSelector = document.getElementById('cantidadSelector');
        if (cantidadSelector) cantidadSelector.style.display = 'none';
        const cantidadVariante = document.getElementById('cantidadVariante');
        if (cantidadVariante) cantidadVariante.value = 1;
        const btnAgregarVariante = document.getElementById('btnAgregarVariante');
        if (btnAgregarVariante) btnAgregarVariante.disabled = true;
        const varianteError = document.getElementById('varianteError');
        if (varianteError) varianteError.style.display = 'none';
        
        // Mostrar modal
        const modal = document.getElementById('modalVariante');
        if (modal) modal.classList.add('active');
        
    } catch (error) {
        console.error('Error cargando variantes:', error);
        // Si hay error, abrir modal simple
        abrirModalAgregar(productoId);
    }
}

function renderizarOpcionesColor() {
    const container = document.getElementById('coloresOpciones');
    if (!container) return;
    const coloresUnicos = [...new Set(variantesProductoActual.map(v => v.color))];
    container.innerHTML = coloresUnicos.map(color => {
        const tieneStock = variantesProductoActual.some(v => v.color === color && Number(v.stock) > 0);
        const colorClass = coloresCSS[color] || 'color-gris';
        return `<div class="color-opcion ${!tieneStock ? 'disabled' : ''}" data-color="${color}" onclick="${tieneStock ? `seleccionarColor('${color}')` : ''}"><span class="color-dot ${colorClass}"></span><span>${color}</span></div>`;
    }).join('');
}

function renderizarOpcionesTalla() {
    const container = document.getElementById('tallasOpciones');
    if (!container) return;
    const tallasUnicas = [...new Set(variantesProductoActual.map(v => v.talla))];
    const ordenTallas = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    tallasUnicas.sort((a, b) => {
        const idxA = ordenTallas.indexOf(a);
        const idxB = ordenTallas.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return Number(a) - Number(b);
    });
    container.innerHTML = tallasUnicas.map(talla => {
        let tieneStock = false, stockTalla = 0;
        if (colorSeleccionado) {
            const variante = variantesProductoActual.find(v => v.color === colorSeleccionado && v.talla === talla);
            tieneStock = variante && Number(variante.stock) > 0;
            stockTalla = variante ? Number(variante.stock) : 0;
        } else {
            tieneStock = variantesProductoActual.some(v => v.talla === talla && Number(v.stock) > 0);
        }
        return `<div class="talla-opcion ${!tieneStock ? 'disabled' : ''}" data-talla="${talla}" onclick="${tieneStock ? `seleccionarTalla('${talla}')` : ''}">${talla}${colorSeleccionado && stockTalla > 0 ? `<span class="stock-badge">(${stockTalla})</span>` : ''}</div>`;
    }).join('');
}

function seleccionarColor(color) {
    colorSeleccionado = color;
    document.querySelectorAll('.color-opcion').forEach(el => { el.classList.remove('selected'); if (el.dataset.color === color) el.classList.add('selected'); });
    renderizarOpcionesTalla();
    if (tallaSeleccionada) {
        const variante = variantesProductoActual.find(v => v.color === colorSeleccionado && v.talla === tallaSeleccionada);
        if (!variante || Number(variante.stock) <= 0) {
            tallaSeleccionada = null;
            document.querySelectorAll('.talla-opcion').forEach(el => el.classList.remove('selected'));
        } else {
            document.querySelector(`.talla-opcion[data-talla="${tallaSeleccionada}"]`)?.classList.add('selected');
        }
    }
    actualizarSeleccionVariante();
}

function seleccionarTalla(talla) {
    tallaSeleccionada = talla;
    document.querySelectorAll('.talla-opcion').forEach(el => { el.classList.remove('selected'); if (el.dataset.talla === talla) el.classList.add('selected'); });
    if (!colorSeleccionado) {
        const variantesConTalla = variantesProductoActual.filter(v => v.talla === talla && Number(v.stock) > 0);
        if (variantesConTalla.length > 0) { seleccionarColor(variantesConTalla[0].color); return; }
    }
    actualizarSeleccionVariante();
}

function actualizarSeleccionVariante() {
    const stockInfo = document.getElementById('stockInfo');
    const stockTexto = stockInfo?.querySelector('.stock-texto');
    const cantidadSelector = document.getElementById('cantidadSelector');
    const btnAgregar = document.getElementById('btnAgregarVariante');
    const errorDiv = document.getElementById('varianteError');
    if (errorDiv) errorDiv.style.display = 'none';
    if (!colorSeleccionado || !tallaSeleccionada) {
        if (stockInfo) stockInfo.className = 'stock-info';
        if (stockTexto) stockTexto.textContent = 'Selecciona color y talla';
        if (cantidadSelector) cantidadSelector.style.display = 'none';
        if (btnAgregar) btnAgregar.disabled = true;
        varianteSeleccionada = null;
        return;
    }
    varianteSeleccionada = variantesProductoActual.find(v => v.color === colorSeleccionado && v.talla === tallaSeleccionada);
    if (!varianteSeleccionada) {
        if (stockInfo) stockInfo.className = 'stock-info agotado';
        if (stockTexto) stockTexto.textContent = 'Combinación no disponible';
        if (cantidadSelector) cantidadSelector.style.display = 'none';
        if (btnAgregar) btnAgregar.disabled = true;
        return;
    }
    const stock = Number(varianteSeleccionada.stock) || 0;
    maxStockDisponible = stock;
    if (stock <= 0) {
        if (stockInfo) stockInfo.className = 'stock-info agotado';
        if (stockTexto) stockTexto.textContent = '❌ Agotado';
        if (cantidadSelector) cantidadSelector.style.display = 'none';
        if (btnAgregar) btnAgregar.disabled = true;
    } else if (stock <= 3) {
        if (stockInfo) stockInfo.className = 'stock-info bajo';
        if (stockTexto) stockTexto.textContent = `⚠️ ¡Solo quedan ${stock} unidades!`;
        if (cantidadSelector) cantidadSelector.style.display = 'flex';
        if (btnAgregar) btnAgregar.disabled = false;
        const cantidadInput = document.getElementById('cantidadVariante');
        if (cantidadInput) cantidadInput.max = stock;
        validarCantidadVariante();
    } else {
        if (stockInfo) stockInfo.className = 'stock-info disponible';
        if (stockTexto) stockTexto.textContent = `✅ ${stock} unidades disponibles`;
        if (cantidadSelector) cantidadSelector.style.display = 'flex';
        if (btnAgregar) btnAgregar.disabled = false;
        const cantidadInput = document.getElementById('cantidadVariante');
        if (cantidadInput) cantidadInput.max = stock;
        validarCantidadVariante();
    }
    actualizarSubtotalVariante();
}

function cambiarCantidadVariante(delta) {
    const input = document.getElementById('cantidadVariante');
    if (!input) return;
    let cantidad = parseInt(input.value) || 1;
    cantidad += delta;
    if (cantidad < 1) cantidad = 1;
    if (cantidad > maxStockDisponible) cantidad = maxStockDisponible;
    input.value = cantidad;
    validarCantidadVariante();
    actualizarSubtotalVariante();
}

function validarCantidadVariante() {
    const input = document.getElementById('cantidadVariante');
    if (!input) return;
    let cantidad = parseInt(input.value) || 1;
    const errorDiv = document.getElementById('varianteError');
    const errorTexto = document.getElementById('varianteErrorTexto');
    const btnAgregar = document.getElementById('btnAgregarVariante');
    if (cantidad > maxStockDisponible) {
        if (errorDiv) errorDiv.style.display = 'flex';
        if (errorTexto) errorTexto.textContent = `Solo hay ${maxStockDisponible} unidades disponibles`;
        if (btnAgregar) btnAgregar.disabled = true;
    } else {
        if (errorDiv) errorDiv.style.display = 'none';
        if (btnAgregar) btnAgregar.disabled = false;
    }
}

function actualizarSubtotalVariante() {
    const cantidad = parseInt(document.getElementById('cantidadVariante')?.value) || 1;
    const precio = Number(productoSeleccionadoVenta?.precioVenta) || 0;
    const subtotal = cantidad * precio;
    const subtotalEl = document.getElementById('subtotalVariante');
    if (subtotalEl) subtotalEl.textContent = `S/ ${subtotal.toFixed(2)}`;
}

function agregarVarianteAlCarrito() {
    if (!varianteSeleccionada || !productoSeleccionadoVenta) { toast('❌ Selecciona color y talla'); return; }
    const cantidad = parseInt(document.getElementById('cantidadVariante')?.value) || 1;
    if (cantidad > maxStockDisponible) { toast(`❌ Solo hay ${maxStockDisponible} unidades disponibles`); return; }
    
    const itemCarrito = {
        id: productoSeleccionadoVenta.id,
        varianteId: varianteSeleccionada.id,
        nombre: productoSeleccionadoVenta.nombre,
        color: colorSeleccionado,
        talla: tallaSeleccionada,
        sku: varianteSeleccionada.sku,
        precio: Number(productoSeleccionadoVenta.precioVenta),
        cantidad: cantidad,
        stock: maxStockDisponible,
        imagenUrl: productoSeleccionadoVenta.imagenUrl,
        categoria: productoSeleccionadoVenta.categoria
    };
    
    const existente = carrito.findIndex(item => item.varianteId === varianteSeleccionada.id);
    if (existente !== -1) {
        const nuevaCantidad = carrito[existente].cantidad + cantidad;
        if (nuevaCantidad > maxStockDisponible) { toast(`⚠️ Ya tienes ${carrito[existente].cantidad} en el carrito. Solo puedes agregar ${maxStockDisponible - carrito[existente].cantidad} más`); return; }
        carrito[existente].cantidad = nuevaCantidad;
    } else {
        carrito.push(itemCarrito);
    }
    
    guardarCarrito();
    actualizarBadgeCarrito();
    cerrarModalVariante();
    toast(`✅ ${productoSeleccionadoVenta.nombre} (${colorSeleccionado} - ${tallaSeleccionada}) agregado al carrito`);
    animarBadgeCarrito();
}

function cerrarModalVariante() {
    const modal = document.getElementById('modalVariante');
    if (modal) modal.classList.remove('active');
    productoSeleccionadoVenta = null;
    variantesProductoActual = [];
    colorSeleccionado = null;
    tallaSeleccionada = null;
    varianteSeleccionada = null;
}

// =======================================================
//  MODAL AGREGAR SIMPLE (SIN VARIANTES)
// =======================================================
function abrirModalAgregar(productoId) {
    const producto = catalogoProductos.find(p => String(p.id) === String(productoId));
    if (!producto || Number(producto.stock) === 0) return;
    productoModalActual = producto;
    const modal = document.getElementById('modalAgregar');
    if (!modal) return;
    const imagenUrl = convertirUrlGoogleDrive(producto.imagenUrl);
    const modalImg = document.getElementById('modalAgregarImg');
    if (modalImg) { modalImg.src = imagenUrl || ''; modalImg.onerror = function() { this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text y=".9em" font-size="50" x="25">👔</text></svg>'; }; }
    const modalCat = document.getElementById('modalAgregarCat');
    const modalNombre = document.getElementById('modalAgregarNombre');
    const modalTipo = document.getElementById('modalAgregarTipo');
    const modalPrecio = document.getElementById('modalAgregarPrecio');
    const modalStock = document.getElementById('modalAgregarStock');
    const modalCantidad = document.getElementById('modalCantidad');
    if (modalCat) modalCat.textContent = producto.categoria || 'Sin categoría';
    if (modalNombre) modalNombre.textContent = producto.nombre;
    if (modalTipo) modalTipo.textContent = producto.tipo || '-';
    if (modalPrecio) modalPrecio.textContent = `S/ ${Number(producto.precioVenta).toFixed(2)}`;
    if (modalStock) modalStock.textContent = `Stock: ${producto.stock} unidades`;
    if (modalCantidad) { modalCantidad.value = 1; modalCantidad.max = producto.stock; }
    actualizarSubtotalModal();
    modal.classList.add('active');
    const cerrarBtn = document.getElementById('cerrarModalAgregar');
    if (cerrarBtn) cerrarBtn.onclick = () => modal.classList.remove('active');
    if (modalCantidad) modalCantidad.oninput = actualizarSubtotalModal;
    const btnAgregar = document.getElementById('btnAgregarCarrito');
    if (btnAgregar) btnAgregar.onclick = agregarAlCarrito;
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
}

function cambiarCantidadModal(delta) {
    const input = document.getElementById('modalCantidad');
    if (!input) return;
    let valor = parseInt(input.value) || 1;
    valor += delta;
    if (valor < 1) valor = 1;
    if (productoModalActual && valor > productoModalActual.stock) { valor = productoModalActual.stock; toast('⚠️ Stock máximo alcanzado'); }
    input.value = valor;
    actualizarSubtotalModal();
}

function actualizarSubtotalModal() {
    if (!productoModalActual) return;
    const cantidad = parseInt(document.getElementById('modalCantidad')?.value) || 1;
    const subtotal = Number(productoModalActual.precioVenta) * cantidad;
    const modalSubtotal = document.getElementById('modalSubtotal');
    if (modalSubtotal) modalSubtotal.textContent = `S/ ${subtotal.toFixed(2)}`;
}

function agregarAlCarrito() {
    if (!productoModalActual) return;
    const cantidad = parseInt(document.getElementById('modalCantidad')?.value) || 1;
    const existente = carrito.find(item => String(item.id) === String(productoModalActual.id) && !item.varianteId);
    if (existente) {
        const nuevaCantidad = existente.cantidad + cantidad;
        if (nuevaCantidad > productoModalActual.stock) { toast(`⚠️ Solo hay ${productoModalActual.stock} unidades disponibles`); return; }
        existente.cantidad = nuevaCantidad;
    } else {
        carrito.push({ id: productoModalActual.id, varianteId: null, nombre: productoModalActual.nombre, color: null, talla: null, precio: Number(productoModalActual.precioVenta), cantidad: cantidad, stock: Number(productoModalActual.stock), imagenUrl: productoModalActual.imagenUrl, categoria: productoModalActual.categoria });
    }
    guardarCarrito();
    actualizarBadgeCarrito();
    toast(`✅ ${productoModalActual.nombre} agregado al carrito`);
    const modal = document.getElementById('modalAgregar');
    if (modal) modal.classList.remove('active');
    productoModalActual = null;
    animarBadgeCarrito();
}

// =======================================================
//  FUNCIONES DEL CARRITO
// =======================================================
function abrirCarrito() {
    const modal = document.getElementById('modalCarrito');
    if (!modal) return;
    let overlay = document.querySelector('.overlay-carrito');
    if (!overlay) { overlay = document.createElement('div'); overlay.className = 'overlay-carrito'; document.body.appendChild(overlay); }
    renderizarCarrito();
    modal.classList.add('active');
    overlay.classList.add('active');
    const cerrarBtn = document.getElementById('cerrarCarrito');
    if (cerrarBtn) cerrarBtn.onclick = cerrarCarrito;
    overlay.onclick = cerrarCarrito;
}

function cerrarCarrito() {
    const modal = document.getElementById('modalCarrito');
    const overlay = document.querySelector('.overlay-carrito');
    if (modal) modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

function renderizarCarrito() {
    const container = document.getElementById('carritoItems');
    const vacio = document.getElementById('carritoVacio');
    const footer = document.getElementById('carritoFooter');
    if (!container) return;
    if (carrito.length === 0) {
        container.innerHTML = '';
        if (vacio) vacio.classList.add('visible');
        if (footer) footer.style.display = 'none';
        return;
    }
    if (vacio) vacio.classList.remove('visible');
    if (footer) footer.style.display = 'block';
    container.innerHTML = carrito.map((item, index) => {
        const imagenUrl = convertirUrlGoogleDrive(item.imagenUrl);
        const subtotal = item.precio * item.cantidad;
        const varianteTexto = item.color && item.talla ? `<div class="carrito-variante">${item.color} - ${item.talla}</div>` : '';
        return `
            <div class="carrito-item">
                <img class="carrito-item-img" src="${imagenUrl || ''}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f1f5f9%22 width=%22100%22 height=%22100%22/><text y=%22.9em%22 font-size=%2250%22 x=%2225%22>👔</text></svg>'">
                <div class="carrito-item-info">
                    <div class="carrito-item-nombre">${item.nombre}</div>
                    ${varianteTexto}
                    <div class="carrito-item-precio">S/ ${item.precio.toFixed(2)} c/u</div>
                    <div class="carrito-item-cantidad">
                        <button onclick="cambiarCantidadCarrito(${index}, -1)">−</button>
                        <input type="number" value="${item.cantidad}" min="1" max="${item.stock}" onchange="actualizarCantidadCarrito(${index}, this.value)">
                        <button onclick="cambiarCantidadCarrito(${index}, 1)">+</button>
                    </div>
                </div>
                <div>
                    <div class="carrito-item-subtotal">S/ ${subtotal.toFixed(2)}</div>
                    <button class="carrito-item-eliminar" onclick="eliminarDelCarrito(${index})">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
    actualizarTotalCarrito();
}

function cambiarCantidadCarrito(index, delta) {
    const item = carrito[index];
    if (!item) return;
    const nuevaCantidad = item.cantidad + delta;
    if (nuevaCantidad < 1) { eliminarDelCarrito(index); return; }
    if (nuevaCantidad > item.stock) { toast('⚠️ Stock máximo alcanzado'); return; }
    item.cantidad = nuevaCantidad;
    guardarCarrito();
    renderizarCarrito();
    actualizarBadgeCarrito();
}

function actualizarCantidadCarrito(index, valor) {
    const item = carrito[index];
    if (!item) return;
    let cantidad = parseInt(valor) || 1;
    if (cantidad < 1) cantidad = 1;
    if (cantidad > item.stock) cantidad = item.stock;
    item.cantidad = cantidad;
    guardarCarrito();
    renderizarCarrito();
    actualizarBadgeCarrito();
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    guardarCarrito();
    renderizarCarrito();
    actualizarBadgeCarrito();
    toast('🗑️ Producto eliminado');
}

function vaciarCarrito() {
    if (!confirm('¿Vaciar todo el carrito?')) return;
    carrito = [];
    guardarCarrito();
    renderizarCarrito();
    actualizarBadgeCarrito();
    toast('🗑️ Carrito vaciado');
}

function actualizarTotalCarrito() {
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const carritoTotal = document.getElementById('carritoTotal');
    if (carritoTotal) carritoTotal.textContent = `S/ ${total.toFixed(2)}`;
}

function irAFinalizarCompra() {
    if (carrito.length === 0) { toast('❌ El carrito está vacío'); return; }
    cerrarCarrito();
    cargarVistaEmpleado('finalizar-compra');
}

// =======================================================
//  FINALIZAR COMPRA
// =======================================================
function inicializarFinalizarCompra() {
    if (carrito.length === 0) { toast('❌ No hay productos en el carrito'); cargarVistaEmpleado('catalogo'); return; }
    renderizarCheckout();
    const tipoDocRadios = document.querySelectorAll('input[name="tipoDoc"]');
    tipoDocRadios.forEach(radio => radio.addEventListener('change', cambiarTipoDocumento));
    cambiarTipoDocumento();
    const btnBuscarDNI = document.getElementById('btnBuscarDNI');
    if (btnBuscarDNI) btnBuscarDNI.onclick = buscarDNI;
    const btnBuscarRUC = document.getElementById('btnBuscarRUC');
    if (btnBuscarRUC) btnBuscarRUC.onclick = buscarRUC;
    const btnFinalizar = document.getElementById('btnFinalizarCompra');
    if (btnFinalizar) btnFinalizar.onclick = procesarCompra;
    const btnVolver = document.getElementById('btnVolverCatalogo');
    if (btnVolver) btnVolver.onclick = () => cargarVistaEmpleado('catalogo');
}

function renderizarCheckout() {
    const container = document.getElementById('checkoutProductos');
    const itemsCount = document.getElementById('itemsCount');
    if (!container) return;
    let total = 0, totalItems = 0;
    container.innerHTML = carrito.map(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        totalItems += item.cantidad;
        const imagenUrl = convertirUrlGoogleDrive(item.imagenUrl);
        const varianteTexto = item.color && item.talla ? `<span class="checkout-variante">${item.color} - ${item.talla}</span>` : '';
        return `
            <div class="checkout-item">
                <img class="checkout-item-img" src="${imagenUrl || ''}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f1f5f9%22 width=%22100%22 height=%22100%22/><text y=%22.9em%22 font-size=%2250%22 x=%2225%22>👔</text></svg>'">
                <div class="checkout-item-info">
                    <div class="checkout-item-nombre">${item.nombre}</div>
                    ${varianteTexto}
                    <div class="checkout-item-detalle">${item.cantidad} x S/ ${item.precio.toFixed(2)}</div>
                </div>
                <div class="checkout-item-subtotal">S/ ${subtotal.toFixed(2)}</div>
            </div>
        `;
    }).join('');
    if (itemsCount) itemsCount.textContent = `${totalItems} producto${totalItems !== 1 ? 's' : ''}`;
    const checkoutSubtotal = document.getElementById('checkoutSubtotal');
    const checkoutTotal = document.getElementById('checkoutTotal');
    if (checkoutSubtotal) checkoutSubtotal.textContent = `S/ ${total.toFixed(2)}`;
    if (checkoutTotal) checkoutTotal.textContent = `S/ ${total.toFixed(2)}`;
}

function cambiarTipoDocumento() {
    const tipo = document.querySelector('input[name="tipoDoc"]:checked')?.value || 'NOTA';
    const camposNota = document.getElementById('camposNota');
    const camposDNI = document.getElementById('camposDNI');
    const camposRUC = document.getElementById('camposRUC');
    const camposContacto = document.getElementById('camposContacto');
    if (camposNota) camposNota.style.display = 'none';
    if (camposDNI) camposDNI.style.display = 'none';
    if (camposRUC) camposRUC.style.display = 'none';
    if (camposContacto) camposContacto.style.display = 'none';
    switch (tipo) {
        case 'NOTA': if (camposNota) camposNota.style.display = 'block'; break;
        case 'DNI': if (camposDNI) camposDNI.style.display = 'block'; if (camposContacto) camposContacto.style.display = 'block'; break;
        case 'RUC': if (camposRUC) camposRUC.style.display = 'block'; if (camposContacto) camposContacto.style.display = 'block'; break;
    }
    limpiarCamposCliente();
}

function limpiarCamposCliente() {
    ['clienteDNI', 'clienteNombres', 'clienteApellidos', 'clienteRUC', 'clienteRazonSocial', 'clienteDireccion', 'clienteCelular', 'clienteCorreo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

async function buscarDNI() {
    const inputDNI = document.getElementById('clienteDNI');
    const inputNombres = document.getElementById('clienteNombres');
    const inputApellidos = document.getElementById('clienteApellidos');
    const btnBuscar = document.getElementById('btnBuscarDNI');
    const iconoBuscar = document.getElementById('btnBuscarDNIIcon');
    if (!inputDNI || !inputNombres || !inputApellidos) return;
    const dni = inputDNI.value.trim();
    if (dni.length !== 8 || !/^\d{8}$/.test(dni)) { toast('⚠️ El DNI debe tener 8 dígitos'); return; }
    if (btnBuscar) btnBuscar.disabled = true;
    if (iconoBuscar) iconoBuscar.textContent = '⏳';
    try {
        const resultado = await apiCall({ action: 'buscarDNI', dni: dni });
        if (resultado.success && resultado.datos) {
            inputNombres.value = resultado.datos.nombres || '';
            inputApellidos.value = `${resultado.datos.apellidoPaterno || ''} ${resultado.datos.apellidoMaterno || ''}`.trim();
            toast('✅ Datos encontrados en RENIEC');
            document.getElementById('clienteCelular')?.focus();
        } else { throw new Error(resultado.error || 'Error al consultar DNI'); }
    } catch (error) {
        console.error('Error buscando DNI:', error);
        toast('⚠️ No se pudo consultar. Ingresa el nombre manualmente');
        inputNombres.value = ''; inputApellidos.value = '';
        inputNombres.focus();
    } finally {
        if (btnBuscar) btnBuscar.disabled = false;
        if (iconoBuscar) iconoBuscar.textContent = '🔍';
    }
}

async function buscarRUC() {
    const inputRUC = document.getElementById('clienteRUC');
    const inputRazonSocial = document.getElementById('clienteRazonSocial');
    const inputDireccion = document.getElementById('clienteDireccion');
    const btnBuscar = document.getElementById('btnBuscarRUC');
    const iconoBuscar = document.getElementById('btnBuscarRUCIcon');
    if (!inputRUC || !inputRazonSocial) return;
    const ruc = inputRUC.value.trim();
    if (ruc.length !== 11 || !/^\d{11}$/.test(ruc)) { toast('⚠️ El RUC debe tener 11 dígitos'); return; }
    if (btnBuscar) btnBuscar.disabled = true;
    if (iconoBuscar) iconoBuscar.textContent = '⏳';
    try {
        const resultado = await apiCall({ action: 'buscarRUC', ruc: ruc });
        if (resultado.success && resultado.datos) {
            inputRazonSocial.value = resultado.datos.razonSocial || '';
            if (inputDireccion && resultado.datos.direccion) inputDireccion.value = resultado.datos.direccion;
            toast('✅ Datos encontrados en SUNAT');
            document.getElementById('clienteCelular')?.focus();
        } else { throw new Error(resultado.error || 'Error al consultar RUC'); }
    } catch (error) {
        console.error('Error buscando RUC:', error);
        toast('⚠️ No se pudo consultar. Ingresa la razón social manualmente');
        inputRazonSocial.value = '';
        if (inputDireccion) inputDireccion.value = '';
        inputRazonSocial.focus();
    } finally {
        if (btnBuscar) btnBuscar.disabled = false;
        if (iconoBuscar) iconoBuscar.textContent = '🔍';
    }
}

async function procesarCompra() {
    const tipoDoc = document.querySelector('input[name="tipoDoc"]:checked')?.value || 'NOTA';
    const metodoPago = document.querySelector('input[name="metodoPago"]:checked')?.value || 'EFECTIVO';
    let clienteData = { tipoDoc, metodoPago, esNotaSimple: tipoDoc === 'NOTA' };
    
    if (tipoDoc === 'DNI') {
        const dni = document.getElementById('clienteDNI')?.value.trim() || '';
        const nombres = document.getElementById('clienteNombres')?.value.trim() || '';
        const apellidos = document.getElementById('clienteApellidos')?.value.trim() || '';
        const celular = document.getElementById('clienteCelular')?.value.trim() || '';
        const correo = document.getElementById('clienteCorreo')?.value.trim() || '';
        if (!dni || dni.length !== 8) { toast('❌ Ingrese un DNI válido (8 dígitos)'); return; }
        if (!nombres || !apellidos) { toast('❌ Ingrese nombres y apellidos'); return; }
        if (!celular || celular.length !== 9) { toast('❌ Ingrese un celular válido (9 dígitos)'); return; }
        clienteData = { ...clienteData, dni, nombres, apellidos, nombreCompleto: `${nombres} ${apellidos}`, celular, correo, documento: dni };
    } else if (tipoDoc === 'RUC') {
        const ruc = document.getElementById('clienteRUC')?.value.trim() || '';
        const razonSocial = document.getElementById('clienteRazonSocial')?.value.trim() || '';
        const direccion = document.getElementById('clienteDireccion')?.value.trim() || '';
        const celular = document.getElementById('clienteCelular')?.value.trim() || '';
        const correo = document.getElementById('clienteCorreo')?.value.trim() || '';
        if (!ruc || ruc.length !== 11) { toast('❌ Ingrese un RUC válido (11 dígitos)'); return; }
        if (!razonSocial) { toast('❌ Ingrese la razón social'); return; }
        if (!celular || celular.length !== 9) { toast('❌ Ingrese un celular válido (9 dígitos)'); return; }
        clienteData = { ...clienteData, ruc, razonSocial, direccion, nombreCompleto: razonSocial, celular, correo, documento: ruc };
    } else {
        clienteData = { ...clienteData, nombreCompleto: 'CLIENTE GENERAL', documento: '-', celular: '-', correo: '' };
    }
    
    const btn = document.getElementById('btnFinalizarCompra');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Procesando...'; }
    
    try {
        const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        const numeroNota = generarNumeroNota();
        
        for (const item of carrito) {
            await apiCall({
                action: "registrarVenta",
                sucursalId: usuarioActual.sucursalId,
                empleadoId: usuarioActual.id,
                productoId: item.id,
                varianteId: item.varianteId || null,
                cantidad: item.cantidad,
                total: item.precio * item.cantidad,
                metodoPago: metodoPago,
                clienteDoc: clienteData.documento,
                clienteNombre: clienteData.nombreCompleto,
                clienteCelular: clienteData.celular || '-',
                clienteCorreo: clienteData.correo || '',
                numeroNota: numeroNota,
                tipoComprobante: tipoDoc,
                esNotaSimple: tipoDoc === 'NOTA' ? 'SI' : 'NO',
                color: item.color || '',
                talla: item.talla || ''
            });
            
            // Si tiene variante, descontar stock de la variante
            if (item.varianteId) {
                await apiCall({ action: 'descontarStockVariante', varianteId: item.varianteId, cantidad: item.cantidad });
            }
        }
        
        await apiCall({
            action: 'crearNotificacionAdmin',
            tipo: 'NUEVA_VENTA',
            numeroNota: numeroNota,
            empleado: usuarioActual.nombre,
            sucursal: getNombreSucursal(usuarioActual.sucursalId),
            cliente: clienteData.nombreCompleto,
            clienteDoc: clienteData.documento,
            total: total,
            items: carrito.length,
            metodoPago: metodoPago,
            tipoComprobante: tipoDoc,
            esNotaSimple: tipoDoc === 'NOTA'
        });
        
        mostrarNotaVentaFinal({ numeroNota, cliente: clienteData, productos: carrito, total, metodoPago, vendedor: usuarioActual.nombre, sucursal: getNombreSucursal(usuarioActual.sucursalId), tipoComprobante: tipoDoc, esNotaSimple: tipoDoc === 'NOTA' });
        
        carrito = [];
        guardarCarrito();
        actualizarBadgeCarrito();
        toast(tipoDoc === 'NOTA' ? '✅ Venta registrada y archivada correctamente' : '✅ Venta registrada correctamente');
        
    } catch (error) {
        console.error('Error procesando compra:', error);
        toast('❌ Error al procesar la compra');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '✓ Finalizar Compra'; }
    }
}

function generarNumeroNota() {
    const fecha = new Date();
    const año = fecha.getFullYear().toString().slice(-2);
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const hora = fecha.getHours().toString().padStart(2, '0');
    const min = fecha.getMinutes().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `NV${año}${mes}${dia}-${hora}${min}${random}`;
}

function mostrarNotaVentaFinal(datos) {
    const modal = document.getElementById('modalNotaVentaFinal');
    const preview = document.getElementById('notaVentaPreview');
    if (!modal || !preview) return;
    const fecha = new Date();
    const fechaStr = fecha.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    
    let productosHTML = datos.productos.map(p => {
        const varianteInfo = p.color && p.talla ? ` (${p.color} - ${p.talla})` : '';
        return `<tr><td>${p.nombre}${varianteInfo}</td><td>${p.cantidad}</td><td>S/ ${p.precio.toFixed(2)}</td><td>S/ ${(p.precio * p.cantidad).toFixed(2)}</td></tr>`;
    }).join('');
    
    let clienteHTML = '';
    if (datos.esNotaSimple) {
        clienteHTML = `<div class="aviso-nota" style="margin: 10px 0; padding: 10px; font-size: 10px;"><strong>📋 NOTA SIMPLE - ARCHIVADA</strong><br>Sin datos de cliente registrados</div>`;
    } else if (datos.cliente.tipoDoc === 'DNI') {
        clienteHTML = `<strong>CLIENTE:</strong><br>DNI: ${datos.cliente.dni}<br>${datos.cliente.nombreCompleto}<br>Tel: ${datos.cliente.celular}${datos.cliente.correo ? `<br>Email: ${datos.cliente.correo}` : ''}`;
    } else if (datos.cliente.tipoDoc === 'RUC') {
        clienteHTML = `<strong>CLIENTE:</strong><br>RUC: ${datos.cliente.ruc}<br>${datos.cliente.razonSocial}<br>${datos.cliente.direccion ? `Dir: ${datos.cliente.direccion}<br>` : ''}Tel: ${datos.cliente.celular}${datos.cliente.correo ? `<br>Email: ${datos.cliente.correo}` : ''}`;
    }
    
    const badgeArchivada = datos.esNotaSimple ? '<span class="nota-badge-archivada">📁 ARCHIVADA</span>' : '';
    
    preview.innerHTML = `
        <div class="nota-header"><div class="nota-logo">🛍️</div><h2 class="nota-titulo">NOTA DE VENTA</h2><p class="nota-subtitulo">${localStorage.getItem('nombreTienda') || 'Tienda de Ropa'}</p>${badgeArchivada}</div>
        <div class="nota-info"><div class="nota-info-row"><span>N° Nota:</span><strong>${datos.numeroNota}</strong></div><div class="nota-info-row"><span>Fecha:</span><strong>${fechaStr}</strong></div><div class="nota-info-row"><span>Sucursal:</span><strong>${datos.sucursal}</strong></div><div class="nota-info-row"><span>Vendedor:</span><strong>${datos.vendedor}</strong></div><div class="nota-info-row"><span>Tipo:</span><strong>${datos.esNotaSimple ? 'Nota Simple' : (datos.cliente.tipoDoc === 'RUC' ? 'Para Factura' : 'Para Boleta')}</strong></div></div>
        <div class="nota-divider"></div>
        <div class="nota-info">${clienteHTML}</div>
        <div class="nota-divider"></div>
        <table class="nota-tabla"><thead><tr><th>Producto</th><th>Cant.</th><th>P.Unit</th><th>Subtotal</th></tr></thead><tbody>${productosHTML}</tbody></table>
        <div class="nota-divider"></div>
        <div class="nota-totales"><div class="nota-total-row"><span>Subtotal:</span><span>S/ ${datos.total.toFixed(2)}</span></div><div class="nota-total-row nota-total-final"><span>TOTAL:</span><span>S/ ${datos.total.toFixed(2)}</span></div><div class="nota-total-row"><span>Método de pago:</span><span>${datos.metodoPago}</span></div></div>
        <div class="nota-footer"><p>¡Gracias por su compra!</p><small>${datos.esNotaSimple ? 'Nota de venta archivada - No válido como comprobante' : 'Este documento no es comprobante de pago'}</small></div>
    `;
    window.datosNotaActual = datos;
    modal.classList.add('active');
}

function descargarNotaVentaFinal() {
    const contenido = document.getElementById('notaVentaPreview');
    if (!contenido) return;
    const ventana = window.open('', '_blank');
    ventana.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Nota de Venta</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;padding:15px;max-width:300px;margin:0 auto}.nota-header{text-align:center;margin-bottom:15px}.nota-logo{font-size:35px}.nota-titulo{font-size:14px;font-weight:bold;letter-spacing:2px;margin:6px 0}.nota-subtitulo{font-size:10px;color:#666}.nota-badge-archivada{display:inline-block;background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:bold;margin-top:8px}.nota-info{margin-bottom:10px;font-size:10px}.nota-info-row{display:flex;justify-content:space-between;margin-bottom:2px}.nota-divider{border-top:1px dashed #ccc;margin:10px 0}.nota-tabla{width:100%;font-size:10px;border-collapse:collapse}.nota-tabla th{text-align:left;padding:4px 2px;border-bottom:1px solid #ddd;font-size:8px}.nota-tabla td{padding:4px 2px}.nota-tabla td:last-child{text-align:right}.nota-totales{margin-top:10px}.nota-total-row{display:flex;justify-content:space-between;font-size:10px;margin-bottom:3px}.nota-total-final{font-size:14px;font-weight:bold;padding-top:6px;border-top:2px solid #000;margin-top:6px}.nota-footer{text-align:center;margin-top:15px;padding-top:10px;border-top:1px dashed #ccc}.nota-footer p{font-size:11px;font-weight:bold}.nota-footer small{font-size:8px;color:#999}.aviso-nota{background:#fef3c7;padding:8px;border-radius:6px;border-left:3px solid #f59e0b}@media print{body{padding:5px}@page{size:80mm auto;margin:0}}</style></head><body>${contenido.innerHTML}<script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)};<\/script></body></html>`);
    ventana.document.close();
}

function cerrarNotaYNueva() {
    const modal = document.getElementById('modalNotaVentaFinal');
    if (modal) modal.classList.remove('active');
    cargarVistaEmpleado('catalogo');
}
// =======================================================
//  FUNCIONES FALTANTES - AGREGAR A empleado.js
//  Pegar este código al final del archivo empleado.js
//  (antes del evento "vista-empleado-cargada")
// =======================================================

// =========================================================
//  BUSCAR RUC EN SUNAT
// =========================================================
async function buscarRUC() {
    const inputRUC = document.getElementById('clienteRUC');
    const inputRazonSocial = document.getElementById('clienteRazonSocial');
    const inputDireccion = document.getElementById('clienteDireccion');
    const btnBuscar = document.getElementById('btnBuscarRUC');
    const iconoBuscar = document.getElementById('btnBuscarRUCIcon');
    
    if (!inputRUC || !inputRazonSocial) {
        console.error('❌ Elementos de RUC no encontrados');
        return;
    }
    
    const ruc = inputRUC.value.trim();
    
    // Validar formato
    if (ruc.length !== 11) {
        toast('⚠️ El RUC debe tener 11 dígitos');
        return;
    }
    
    if (!/^\d{11}$/.test(ruc)) {
        toast('⚠️ El RUC solo debe contener números');
        return;
    }
    
    // Deshabilitar botón mientras busca
    if (btnBuscar) btnBuscar.disabled = true;
    if (iconoBuscar) iconoBuscar.textContent = '⏳';
    
    try {
        // Llamar al BACKEND
        const resultado = await apiCall({ action: 'buscarRUC', ruc: ruc });
        
        if (resultado.success && resultado.datos) {
            inputRazonSocial.value = resultado.datos.razonSocial || '';
            if (inputDireccion && resultado.datos.direccion) {
                inputDireccion.value = resultado.datos.direccion;
            }
            
            toast('✅ Datos encontrados en SUNAT');
            
            const inputCelular = document.getElementById('clienteCelular');
            if (inputCelular) inputCelular.focus();
            
        } else {
            throw new Error(resultado.error || 'Error al consultar RUC');
        }
        
    } catch (error) {
        console.error('Error buscando RUC:', error);
        
        if (error.message.includes('no encontrado')) {
            toast('❌ RUC no encontrado en SUNAT');
        } else if (error.message.includes('autenticación')) {
            toast('❌ Error de autenticación con la API');
        } else {
            toast('⚠️ No se pudo consultar. Ingresa la razón social manualmente');
        }
        
        inputRazonSocial.value = '';
        if (inputDireccion) inputDireccion.value = '';
        inputRazonSocial.removeAttribute('readonly');
        if (inputDireccion) inputDireccion.removeAttribute('readonly');
        inputRazonSocial.focus();
        
    } finally {
        if (btnBuscar) btnBuscar.disabled = false;
        if (iconoBuscar) iconoBuscar.textContent = '🔍';
    }
}

// =========================================================
//  VALIDACIONES DE INPUT DNI Y RUC
// =========================================================
function validarInputDNI() {
    const inputDNI = document.getElementById('clienteDNI');
    if (!inputDNI) return;
    
    inputDNI.addEventListener('input', function(e) {
        // Solo permitir números
        this.value = this.value.replace(/[^0-9]/g, '');
        
        // Máximo 8 dígitos
        if (this.value.length > 8) {
            this.value = this.value.slice(0, 8);
        }
        
        // Si completó 8 dígitos, enfocar en botón buscar
        if (this.value.length === 8) {
            const btnBuscar = document.getElementById('btnBuscarDNI');
            if (btnBuscar) btnBuscar.focus();
        }
    });
    
    // Buscar al presionar Enter
    inputDNI.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.length === 8) {
            e.preventDefault();
            buscarDNI();
        }
    });
}

function validarInputRUC() {
    const inputRUC = document.getElementById('clienteRUC');
    if (!inputRUC) return;
    
    inputRUC.addEventListener('input', function(e) {
        // Solo permitir números
        this.value = this.value.replace(/[^0-9]/g, '');
        
        // Máximo 11 dígitos
        if (this.value.length > 11) {
            this.value = this.value.slice(0, 11);
        }
        
        // Si completó 11 dígitos, enfocar en botón buscar
        if (this.value.length === 11) {
            const btnBuscar = document.getElementById('btnBuscarRUC');
            if (btnBuscar) btnBuscar.focus();
        }
    });
    
    // Buscar al presionar Enter
    inputRUC.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && this.value.length === 11) {
            e.preventDefault();
            buscarRUC();
        }
    });
}

function inicializarValidacionesDocumentos() {
    validarInputDNI();
    validarInputRUC();
}

// =========================================================
//  ENVIAR NOTIFICACIÓN AL ADMIN
// =========================================================
async function enviarNotificacionAdmin(datos) {
    try {
        await apiCall({
            action: 'crearNotificacionAdmin',
            tipo: datos.tipo || 'NUEVA_VENTA',
            numeroNota: datos.numeroNota,
            empleado: datos.empleado,
            sucursal: datos.sucursal,
            cliente: datos.cliente,
            clienteDoc: datos.clienteDoc,
            total: datos.total,
            items: datos.items,
            metodoPago: datos.metodoPago,
            tipoComprobante: datos.tipoComprobante,
            esNotaSimple: datos.esNotaSimple,
            archivada: datos.archivada || false,
            fecha: datos.fecha || new Date().toISOString()
        });
    } catch (error) {
        console.error('Error enviando notificación:', error);
    }
}

// =========================================================
//  EXPORTAR EXCEL
// =========================================================
function exportarExcel(datos, nombreArchivo, columnas) {
    if (!datos || datos.length === 0) {
        toast('❌ No hay datos para exportar');
        return;
    }
    
    // Crear contenido CSV con BOM para caracteres especiales
    let csv = '\uFEFF';
    
    // Encabezados
    csv += columnas.map(c => `"${c.titulo}"`).join(',') + '\n';
    
    // Filas de datos
    datos.forEach(row => {
        const fila = columnas.map(c => {
            let valor = row[c.campo];
            
            if (c.tipo === 'moneda') {
                valor = Number(valor || 0).toFixed(2);
            } else if (c.tipo === 'fecha') {
                valor = formatearFecha(valor);
            } else if (c.tipo === 'numero') {
                valor = Number(valor || 0);
            } else {
                valor = valor || '-';
            }
            
            return `"${String(valor).replace(/"/g, '""')}"`;
        });
        csv += fila.join(',') + '\n';
    });
    
    // Crear blob y descargar
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const fechaArchivo = new Date();
    const fechaStr = `${fechaArchivo.getFullYear()}${(fechaArchivo.getMonth()+1).toString().padStart(2,'0')}${fechaArchivo.getDate().toString().padStart(2,'0')}`;
    link.setAttribute('download', `${nombreArchivo}_${fechaStr}.csv`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast('✅ Archivo exportado correctamente');
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

// =========================================================
//  PROCESAR COMPRA (FUNCIÓN COMPLETA)
// =========================================================
async function procesarCompra() {
    const tipoDoc = document.querySelector('input[name="tipoDoc"]:checked')?.value || 'NOTA';
    const metodoPago = document.querySelector('input[name="metodoPago"]:checked')?.value || 'EFECTIVO';
    
    let clienteData = { 
        tipoDoc, 
        metodoPago,
        esNotaSimple: tipoDoc === 'NOTA'
    };
    
    // Validar según tipo de documento
    if (tipoDoc === 'DNI') {
        const dni = document.getElementById('clienteDNI')?.value.trim() || '';
        const nombres = document.getElementById('clienteNombres')?.value.trim() || '';
        const apellidos = document.getElementById('clienteApellidos')?.value.trim() || '';
        const celular = document.getElementById('clienteCelular')?.value.trim() || '';
        const correo = document.getElementById('clienteCorreo')?.value.trim() || '';
        
        if (!dni || dni.length !== 8) {
            toast('❌ Ingrese un DNI válido (8 dígitos)');
            return;
        }
        if (!nombres || !apellidos) {
            toast('❌ Ingrese nombres y apellidos');
            return;
        }
        if (!celular || celular.length !== 9) {
            toast('❌ Ingrese un celular válido (9 dígitos)');
            return;
        }
        
        clienteData.dni = dni;
        clienteData.nombres = nombres;
        clienteData.apellidos = apellidos;
        clienteData.nombreCompleto = `${nombres} ${apellidos}`;
        clienteData.celular = celular;
        clienteData.correo = correo;
        clienteData.documento = dni;
        
    } else if (tipoDoc === 'RUC') {
        const ruc = document.getElementById('clienteRUC')?.value.trim() || '';
        const razonSocial = document.getElementById('clienteRazonSocial')?.value.trim() || '';
        const direccion = document.getElementById('clienteDireccion')?.value.trim() || '';
        const celular = document.getElementById('clienteCelular')?.value.trim() || '';
        const correo = document.getElementById('clienteCorreo')?.value.trim() || '';
        
        if (!ruc || ruc.length !== 11) {
            toast('❌ Ingrese un RUC válido (11 dígitos)');
            return;
        }
        if (!razonSocial) {
            toast('❌ Ingrese la razón social');
            return;
        }
        if (!celular || celular.length !== 9) {
            toast('❌ Ingrese un celular válido (9 dígitos)');
            return;
        }
        
        clienteData.ruc = ruc;
        clienteData.razonSocial = razonSocial;
        clienteData.direccion = direccion;
        clienteData.nombreCompleto = razonSocial;
        clienteData.celular = celular;
        clienteData.correo = correo;
        clienteData.documento = ruc;
        
    } else {
        // SOLO NOTA - Sin datos de cliente
        clienteData.nombreCompleto = 'CLIENTE GENERAL';
        clienteData.documento = '-';
        clienteData.celular = '-';
        clienteData.correo = '';
    }
    
    // Deshabilitar botón
    const btn = document.getElementById('btnFinalizarCompra');
    if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Procesando...';
    }
    
    try {
        // Calcular total
        const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
        
        // Generar número de nota
        const numeroNota = generarNumeroNota();
        
        // Registrar cada venta
        for (const item of carrito) {
            await apiCall({
                action: "registrarVenta",
                sucursalId: usuarioActual.sucursalId,
                empleadoId: usuarioActual.id,
                productoId: item.id,
                varianteId: item.varianteId || null,
                cantidad: item.cantidad,
                total: item.precio * item.cantidad,
                metodoPago: metodoPago,
                clienteDoc: clienteData.documento,
                clienteNombre: clienteData.nombreCompleto,
                clienteCelular: clienteData.celular || '-',
                clienteCorreo: clienteData.correo || '',
                numeroNota: numeroNota,
                tipoComprobante: tipoDoc,
                esNotaSimple: tipoDoc === 'NOTA' ? 'SI' : 'NO',
                color: item.color || '',
                talla: item.talla || ''
            });
            
            // Si tiene variante, descontar stock de la variante
            if (item.varianteId) {
                await apiCall({
                    action: 'descontarStockVariante',
                    varianteId: item.varianteId,
                    cantidad: item.cantidad
                });
            }
        }
        
        // Enviar notificación al admin
        await enviarNotificacionAdmin({
            tipo: 'NUEVA_VENTA',
            numeroNota: numeroNota,
            empleado: usuarioActual.nombre,
            sucursal: getNombreSucursal(usuarioActual.sucursalId),
            cliente: clienteData.nombreCompleto,
            clienteDoc: clienteData.documento,
            total: total,
            items: carrito.length,
            metodoPago: metodoPago,
            tipoComprobante: tipoDoc,
            esNotaSimple: tipoDoc === 'NOTA',
            archivada: tipoDoc === 'NOTA',
            fecha: new Date().toISOString()
        });
        
        // Mostrar nota de venta
        mostrarNotaVentaFinal({
            numeroNota,
            cliente: clienteData,
            productos: carrito,
            total,
            metodoPago,
            vendedor: usuarioActual.nombre,
            sucursal: getNombreSucursal(usuarioActual.sucursalId),
            tipoComprobante: tipoDoc,
            esNotaSimple: tipoDoc === 'NOTA'
        });
        
        // Vaciar carrito
        carrito = [];
        guardarCarrito();
        actualizarBadgeCarrito();
        
        // Mensaje según tipo
        if (tipoDoc === 'NOTA') {
            toast('✅ Venta registrada y archivada correctamente');
        } else {
            toast('✅ Venta registrada correctamente');
        }
        
    } catch (error) {
        console.error('Error procesando compra:', error);
        toast('❌ Error al procesar la compra');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '✓ Finalizar Compra';
        }
    }
}

// =========================================================
//  GENERAR NÚMERO DE NOTA
// =========================================================
function generarNumeroNota() {
    const fecha = new Date();
    const año = fecha.getFullYear().toString().slice(-2);
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const hora = fecha.getHours().toString().padStart(2, '0');
    const min = fecha.getMinutes().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    return `NV${año}${mes}${dia}-${hora}${min}${random}`;
}

// =========================================================
//  MOSTRAR NOTA DE VENTA FINAL
// =========================================================
function mostrarNotaVentaFinal(datos) {
    const modal = document.getElementById('modalNotaVentaFinal');
    const preview = document.getElementById('notaVentaPreview');
    
    if (!modal || !preview) return;
    
    const fecha = new Date();
    const fechaStr = fecha.toLocaleDateString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    
    // Generar HTML de productos
    let productosHTML = datos.productos.map(p => {
        const varianteInfo = p.color && p.talla ? ` (${p.color} - ${p.talla})` : '';
        return `
            <tr>
                <td>${p.nombre}${varianteInfo}</td>
                <td>${p.cantidad}</td>
                <td>S/ ${p.precio.toFixed(2)}</td>
                <td>S/ ${(p.precio * p.cantidad).toFixed(2)}</td>
            </tr>
        `;
    }).join('');
    
    // Generar info del cliente según tipo
    let clienteHTML = '';
    if (datos.esNotaSimple) {
        clienteHTML = `
            <div class="aviso-nota" style="margin: 10px 0; padding: 10px; font-size: 10px;">
                <strong>📋 NOTA SIMPLE - ARCHIVADA</strong><br>
                Sin datos de cliente registrados
            </div>
        `;
    } else if (datos.cliente.tipoDoc === 'DNI') {
        clienteHTML = `
            <strong>CLIENTE:</strong><br>
            DNI: ${datos.cliente.dni}<br>
            ${datos.cliente.nombreCompleto}<br>
            Tel: ${datos.cliente.celular}
            ${datos.cliente.correo ? `<br>Email: ${datos.cliente.correo}` : ''}
        `;
    } else if (datos.cliente.tipoDoc === 'RUC') {
        clienteHTML = `
            <strong>CLIENTE:</strong><br>
            RUC: ${datos.cliente.ruc}<br>
            ${datos.cliente.razonSocial}<br>
            ${datos.cliente.direccion ? `Dir: ${datos.cliente.direccion}<br>` : ''}
            Tel: ${datos.cliente.celular}
            ${datos.cliente.correo ? `<br>Email: ${datos.cliente.correo}` : ''}
        `;
    }
    
    // Badge de archivada si es nota simple
    const badgeArchivada = datos.esNotaSimple 
        ? '<span class="nota-badge-archivada">📁 ARCHIVADA</span>' 
        : '';
    
    preview.innerHTML = `
        <div class="nota-header">
            <div class="nota-logo">🛍️</div>
            <h2 class="nota-titulo">NOTA DE VENTA</h2>
            <p class="nota-subtitulo">${localStorage.getItem('nombreTienda') || 'Tienda de Ropa'}</p>
            ${badgeArchivada}
        </div>
        
        <div class="nota-info">
            <div class="nota-info-row">
                <span>N° Nota:</span>
                <strong>${datos.numeroNota}</strong>
            </div>
            <div class="nota-info-row">
                <span>Fecha:</span>
                <strong>${fechaStr}</strong>
            </div>
            <div class="nota-info-row">
                <span>Sucursal:</span>
                <strong>${datos.sucursal}</strong>
            </div>
            <div class="nota-info-row">
                <span>Vendedor:</span>
                <strong>${datos.vendedor}</strong>
            </div>
            <div class="nota-info-row">
                <span>Tipo:</span>
                <strong>${datos.esNotaSimple ? 'Nota Simple' : (datos.cliente.tipoDoc === 'RUC' ? 'Para Factura' : 'Para Boleta')}</strong>
            </div>
        </div>
        
        <div class="nota-divider"></div>
        
        <div class="nota-info">
            ${clienteHTML}
        </div>
        
        <div class="nota-divider"></div>
        
        <table class="nota-tabla">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>P.Unit</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${productosHTML}
            </tbody>
        </table>
        
        <div class="nota-divider"></div>
        
        <div class="nota-totales">
            <div class="nota-total-row">
                <span>Subtotal:</span>
                <span>S/ ${datos.total.toFixed(2)}</span>
            </div>
            <div class="nota-total-row nota-total-final">
                <span>TOTAL:</span>
                <span>S/ ${datos.total.toFixed(2)}</span>
            </div>
            <div class="nota-total-row">
                <span>Método de pago:</span>
                <span>${datos.metodoPago}</span>
            </div>
        </div>
        
        <div class="nota-footer">
            <p>¡Gracias por su compra!</p>
            <small>${datos.esNotaSimple ? 'Nota de venta archivada - No válido como comprobante' : 'Este documento no es comprobante de pago'}</small>
        </div>
    `;
    
    // Guardar datos para PDF
    window.datosNotaActual = datos;
    
    modal.classList.add('active');
}

// =========================================================
//  DESCARGAR NOTA DE VENTA PDF
// =========================================================
function descargarNotaVentaFinal() {
    const contenido = document.getElementById('notaVentaPreview');
    if (!contenido) return;
    
    const ventana = window.open('', '_blank');
    
    ventana.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Nota de Venta</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Courier New', monospace;
                    padding: 15px;
                    max-width: 300px;
                    margin: 0 auto;
                }
                .nota-header { text-align: center; margin-bottom: 15px; }
                .nota-logo { font-size: 35px; }
                .nota-titulo { font-size: 14px; font-weight: bold; letter-spacing: 2px; margin: 6px 0; }
                .nota-subtitulo { font-size: 10px; color: #666; }
                .nota-badge-archivada {
                    display: inline-block;
                    background: #fef3c7;
                    color: #92400e;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 10px;
                    font-weight: bold;
                    margin-top: 8px;
                }
                .nota-info { margin-bottom: 10px; font-size: 10px; }
                .nota-info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                .nota-divider { border-top: 1px dashed #ccc; margin: 10px 0; }
                .nota-tabla { width: 100%; font-size: 10px; border-collapse: collapse; }
                .nota-tabla th { text-align: left; padding: 4px 2px; border-bottom: 1px solid #ddd; font-size: 8px; }
                .nota-tabla td { padding: 4px 2px; }
                .nota-tabla td:last-child { text-align: right; }
                .nota-totales { margin-top: 10px; }
                .nota-total-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 3px; }
                .nota-total-final { font-size: 14px; font-weight: bold; padding-top: 6px; border-top: 2px solid #000; margin-top: 6px; }
                .nota-footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #ccc; }
                .nota-footer p { font-size: 11px; font-weight: bold; }
                .nota-footer small { font-size: 8px; color: #999; }
                .aviso-nota { background: #fef3c7; padding: 8px; border-radius: 6px; border-left: 3px solid #f59e0b; }
                @media print {
                    body { padding: 5px; }
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

function cerrarNotaYNueva() {
    const modal = document.getElementById('modalNotaVentaFinal');
    if (modal) modal.classList.remove('active');
    cargarVistaEmpleado('catalogo');
}
// =======================================================
//  SWITCH DE VISTAS
// =======================================================
document.addEventListener("vista-empleado-cargada", () => {
    const vista = window.vistaActualEmpleado;
    switch (vista) {
        case "dashboard": inicializarDashboardEmpleado(); break;
        case "registrar-venta": inicializarRegistrarVenta(); break;
        case "mis-ventas": inicializarMisVentas(); break;
        case "perfil": inicializarPerfil(); break;
        case "catalogo": inicializarCatalogo(); break;
        case "finalizar-compra": inicializarFinalizarCompra(); break;
    }
});
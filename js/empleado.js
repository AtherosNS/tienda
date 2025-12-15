// =======================================================
//  SISTEMA EMPLEADO — V. CORREGIDA CON CARRITO COMPLETO
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

// -------------------------
//  CARGAR VISTAS
// -------------------------
async function cargarVistaEmpleado(nombre) {
    window.vistaActualEmpleado = nombre;

    const cont = document.getElementById("contenidoEmpleado");
    if (!cont) {
        console.error("❌ Falta #contenidoEmpleado");
        return;
    }

    try {
        const resp = await fetch(`components/empleado/${nombre}.html`);
        if (!resp.ok) {
            cont.innerHTML = "<p>Error cargando vista.</p>";
            return;
        }
        cont.innerHTML = await resp.text();

        // Marcar menú activo
        if (typeof marcarMenuActivoEmpleado === 'function') {
            marcarMenuActivoEmpleado(nombre);
        }

        // Disparar evento
        document.dispatchEvent(new Event("vista-empleado-cargada"));

    } catch (err) {
        console.error("❌ Error cargarVista empleado:", err);
        cont.innerHTML = "<p>Error inesperado.</p>";
    }
}

// -------------------------
//  CARGAR NAVBAR
// -------------------------
async function cargarNavbarEmpleado() {
    const nav = document.getElementById("navbar");
    if (!nav) {
        console.error("❌ Falta #navbar");
        return;
    }

    try {
        const resp = await fetch("components/navbar-empleado.html");
        if (!resp.ok) {
            nav.innerHTML = "<p>Error cargando navbar.</p>";
            return;
        }
        nav.innerHTML = await resp.text();

        // Mostrar info del empleado
        if (usuarioActual) {
            const spanNombre = document.getElementById("empleadoNombre");
            const spanSucursal = document.getElementById("empleadoSucursal");

            if (spanNombre) spanNombre.textContent = usuarioActual.nombre;
            if (spanSucursal) spanSucursal.textContent = getNombreSucursal(usuarioActual.sucursalId);
        }

    } catch (err) {
        console.error("❌ Error navbar empleado:", err);
        nav.innerHTML = "<p>Error cargando navbar.</p>";
    }
}

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
//  PROTEGER RUTA
// -------------------------
function protegerEmpleado() {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
        window.location.href = "index.html";
        return false;
    }
    
    usuarioActual = JSON.parse(userStr);
    
    if (usuarioActual.rol !== "EMPLEADO") {
        window.location.href = "index.html";
        return false;
    }
    
    return true;
}

// -------------------------
//  INICIO
// -------------------------
window.onload = async () => {
    if (!protegerEmpleado()) return;
    
    // Cargar caches
    await cargarCaches();
    
    // Inicializar carrito desde localStorage
    inicializarCarrito();
    
    //await cargarNavbarEmpleado();
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
    
    return ventas.filter(v => {
        const fechaVenta = new Date(v.fechaISO);
        if (desde && fechaVenta < desde) return false;
        if (hasta && fechaVenta > hasta) return false;
        return true;
    });
}

function calcularResumen(ventas) {
    let total = 0;
    let cantidad = 0;
    
    ventas.forEach(v => {
        total += Number(v.total || 0);
        cantidad += Number(v.cantidad || 0);
    });
    
    return {
        total,
        cantidad,
        transacciones: ventas.length
    };
}

function formatearFecha(fechaISO) {
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

// =======================================================
//  DASHBOARD EMPLEADO
// =======================================================
async function inicializarDashboardEmpleado() {
    if (!usuarioActual) return;

    const data = await apiCall({ 
        action: "getResumenEmpleado",
        empleadoId: usuarioActual.id
    });

    // KPIs
    const kpiDia = document.getElementById("kpiVentasDiaEmpleado");
    const kpiMes = document.getElementById("kpiVentasMesEmpleado");
    const kpiTrans = document.getElementById("kpiTransaccionesHoy");
    const kpiUnidades = document.getElementById("kpiUnidadesHoy");

    if (kpiDia) kpiDia.textContent = `S/ ${data.ventasDia || 0}`;
    if (kpiMes) kpiMes.textContent = `S/ ${data.ventasMes || 0}`;

    // Obtener ventas de hoy para transacciones y unidades
    const ventasData = await apiCall({
        action: "getMisVentas",
        empleadoId: usuarioActual.id
    });

    if (ventasData.ventas) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        const ventasHoy = ventasData.ventas.filter(v => {
            const fechaVenta = new Date(v.fechaISO);
            return fechaVenta >= hoy;
        });

        const resumenHoy = calcularResumen(ventasHoy);
        
        if (kpiTrans) kpiTrans.textContent = resumenHoy.transacciones;
        if (kpiUnidades) kpiUnidades.textContent = resumenHoy.cantidad;

        // Tabla últimas ventas
        const tbody = document.getElementById("tablaUltimasVentasEmpleado");
        if (tbody) {
            const ultimas = ventasData.ventas.slice(-10).reverse();
            tbody.innerHTML = ultimas.map(v => `
                <tr>
                    <td>${formatearFecha(v.fechaISO)}</td>
                    <td><code>${v.productoId}</code></td>
                    <td>${getNombreProducto(v.productoId)}</td>
                    <td>${v.cantidad}</td>
                    <td><strong>S/ ${v.total}</strong></td>
                </tr>
            `).join("");
        }
    }
}

// =======================================================
//  REGISTRAR VENTA - CORREGIDO
// =======================================================
async function inicializarRegistrarVenta() {
    // Resetear variables
    precioActual = 0;
    stockActual = 0;

    // Cargar productos de la sucursal
    const select = document.getElementById("ventaProducto");
    if (!select) return;

    // Recargar productos por si hay cambios
    const data = await apiCall({ 
        action: "getProductosPorSucursal", 
        sucursalId: usuarioActual.sucursalId 
    });
    
    productosCache = data.productos || [];

    select.innerHTML = `<option value="">-- Seleccionar producto --</option>` +
        productosCache
            .filter(p => Number(p.stock) > 0)
            .map(p => `
                <option value="${p.id}" 
                        data-precio="${p.precioVenta}" 
                        data-stock="${p.stock}">
                    ${p.nombre} - S/ ${p.precioVenta}
                </option>
            `).join("");

    // Evento cambio de producto
    select.addEventListener('change', onProductoChange);

    // Botones + y -
    const btnMenos = document.getElementById("btnMenos");
    const btnMas = document.getElementById("btnMas");
    const inputCantidad = document.getElementById("ventaCantidad");

    if (btnMenos) {
        btnMenos.addEventListener('click', () => {
            let val = parseInt(inputCantidad.value) || 1;
            if (val > 1) {
                inputCantidad.value = val - 1;
                calcularTotalVenta();
            }
        });
    }

    if (btnMas) {
        btnMas.addEventListener('click', () => {
            let val = parseInt(inputCantidad.value) || 1;
            if (stockActual > 0 && val < stockActual) {
                inputCantidad.value = val + 1;
                calcularTotalVenta();
            } else if (stockActual > 0) {
                toast('⚠️ Stock máximo: ' + stockActual);
            }
        });
    }

    // Cambio manual de cantidad
    if (inputCantidad) {
        inputCantidad.addEventListener('input', () => {
            let val = parseInt(inputCantidad.value) || 1;
            if (val > stockActual && stockActual > 0) {
                inputCantidad.value = stockActual;
                toast('⚠️ Stock máximo: ' + stockActual);
            }
            if (val < 1) inputCantidad.value = 1;
            calcularTotalVenta();
        });
    }

    // Botón registrar venta
    const btn = document.getElementById("btnRegistrarVenta");
    if (btn) {
        btn.onclick = registrarVenta;
    }
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
        if (infoStock) {
            infoStock.textContent = `${stockActual} unidades`;
            infoStock.style.color = stockActual <= 5 ? '#ef4444' : '#10b981';
        }
        
        if (productoInfo) productoInfo.style.display = 'flex';
        if (inputCantidad) {
            inputCantidad.max = stockActual;
            inputCantidad.value = 1;
        }
        
        calcularTotalVenta();
    } else {
        if (productoInfo) productoInfo.style.display = 'none';
        precioActual = 0;
        stockActual = 0;
        
        const totalVenta = document.getElementById("totalVenta");
        if (totalVenta) totalVenta.textContent = 'S/ 0.00';
    }
}

function calcularTotalVenta() {
    const inputCantidad = document.getElementById("ventaCantidad");
    const totalVenta = document.getElementById("totalVenta");
    
    const cantidad = parseInt(inputCantidad?.value) || 0;
    const total = precioActual * cantidad;
    
    if (totalVenta) {
        totalVenta.textContent = `S/ ${total.toFixed(2)}`;
    }
}

async function registrarVenta() {
    const productoId = document.getElementById("ventaProducto").value;
    const cantidad = parseInt(document.getElementById("ventaCantidad").value) || 0;
    const metodoPagoEl = document.querySelector('input[name="metodoPago"]:checked');
    const metodoPago = metodoPagoEl ? metodoPagoEl.value : 'EFECTIVO';

    if (!productoId) {
        toast("❌ Selecciona un producto");
        return;
    }

    if (cantidad < 1) {
        toast("❌ La cantidad debe ser mayor a 0");
        return;
    }

    const producto = getProductoPorId(productoId);
    if (!producto) {
        toast("❌ Producto no encontrado");
        return;
    }

    if (cantidad > producto.stock) {
        toast(`❌ Stock insuficiente. Disponible: ${producto.stock}`);
        return;
    }

    const total = producto.precioVenta * cantidad;

    // Deshabilitar botón
    const btn = document.getElementById("btnRegistrarVenta");
    const btnTextoOriginal = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span> Registrando...';
    }

    try {
        const resp = await apiCall({
            action: "registrarVenta",
            sucursalId: usuarioActual.sucursalId,
            empleadoId: usuarioActual.id,
            productoId: productoId,
            cantidad: cantidad,
            total: total,
            metodoPago: metodoPago
        });

        if (resp.success) {
            toast("✅ Venta registrada correctamente");
            
            // Limpiar formulario
            document.getElementById("ventaProducto").value = "";
            document.getElementById("ventaCantidad").value = "1";
            document.getElementById("totalVenta").textContent = "S/ 0.00";
            
            const productoInfo = document.getElementById("productoInfo");
            if (productoInfo) productoInfo.style.display = "none";
            
            // Resetear método de pago a efectivo
            const efectivoRadio = document.querySelector('input[name="metodoPago"][value="EFECTIVO"]');
            if (efectivoRadio) efectivoRadio.checked = true;
            
            // Resetear variables
            precioActual = 0;
            stockActual = 0;
            
            // Recargar productos (actualizar stock)
            await inicializarRegistrarVenta();
            
        } else {
            toast("❌ Error: " + (resp.error || "No se pudo registrar"));
        }

    } catch (error) {
        console.error("Error registrando venta:", error);
        toast("❌ Error inesperado");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = btnTextoOriginal || '<span class="btn-icon">✓</span> Registrar Venta';
        }
    }
}

// =======================================================
//  MIS VENTAS
// =======================================================
async function inicializarMisVentas() {
    // Cargar datos iniciales
    await buscarMisVentas();

    // Evento del botón filtrar
    const btnFiltrar = document.getElementById("btnFiltrarMisVentas");
    if (btnFiltrar) {
        btnFiltrar.onclick = buscarMisVentas;
    }
    
    // Evento cambio de período
    const selectPeriodo = document.getElementById('filtroPeriodo');
    const rangoFechas = document.getElementById('filtroRangoFechas');
    
    if (selectPeriodo && rangoFechas) {
        selectPeriodo.addEventListener('change', () => {
            rangoFechas.style.display = selectPeriodo.value === 'personalizado' ? 'flex' : 'none';
        });
    }
}

async function buscarMisVentas() {
    const periodo = document.getElementById("filtroPeriodo")?.value || 'mes';
    const fechaDesde = document.getElementById("filtroDesde")?.value;
    const fechaHasta = document.getElementById("filtroHasta")?.value;

    const { desde, hasta } = obtenerRangoFechas(periodo, fechaDesde, fechaHasta);

    const data = await apiCall({
        action: "getMisVentas",
        empleadoId: usuarioActual.id
    });

    if (!data.ventas) return;

    const ventasFiltradas = filtrarVentasPorFecha(data.ventas, desde, hasta);
    const resumen = calcularResumen(ventasFiltradas);

    // Actualizar resumen
    const resumenTotal = document.getElementById("resumenTotal");
    const resumenCantidad = document.getElementById("resumenCantidad");
    const resumenTransacciones = document.getElementById("resumenTransacciones");

    if (resumenTotal) resumenTotal.textContent = `S/ ${resumen.total.toFixed(2)}`;
    if (resumenCantidad) resumenCantidad.textContent = resumen.cantidad;
    if (resumenTransacciones) resumenTransacciones.textContent = resumen.transacciones;

    // Renderizar tabla
    const tbody = document.getElementById("tablaMisVentas");
    const emptyState = document.getElementById("emptyState");

    if (tbody) {
        if (ventasFiltradas.length === 0) {
            tbody.innerHTML = "";
            if (emptyState) emptyState.style.display = "block";
        } else {
            if (emptyState) emptyState.style.display = "none";
            tbody.innerHTML = ventasFiltradas.reverse().map(v => `
                <tr>
                    <td>${formatearFecha(v.fechaISO)}</td>
                    <td><code>${v.productoId}</code></td>
                    <td>${getNombreProducto(v.productoId)}</td>
                    <td>${v.cantidad}</td>
                    <td><strong>S/ ${v.total}</strong></td>
                </tr>
            `).join("");
        }
    }
}

// =======================================================
//  PERFIL
// =======================================================
async function inicializarPerfil() {
    if (!usuarioActual) return;

    // Mostrar datos del usuario
    const nombreDisplay = document.getElementById("perfilNombreDisplay");
    const inicial = document.getElementById("perfilInicial");
    const rolBadge = document.getElementById("perfilRolBadge");

    if (nombreDisplay) nombreDisplay.textContent = usuarioActual.nombre;
    if (inicial) inicial.textContent = usuarioActual.nombre.charAt(0).toUpperCase();
    if (rolBadge) rolBadge.textContent = usuarioActual.rol;

    // Campos de información
    const perfilNombre = document.getElementById("perfilNombre");
    const perfilEmail = document.getElementById("perfilEmail");
    const perfilSucursal = document.getElementById("perfilSucursal");
    const perfilRol = document.getElementById("perfilRol");

    if (perfilNombre) perfilNombre.value = usuarioActual.nombre;
    if (perfilEmail) perfilEmail.value = usuarioActual.email;
    if (perfilSucursal) perfilSucursal.value = getNombreSucursal(usuarioActual.sucursalId);
    if (perfilRol) perfilRol.value = usuarioActual.rol === 'EMPLEADO' ? 'Empleado' : 'Administrador';

    // Toggle mostrar/ocultar contraseña
    document.querySelectorAll('.btn-toggle-pass').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            
            if (input) {
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.textContent = '🙈';
                } else {
                    input.type = 'password';
                    btn.textContent = '👁️';
                }
            }
        });
    });

    // Botón cambiar contraseña
    const btnCambiar = document.getElementById("btnCambiarPass");
    if (btnCambiar) {
        btnCambiar.onclick = cambiarPassword;
    }
}

async function cambiarPassword() {
    const passActual = document.getElementById("perfilPassActual").value;
    const passNueva = document.getElementById("perfilPassNueva").value;
    const passConfirmar = document.getElementById("perfilPassConfirmar").value;

    if (!passActual || !passNueva || !passConfirmar) {
        toast("❌ Completa todos los campos");
        return;
    }

    if (passNueva.length < 6) {
        toast("❌ La contraseña debe tener al menos 6 caracteres");
        return;
    }

    if (passNueva !== passConfirmar) {
        toast("❌ Las contraseñas no coinciden");
        return;
    }

    try {
        const resp = await apiCall({
            action: "actualizarUsuario",
            id: usuarioActual.id,
            password: passNueva
        });

        if (resp.success) {
            toast("✅ Contraseña actualizada correctamente");
            
            // Limpiar campos
            document.getElementById("perfilPassActual").value = "";
            document.getElementById("perfilPassNueva").value = "";
            document.getElementById("perfilPassConfirmar").value = "";
        } else {
            toast("❌ Error: " + (resp.error || "No se pudo actualizar"));
        }

    } catch (error) {
        console.error("Error cambiando contraseña:", error);
        toast("❌ Error inesperado");
    }
}

// =======================================================
//  CATÁLOGO DE PRODUCTOS
// =======================================================

// Inicializar catálogo
async function inicializarCatalogo() {
    const loading = document.getElementById('loadingState');
    const catalogo = document.getElementById('catalogoProductos');
    const empty = document.getElementById('emptyState');
    
    if (loading) loading.style.display = 'block';
    if (catalogo) catalogo.style.display = 'none';
    if (empty) empty.style.display = 'none';

    try {
        // Empleado: solo productos de su sucursal
        const data = await apiCall({ 
            action: 'getProductosPorSucursal', 
            sucursalId: usuarioActual?.sucursalId 
        });
        
        // Ocultar filtro de sucursal para empleado
        const filtroSucContainer = document.getElementById('filtroSucursalContainer');
        if (filtroSucContainer) filtroSucContainer.style.display = 'none';

        catalogoProductos = data.productos || [];
        catalogoFiltrado = [...catalogoProductos];

        // Cargar filtros de categoría y tipo
        cargarFiltrosCatalogo();

        // Renderizar catálogo
        renderizarCatalogo();

        // Configurar eventos de filtros
        configurarEventosCatalogo();
        
        // Actualizar badge del carrito
        actualizarBadgeCarrito();

    } catch (error) {
        console.error('Error cargando catálogo:', error);
        toast('❌ Error al cargar el catálogo');
    } finally {
        if (loading) loading.style.display = 'none';
    }
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
        if (busqueda && !p.nombre.toLowerCase().includes(busqueda)) return false;
        if (sucursal && String(p.sucursalId) !== String(sucursal)) return false;
        if (categoria && p.categoria !== categoria) return false;
        if (tipo && p.tipo !== tipo) return false;
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

// Renderizar catálogo con botón agregar al carrito
function renderizarCatalogo() {
    const catalogo = document.getElementById('catalogoProductos');
    const empty = document.getElementById('emptyState');
    const contador = document.getElementById('contadorResultados');

    if (!catalogo) return;

    if (contador) {
        contador.textContent = `${catalogoFiltrado.length} producto${catalogoFiltrado.length !== 1 ? 's' : ''}`;
    }

    if (catalogoFiltrado.length === 0) {
        catalogo.style.display = 'none';
        if (empty) empty.style.display = 'block';
        return;
    }

    catalogo.style.display = 'grid';
    if (empty) empty.style.display = 'none';

    catalogo.innerHTML = catalogoFiltrado.map(p => {
        const stock = Number(p.stock) || 0;
        let stockClass = '';
        let stockBadge = '';
        
        if (stock === 0) {
            stockClass = 'agotado';
            stockBadge = '<span class="producto-badge sin-stock">Agotado</span>';
        } else if (stock <= 5) {
            stockClass = 'bajo';
            stockBadge = '<span class="producto-badge stock-bajo">Poco stock</span>';
        }

        const imagenUrl = convertirUrlGoogleDrive(p.imagenUrl);
        
        const imagen = imagenUrl
            ? `<img src="${imagenUrl}" alt="${p.nombre}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'producto-imagen-placeholder\\'>👔</div>'">`
            : '<div class="producto-imagen-placeholder">👔</div>';

        const btnDisabled = stock === 0 ? 'disabled' : '';
        const btnTexto = stock === 0 ? 'Sin Stock' : '🛒 Agregar';

        return `
            <div class="producto-card">
                <div class="producto-imagen" onclick="verDetalleProducto('${p.id}')">
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
                    <button class="btn-agregar-card" onclick="abrirModalAgregar('${p.id}')" ${btnDisabled}>
                        ${btnTexto}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Ver detalle de producto en modal
function verDetalleProducto(id) {
    const producto = catalogoProductos.find(p => String(p.id) === String(id));
    if (!producto) return;

    const modal = document.getElementById('modalProducto');
    if (!modal) {
        // Si no hay modal de detalle, abrir modal de agregar
        abrirModalAgregar(id);
        return;
    }
    
    const stock = Number(producto.stock) || 0;
    let stockClass = 'disponible';
    if (stock === 0) stockClass = 'agotado';
    else if (stock <= 5) stockClass = 'bajo';

    const imagenUrl = convertirUrlGoogleDrive(producto.imagenUrl);

    const modalImagen = document.getElementById('modalImagen');
    if (modalImagen) {
        modalImagen.src = imagenUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text y=".9em" font-size="50" x="25">👔</text></svg>';
        modalImagen.onerror = function() {
            this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text y=".9em" font-size="50" x="25">👔</text></svg>';
        };
    }
    
    const modalCategoria = document.getElementById('modalCategoria');
    const modalNombre = document.getElementById('modalNombre');
    const modalTipo = document.getElementById('modalTipo');
    const modalPrecio = document.getElementById('modalPrecio');
    const modalStock = document.getElementById('modalStock');
    const modalSucursal = document.getElementById('modalSucursal');
    const modalCodigo = document.getElementById('modalCodigo');
    
    if (modalCategoria) modalCategoria.textContent = producto.categoria || 'Sin categoría';
    if (modalNombre) modalNombre.textContent = producto.nombre;
    if (modalTipo) modalTipo.textContent = producto.tipo || '-';
    if (modalPrecio) modalPrecio.textContent = `S/ ${Number(producto.precioVenta).toFixed(2)}`;
    
    if (modalStock) {
        modalStock.textContent = stock === 0 ? 'Agotado' : `${stock} unidades disponibles`;
        modalStock.className = `stock-valor ${stockClass}`;
    }
    
    if (modalSucursal) modalSucursal.textContent = getNombreSucursal(producto.sucursalId);
    if (modalCodigo) modalCodigo.textContent = producto.id;

    modal.classList.add('active');
}

// =======================================================
//  SISTEMA DE CARRITO DE COMPRAS
// =======================================================

// Inicialización del carrito
function inicializarCarrito() {
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
    }
    actualizarBadgeCarrito();
}

// =======================================================
//  MODAL AGREGAR AL CARRITO
// =======================================================

function abrirModalAgregar(productoId) {
    const producto = catalogoProductos.find(p => String(p.id) === String(productoId));
    if (!producto || Number(producto.stock) === 0) return;
    
    productoModalActual = producto;
    
    const modal = document.getElementById('modalAgregar');
    if (!modal) return;
    
    const imagenUrl = convertirUrlGoogleDrive(producto.imagenUrl);
    
    const modalImg = document.getElementById('modalAgregarImg');
    if (modalImg) {
        modalImg.src = imagenUrl || '';
        modalImg.onerror = function() {
            this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f1f5f9" width="100" height="100"/><text y=".9em" font-size="50" x="25">👔</text></svg>';
        };
    }
    
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
    if (modalCantidad) {
        modalCantidad.value = 1;
        modalCantidad.max = producto.stock;
    }
    
    actualizarSubtotalModal();
    
    modal.classList.add('active');
    
    // Eventos
    const cerrarBtn = document.getElementById('cerrarModalAgregar');
    if (cerrarBtn) cerrarBtn.onclick = () => modal.classList.remove('active');
    
    if (modalCantidad) modalCantidad.oninput = actualizarSubtotalModal;
    
    const btnAgregar = document.getElementById('btnAgregarCarrito');
    if (btnAgregar) btnAgregar.onclick = agregarAlCarrito;
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove('active');
    };
}

function cambiarCantidadModal(delta) {
    const input = document.getElementById('modalCantidad');
    if (!input) return;
    
    let valor = parseInt(input.value) || 1;
    valor += delta;
    
    if (valor < 1) valor = 1;
    if (productoModalActual && valor > productoModalActual.stock) {
        valor = productoModalActual.stock;
        toast('⚠️ Stock máximo alcanzado');
    }
    
    input.value = valor;
    actualizarSubtotalModal();
}

function actualizarSubtotalModal() {
    if (!productoModalActual) return;
    
    const cantidad = parseInt(document.getElementById('modalCantidad')?.value) || 1;
    const subtotal = Number(productoModalActual.precioVenta) * cantidad;
    const modalSubtotal = document.getElementById('modalSubtotal');
    if (modalSubtotal) {
        modalSubtotal.textContent = `S/ ${subtotal.toFixed(2)}`;
    }
}

function agregarAlCarrito() {
    if (!productoModalActual) return;
    
    const cantidad = parseInt(document.getElementById('modalCantidad')?.value) || 1;
    
    // Verificar si ya existe en el carrito
    const existente = carrito.find(item => String(item.id) === String(productoModalActual.id));
    
    if (existente) {
        const nuevaCantidad = existente.cantidad + cantidad;
        if (nuevaCantidad > productoModalActual.stock) {
            toast(`⚠️ Solo hay ${productoModalActual.stock} unidades disponibles`);
            return;
        }
        existente.cantidad = nuevaCantidad;
    } else {
        carrito.push({
            id: productoModalActual.id,
            nombre: productoModalActual.nombre,
            precio: Number(productoModalActual.precioVenta),
            cantidad: cantidad,
            stock: Number(productoModalActual.stock),
            imagenUrl: productoModalActual.imagenUrl,
            categoria: productoModalActual.categoria
        });
    }
    
    guardarCarrito();
    actualizarBadgeCarrito();
    
    toast(`✅ ${productoModalActual.nombre} agregado al carrito`);
    
    const modal = document.getElementById('modalAgregar');
    if (modal) modal.classList.remove('active');
    productoModalActual = null;
}

// =======================================================
//  FUNCIONES DEL CARRITO
// =======================================================

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

function abrirCarrito() {
    const modal = document.getElementById('modalCarrito');
    if (!modal) return;
    
    let overlay = document.querySelector('.overlay-carrito');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'overlay-carrito';
        document.body.appendChild(overlay);
    }
    
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
        
        return `
            <div class="carrito-item">
                <img class="carrito-item-img" src="${imagenUrl || ''}" 
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f1f5f9%22 width=%22100%22 height=%22100%22/><text y=%22.9em%22 font-size=%2250%22 x=%2225%22>👔</text></svg>'">
                <div class="carrito-item-info">
                    <div class="carrito-item-nombre">${item.nombre}</div>
                    <div class="carrito-item-precio">S/ ${item.precio.toFixed(2)} c/u</div>
                    <div class="carrito-item-cantidad">
                        <button onclick="cambiarCantidadCarrito(${index}, -1)">−</button>
                        <input type="number" value="${item.cantidad}" min="1" max="${item.stock}" 
                               onchange="actualizarCantidadCarrito(${index}, this.value)">
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
    
    if (nuevaCantidad < 1) {
        eliminarDelCarrito(index);
        return;
    }
    
    if (nuevaCantidad > item.stock) {
        toast('⚠️ Stock máximo alcanzado');
        return;
    }
    
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
    if (carritoTotal) {
        carritoTotal.textContent = `S/ ${total.toFixed(2)}`;
    }
}

function irAFinalizarCompra() {
    if (carrito.length === 0) {
        toast('❌ El carrito está vacío');
        return;
    }
    cerrarCarrito();
    cargarVistaEmpleado('finalizar-compra');
}

// =======================================================
//  FUNCIONES ACTUALIZADAS PARA FINALIZAR COMPRA
//  (3 opciones: DNI, RUC, Solo Nota)
//  
//  REEMPLAZAR las funciones existentes en empleado.js
// =======================================================

// =======================================================
//  INICIALIZAR FINALIZAR COMPRA
// =======================================================

function inicializarFinalizarCompra() {
    if (carrito.length === 0) {
        toast('❌ No hay productos en el carrito');
        cargarVistaEmpleado('catalogo');
        return;
    }
    
    renderizarCheckout();
    
    // Configurar eventos para los 3 tipos de documento
    const tipoDocRadios = document.querySelectorAll('input[name="tipoDoc"]');
    tipoDocRadios.forEach(radio => {
        radio.addEventListener('change', cambiarTipoDocumento);
    });
    
    // Inicializar con "Solo Nota" seleccionado
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

// =======================================================
//  RENDERIZAR CHECKOUT
// =======================================================

function renderizarCheckout() {
    const container = document.getElementById('checkoutProductos');
    const itemsCount = document.getElementById('itemsCount');
    if (!container) return;
    
    let total = 0;
    let totalItems = 0;
    
    container.innerHTML = carrito.map(item => {
        const subtotal = item.precio * item.cantidad;
        total += subtotal;
        totalItems += item.cantidad;
        const imagenUrl = convertirUrlGoogleDrive(item.imagenUrl);
        
        return `
            <div class="checkout-item">
                <img class="checkout-item-img" src="${imagenUrl || ''}"
                     onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23f1f5f9%22 width=%22100%22 height=%22100%22/><text y=%22.9em%22 font-size=%2250%22 x=%2225%22>👔</text></svg>'">
                <div class="checkout-item-info">
                    <div class="checkout-item-nombre">${item.nombre}</div>
                    <div class="checkout-item-detalle">${item.cantidad} x S/ ${item.precio.toFixed(2)}</div>
                </div>
                <div class="checkout-item-subtotal">S/ ${subtotal.toFixed(2)}</div>
            </div>
        `;
    }).join('');
    
    // Actualizar contador
    if (itemsCount) {
        itemsCount.textContent = `${totalItems} producto${totalItems !== 1 ? 's' : ''}`;
    }
    
    const checkoutSubtotal = document.getElementById('checkoutSubtotal');
    const checkoutTotal = document.getElementById('checkoutTotal');
    
    if (checkoutSubtotal) checkoutSubtotal.textContent = `S/ ${total.toFixed(2)}`;
    if (checkoutTotal) checkoutTotal.textContent = `S/ ${total.toFixed(2)}`;
}

// =======================================================
//  CAMBIAR TIPO DE DOCUMENTO (3 opciones)
// =======================================================

function cambiarTipoDocumento() {
    const tipo = document.querySelector('input[name="tipoDoc"]:checked')?.value || 'NOTA';
    
    const camposNota = document.getElementById('camposNota');
    const camposDNI = document.getElementById('camposDNI');
    const camposRUC = document.getElementById('camposRUC');
    const camposContacto = document.getElementById('camposContacto');
    
    // Ocultar todos primero
    if (camposNota) camposNota.style.display = 'none';
    if (camposDNI) camposDNI.style.display = 'none';
    if (camposRUC) camposRUC.style.display = 'none';
    if (camposContacto) camposContacto.style.display = 'none';
    
    // Mostrar según selección
    switch (tipo) {
        case 'NOTA':
            if (camposNota) camposNota.style.display = 'block';
            // No mostrar campos de contacto para Solo Nota
            break;
            
        case 'DNI':
            if (camposDNI) camposDNI.style.display = 'block';
            if (camposContacto) camposContacto.style.display = 'block';
            break;
            
        case 'RUC':
            if (camposRUC) camposRUC.style.display = 'block';
            if (camposContacto) camposContacto.style.display = 'block';
            break;
    }
    
    // Limpiar campos al cambiar
    limpiarCamposCliente();
}

function limpiarCamposCliente() {
    // Limpiar campos DNI
    const dniField = document.getElementById('clienteDNI');
    const nombresField = document.getElementById('clienteNombres');
    const apellidosField = document.getElementById('clienteApellidos');
    if (dniField) dniField.value = '';
    if (nombresField) nombresField.value = '';
    if (apellidosField) apellidosField.value = '';
    
    // Limpiar campos RUC
    const rucField = document.getElementById('clienteRUC');
    const razonField = document.getElementById('clienteRazonSocial');
    const dirField = document.getElementById('clienteDireccion');
    if (rucField) rucField.value = '';
    if (razonField) razonField.value = '';
    if (dirField) dirField.value = '';
    
    // Limpiar campos contacto
    const celularField = document.getElementById('clienteCelular');
    const correoField = document.getElementById('clienteCorreo');
    if (celularField) celularField.value = '';
    if (correoField) correoField.value = '';
}

// =======================================================
//  PROCESAR COMPRA (actualizado con 3 opciones)
// =======================================================

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
                cantidad: item.cantidad,
                total: item.precio * item.cantidad,
                metodoPago: metodoPago,
                clienteDoc: clienteData.documento,
                clienteNombre: clienteData.nombreCompleto,
                clienteCelular: clienteData.celular || '-',
                clienteCorreo: clienteData.correo || '',
                numeroNota: numeroNota,
                tipoComprobante: tipoDoc,
                esNotaSimple: tipoDoc === 'NOTA' ? 'SI' : 'NO'
            });
        }
        
        // Enviar notificación al admin (marcar si es nota simple)
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
            archivada: tipoDoc === 'NOTA', // Si es solo nota, se marca como archivada
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

// =======================================================
//  MOSTRAR NOTA DE VENTA FINAL (actualizada)
// =======================================================

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
    let productosHTML = datos.productos.map(p => `
        <tr>
            <td>${p.nombre}</td>
            <td>${p.cantidad}</td>
            <td>S/ ${p.precio.toFixed(2)}</td>
            <td>S/ ${(p.precio * p.cantidad).toFixed(2)}</td>
        </tr>
    `).join('');
    
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

// =======================================================
//  DESCARGAR NOTA DE VENTA PDF (sin cambios)
// =======================================================

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
//  GENERAR NÚMERO DE NOTA (sin cambios)
// =======================================================

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

function cerrarNotaYNueva() {
    const modal = document.getElementById('modalNotaVentaFinal');
    if (modal) modal.classList.remove('active');
    cargarVistaEmpleado('catalogo');
}

// =======================================================
//  HELPER - GENERAR NÚMERO DE NOTA
// =======================================================

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

// =======================================================
//  FUNCIONES PARA EXPORTAR EXCEL
// =======================================================

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

// =======================================================
//  BUSCAR DNI Y RUC - API DECOLECTA
//  Agregar estas funciones a empleado.js
// =======================================================

const API_TOKEN = 'sk_10927.wZXEwHRpLf5ruSByh7Kkv6fL03e2Ll4s';


// =======================================================
//  BUSCAR DNI EN RENIEC
// =======================================================

async function buscarDNI() {
    const inputDNI = document.getElementById('clienteDNI');
    const inputNombres = document.getElementById('clienteNombres');
    const inputApellidos = document.getElementById('clienteApellidos');
    const btnBuscar = document.getElementById('btnBuscarDNI');
    const iconoBuscar = document.getElementById('btnBuscarDNIIcon');
    
    if (!inputDNI || !inputNombres || !inputApellidos) {
        console.error('❌ Elementos de DNI no encontrados');
        return;
    }
    
    const dni = inputDNI.value.trim();
    
    // Validar formato
    if (dni.length !== 8) {
        toast('⚠️ El DNI debe tener 8 dígitos');
        return;
    }
    
    if (!/^\d{8}$/.test(dni)) {
        toast('⚠️ El DNI solo debe contener números');
        return;
    }
    
    // Deshabilitar botón mientras busca
    if (btnBuscar) {
        btnBuscar.disabled = true;
    }
    if (iconoBuscar) {
        iconoBuscar.textContent = '⏳';
    }
    
    try {
        // ✅ Llamar al BACKEND en lugar de la API directamente
        const resultado = await apiCall('buscarDNI', { dni: dni });
        
        if (resultado.success && resultado.datos) {
            // Rellenar los campos con los datos obtenidos
            inputNombres.value = resultado.datos.nombres || '';
            inputApellidos.value = `${resultado.datos.apellidoPaterno || ''} ${resultado.datos.apellidoMaterno || ''}`.trim();
            
            toast('✅ Datos encontrados en RENIEC');
            
            // Enfocar en el siguiente campo (celular)
            const inputCelular = document.getElementById('clienteCelular');
            if (inputCelular) {
                inputCelular.focus();
            }
            
        } else {
            // Mostrar error específico
            throw new Error(resultado.error || 'Error al consultar DNI');
        }
        
    } catch (error) {
        console.error('Error buscando DNI:', error);
        
        // Mostrar mensaje de error apropiado
        if (error.message.includes('no encontrado')) {
            toast('❌ DNI no encontrado en RENIEC');
        } else if (error.message.includes('autenticación')) {
            toast('❌ Error de autenticación con la API');
        } else {
            toast('⚠️ No se pudo consultar. Ingresa el nombre manualmente');
        }
        
        // Limpiar y permitir ingreso manual
        inputNombres.value = '';
        inputApellidos.value = '';
        inputNombres.removeAttribute('readonly');
        inputApellidos.removeAttribute('readonly');
        inputNombres.focus();
        
    } finally {
        // Rehabilitar botón
        if (btnBuscar) {
            btnBuscar.disabled = false;
        }
        if (iconoBuscar) {
            iconoBuscar.textContent = '🔍';
        }
    }
}

// =======================================================
//  BUSCAR RUC EN SUNAT (A TRAVÉS DEL BACKEND)
// =======================================================

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
    if (btnBuscar) {
        btnBuscar.disabled = true;
    }
    if (iconoBuscar) {
        iconoBuscar.textContent = '⏳';
    }
    
    try {
        // ✅ Llamar al BACKEND en lugar de la API directamente
        const resultado = await apiCall('buscarRUC', { ruc: ruc });
        
        if (resultado.success && resultado.datos) {
            // Rellenar los campos con los datos obtenidos
            inputRazonSocial.value = resultado.datos.razonSocial || '';
            
            // Si hay dirección, agregarla
            if (inputDireccion && resultado.datos.direccion) {
                inputDireccion.value = resultado.datos.direccion;
            }
            
            toast('✅ Datos encontrados en SUNAT');
            
            // Enfocar en el siguiente campo (celular)
            const inputCelular = document.getElementById('clienteCelular');
            if (inputCelular) {
                inputCelular.focus();
            }
            
        } else {
            // Mostrar error específico
            throw new Error(resultado.error || 'Error al consultar RUC');
        }
        
    } catch (error) {
        console.error('Error buscando RUC:', error);
        
        // Mostrar mensaje de error apropiado
        if (error.message.includes('no encontrado')) {
            toast('❌ RUC no encontrado en SUNAT');
        } else if (error.message.includes('autenticación')) {
            toast('❌ Error de autenticación con la API');
        } else {
            toast('⚠️ No se pudo consultar. Ingresa la razón social manualmente');
        }
        
        // Limpiar y permitir ingreso manual
        inputRazonSocial.value = '';
        if (inputDireccion) {
            inputDireccion.value = '';
        }
        inputRazonSocial.removeAttribute('readonly');
        if (inputDireccion) {
            inputDireccion.removeAttribute('readonly');
        }
        inputRazonSocial.focus();
        
    } finally {
        // Rehabilitar botón
        if (btnBuscar) {
            btnBuscar.disabled = false;
        }
        if (iconoBuscar) {
            iconoBuscar.textContent = '🔍';
        }
    }
}


// Validar DNI mientras escribe (solo números, máximo 8)
function validarInputDNI() {
    const inputDNI = document.getElementById('clienteDni');
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
            if (btnBuscar) {
                btnBuscar.focus();
            }
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

// Validar RUC mientras escribe (solo números, máximo 11)
function validarInputRUC() {
    const inputRUC = document.getElementById('clienteRuc');
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
            if (btnBuscar) {
                btnBuscar.focus();
            }
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

// =======================================================
//  INICIALIZAR VALIDACIONES
//  Llamar esto cuando cargue la vista de finalizar compra
// =======================================================

function inicializarValidacionesDocumentos() {
    validarInputDNI();
    validarInputRUC();
}


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
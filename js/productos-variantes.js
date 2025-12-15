// =======================================================
//  PRODUCTOS CON VARIANTES - FUNCIONES
//  Agregar a admin.js (reemplazar funciones de productos)
// =======================================================

// Variables para variantes y confirmación
let variantesGeneradas = [];
let accionPendiente = null;
let productoPendiente = null;

// =======================================================
//  INICIALIZAR PRODUCTOS
// =======================================================
async function inicializarProductos() {
    await cargarSelectSucursales("prodSucursal");
    await cargarSelectSucursales("editProdSucursal");
    await cargarFiltrosProductos();
    await renderizarTablaProductos();
    
    configurarEventosProductos();
    
    const btn = document.getElementById("btnGuardarProducto");
    if (btn) btn.onclick = guardarProductoConVariantes;
}

function configurarEventosProductos() {
    // Calcular margen en tiempo real
    const precioCompra = document.getElementById("prodPrecioCompra");
    const precioVenta = document.getElementById("prodPrecio");
    
    if (precioCompra) precioCompra.addEventListener('input', calcularMargenPreview);
    if (precioVenta) precioVenta.addEventListener('input', calcularMargenPreview);
    
    // Upload de imagen
    const uploadArea = document.getElementById("uploadArea");
    const fileInput = document.getElementById("prodImagen");
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                mostrarPreviewImagen(e.dataTransfer.files[0]);
            }
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                mostrarPreviewImagen(e.target.files[0]);
            }
        });
    }
    
    // Filtros de tabla
    const buscar = document.getElementById('buscarProducto');
    const filtroCat = document.getElementById('filtroCategoriaProd');
    const filtroSuc = document.getElementById('filtroSucursalProd');
    
    if (buscar) buscar.addEventListener('input', filtrarTablaProductos);
    if (filtroCat) filtroCat.addEventListener('change', filtrarTablaProductos);
    if (filtroSuc) filtroSuc.addEventListener('change', filtrarTablaProductos);
    
    // Actualizar resumen de variantes cuando cambie stock
    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('variante-stock')) {
            actualizarResumenVariantes();
        }
    });
}

// =======================================================
//  CALCULAR MARGEN EN TIEMPO REAL
// =======================================================
function calcularMargenPreview() {
    const compra = Number(document.getElementById("prodPrecioCompra")?.value) || 0;
    const venta = Number(document.getElementById("prodPrecio")?.value) || 0;
    
    const ganancia = venta - compra;
    const margen = venta > 0 ? (ganancia / venta) * 100 : 0;
    
    const gananciEl = document.getElementById("previewGanancia");
    const margenEl = document.getElementById("previewMargen");
    
    if (gananciEl) {
        gananciEl.textContent = `S/ ${ganancia.toFixed(2)}`;
        gananciEl.style.color = ganancia >= 0 ? '#10b981' : '#ef4444';
    }
    if (margenEl) {
        margenEl.textContent = `${margen.toFixed(1)}%`;
        margenEl.style.color = margen >= 20 ? '#10b981' : (margen >= 10 ? '#f59e0b' : '#ef4444');
    }
}

// =======================================================
//  PREVIEW DE IMAGEN
// =======================================================
function mostrarPreviewImagen(file) {
    if (!file.type.startsWith('image/')) {
        toast('❌ Solo se permiten imágenes');
        return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
        toast('❌ La imagen no debe superar 2MB');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById("prodPreview");
        const previewWrapper = document.getElementById("previewWrapper");
        const uploadEmpty = document.getElementById("uploadEmpty");
        
        if (preview) preview.src = e.target.result;
        if (previewWrapper) previewWrapper.style.display = "block";
        if (uploadEmpty) uploadEmpty.style.display = "none";
    };
    reader.readAsDataURL(file);
}

function removerImagen() {
    const fileInput = document.getElementById("prodImagen");
    const preview = document.getElementById("prodPreview");
    const previewWrapper = document.getElementById("previewWrapper");
    const uploadEmpty = document.getElementById("uploadEmpty");
    
    if (fileInput) fileInput.value = "";
    if (preview) preview.src = "";
    if (previewWrapper) previewWrapper.style.display = "none";
    if (uploadEmpty) uploadEmpty.style.display = "flex";
}

// =======================================================
//  GENERAR VARIANTES (TALLA x COLOR)
// =======================================================
function generarTablaVariantes() {
    // Obtener colores seleccionados
    const coloresChecks = document.querySelectorAll('#coloresSelector input:checked');
    const colores = Array.from(coloresChecks).map(c => c.value);
    
    // Obtener tallas seleccionadas
    const tallasChecks = document.querySelectorAll('.talla-check input:checked');
    const tallas = Array.from(tallasChecks).map(t => t.value);
    
    if (colores.length === 0) {
        toast('⚠️ Selecciona al menos un color');
        return;
    }
    
    if (tallas.length === 0) {
        toast('⚠️ Selecciona al menos una talla');
        return;
    }
    
    // Generar combinaciones
    variantesGeneradas = [];
    const nombreProd = document.getElementById("prodNombre")?.value.trim() || 'PROD';
    const prefijo = nombreProd.substring(0, 3).toUpperCase();
    
    let contador = 1;
    colores.forEach(color => {
        tallas.forEach(talla => {
            const sku = `${prefijo}-${color.substring(0,3).toUpperCase()}-${talla}-${String(contador).padStart(3,'0')}`;
            variantesGeneradas.push({
                color,
                talla,
                sku,
                stock: 0,
                activo: true
            });
            contador++;
        });
    });
    
    // Mostrar tabla
    renderizarTablaVariantesForm();
    
    document.getElementById('variantesContainer').style.display = 'block';
    toast(`✅ ${variantesGeneradas.length} variantes generadas`);
}

function renderizarTablaVariantesForm() {
    const tbody = document.getElementById('tablaVariantes');
    if (!tbody) return;
    
    tbody.innerHTML = variantesGeneradas.map((v, index) => `
        <tr>
            <td>${getColorIcon(v.color)} ${v.color}</td>
            <td><strong>${v.talla}</strong></td>
            <td>
                <input type="text" value="${v.sku}" 
                       onchange="variantesGeneradas[${index}].sku = this.value"
                       style="width:120px;">
            </td>
            <td>
                <input type="number" class="variante-stock" value="${v.stock}" min="0"
                       onchange="variantesGeneradas[${index}].stock = Number(this.value)">
            </td>
            <td>
                <label class="switch-small">
                    <input type="checkbox" ${v.activo ? 'checked' : ''}
                           onchange="variantesGeneradas[${index}].activo = this.checked">
                    <span class="slider-small"></span>
                </label>
            </td>
        </tr>
    `).join('');
    
    actualizarResumenVariantes();
}

function getColorIcon(color) {
    const iconos = {
        'Negro': '⬛', 'Blanco': '⬜', 'Gris': '🔘', 'Azul': '🔵',
        'Rojo': '🔴', 'Verde': '🟢', 'Amarillo': '🟡', 'Rosado': '🩷',
        'Morado': '🟣', 'Naranja': '🟠', 'Beige': '🟤', 'Celeste': '🩵'
    };
    return iconos[color] || '⚪';
}

function aplicarStockTodas() {
    const stockTodas = Number(document.getElementById('stockTodas')?.value) || 0;
    
    variantesGeneradas.forEach((v, index) => {
        v.stock = stockTodas;
    });
    
    renderizarTablaVariantesForm();
    toast(`✅ Stock ${stockTodas} aplicado a todas las variantes`);
}

function actualizarResumenVariantes() {
    const totalVariantes = variantesGeneradas.filter(v => v.activo).length;
    const totalStock = variantesGeneradas.reduce((sum, v) => sum + (v.activo ? v.stock : 0), 0);
    
    const resumenVariantes = document.getElementById('resumenVariantes');
    const resumenStock = document.getElementById('resumenStockTotal');
    
    if (resumenVariantes) resumenVariantes.textContent = `${totalVariantes} variantes activas`;
    if (resumenStock) resumenStock.textContent = `Stock total: ${totalStock}`;
}

// =======================================================
//  GUARDAR PRODUCTO CON VARIANTES
// =======================================================
async function guardarProductoConVariantes() {
    const nombre = document.getElementById("prodNombre")?.value.trim();
    const categoria = document.getElementById("prodCategoria")?.value;
    const tipo = document.getElementById("prodTipo")?.value;
    const precioCompra = Number(document.getElementById("prodPrecioCompra")?.value || 0);
    const precioVenta = Number(document.getElementById("prodPrecio")?.value || 0);
    const sucursalId = document.getElementById("prodSucursal")?.value;
    
    // Validaciones
    if (!nombre) { toast("❌ El nombre es requerido"); return; }
    if (!categoria) { toast("❌ Selecciona una categoría"); return; }
    if (!tipo) { toast("❌ Selecciona el género"); return; }
    if (precioVenta <= 0) { toast("❌ El precio de venta debe ser mayor a 0"); return; }
    if (!sucursalId) { toast("❌ Selecciona una sucursal"); return; }
    
    // Validar variantes
    const variantesActivas = variantesGeneradas.filter(v => v.activo);
    if (variantesActivas.length === 0) {
        toast("⚠️ Genera al menos una variante (talla/color)");
        return;
    }
    
    const loadingEl = document.getElementById("imageLoading");
    const btnGuardar = document.getElementById("btnGuardarProducto");
    
    if (loadingEl) loadingEl.style.display = "flex";
    if (btnGuardar) btnGuardar.disabled = true;
    
    try {
        // Subir imagen si existe
        const fileInput = document.getElementById("prodImagen");
        const file = fileInput?.files[0] || null;
        let imagenBase64 = "";
        
        if (file) {
            const base64Full = await fileToBase64(file);
            imagenBase64 = base64Full.split(",")[1];
        }
        
        // Calcular stock total
        const stockTotal = variantesActivas.reduce((sum, v) => sum + v.stock, 0);
        
        // Guardar producto principal
        const resp = await apiCall({
            action: "crearProducto",
            nombre,
            categoria,
            tipo,
            precioCompra,
            precioVenta,
            stock: stockTotal,
            sucursalId,
            imagenBase64,
            tieneVariantes: true
        });
        
        if (resp.success) {
            const productoId = resp.id;
            
            // Guardar cada variante
            for (const variante of variantesActivas) {
                await apiCall({
                    action: "crearVariante",
                    productoId,
                    color: variante.color,
                    talla: variante.talla,
                    sku: variante.sku,
                    stock: variante.stock
                });
            }
            
            toast(`✅ Producto guardado con ${variantesActivas.length} variantes`);
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

// =======================================================
//  LIMPIAR FORMULARIO
// =======================================================
function limpiarFormularioProducto() {
    // Campos de texto
    ['prodNombre', 'prodCategoria', 'prodTipo', 'prodPrecioCompra', 'prodPrecio', 'prodSucursal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // Imagen
    removerImagen();
    
    // Margen preview
    const gananciEl = document.getElementById("previewGanancia");
    const margenEl = document.getElementById("previewMargen");
    if (gananciEl) gananciEl.textContent = "S/ 0.00";
    if (margenEl) margenEl.textContent = "0%";
    
    // Checkboxes de colores y tallas
    document.querySelectorAll('#coloresSelector input, .talla-check input').forEach(cb => {
        cb.checked = false;
    });
    
    // Variantes
    variantesGeneradas = [];
    document.getElementById('variantesContainer').style.display = 'none';
    document.getElementById('tablaVariantes').innerHTML = '';
}

// =======================================================
//  RENDERIZAR TABLA DE PRODUCTOS
// =======================================================
async function renderizarTablaProductos() {
    const data = await apiCall({ action: "getProductos" });
    productosCache = data.productos || [];
    
    // Obtener variantes de cada producto
    const variantesData = await apiCall({ action: "getVariantes" });
    const variantes = variantesData.variantes || [];
    
    const countEl = document.getElementById("productoCount");
    if (countEl) countEl.textContent = `${productosCache.length} producto${productosCache.length !== 1 ? 's' : ''}`;
    
    const tbody = document.getElementById("tablaProductos");
    if (!tbody) return;
    
    tbody.innerHTML = productosCache.map(p => {
        const precioCompra = Number(p.precioCompra) || 0;
        const precioVenta = Number(p.precioVenta) || 0;
        const ganancia = precioVenta - precioCompra;
        const margen = precioVenta > 0 ? (ganancia / precioVenta) * 100 : 0;
        
        // Contar variantes de este producto
        const variantesProd = variantes.filter(v => String(v.productoId) === String(p.id));
        const numVariantes = variantesProd.length;
        const stockTotal = variantesProd.reduce((sum, v) => sum + (Number(v.stock) || 0), 0) || Number(p.stock) || 0;
        
        const imagenUrl = convertirUrlGoogleDrive(p.imagenUrl);
        const imagenHtml = imagenUrl 
            ? `<img src="${imagenUrl}" class="product-img-cell" onclick="abrirModalImagen('${p.imagenUrl}')" onerror="this.outerHTML='<div class=\\'product-img-placeholder\\'>👔</div>'" loading="lazy">`
            : `<div class="product-img-placeholder">👔</div>`;
        
        const variantesHtml = numVariantes > 0
            ? `<span class="variantes-badge" onclick="verVariantes(${p.id})">${numVariantes} var.</span>`
            : '<span style="color:#94a3b8;">-</span>';
        
        return `<tr data-nombre="${p.nombre.toLowerCase()}" data-categoria="${p.categoria}" data-sucursal="${p.sucursalId}">
            <td><code>${p.id}</code></td>
            <td>${imagenHtml}</td>
            <td><strong>${p.nombre}</strong></td>
            <td>${p.categoria || '-'}</td>
            <td>${p.tipo || '-'}</td>
            <td>S/ ${precioCompra.toFixed(2)}</td>
            <td><span style="color:#10b981;font-weight:600;">S/ ${precioVenta.toFixed(2)}</span></td>
            <td><span class="margen-badge ${getMargenClass(margen)}">${margen.toFixed(1)}%</span></td>
            <td>${variantesHtml}</td>
            <td><span class="${stockTotal <= 5 ? 'stock-bajo' : 'stock-ok'}">${stockTotal}</span></td>
            <td>${getNombreSucursal(p.sucursalId)}</td>
            <td>
                <button class="btn-action btn-view" onclick="verVariantes(${p.id})" title="Ver variantes">📏</button>
                <button class="btn-action btn-edit" onclick="abrirModalEditar(${p.id})" title="Editar">✏️</button>
                <button class="btn-action btn-delete" onclick="confirmarEliminar(${p.id})" title="Eliminar">🗑️</button>
            </td>
        </tr>`;
    }).join("");
}

// =======================================================
//  FILTRAR TABLA
// =======================================================
async function cargarFiltrosProductos() {
    // Cargar categorías únicas
    const categorias = [...new Set(productosCache.map(p => p.categoria).filter(Boolean))];
    const selectCat = document.getElementById('filtroCategoriaProd');
    if (selectCat) {
        selectCat.innerHTML = '<option value="">Todas las categorías</option>' +
            categorias.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    
    // Cargar sucursales
    const selectSuc = document.getElementById('filtroSucursalProd');
    if (selectSuc) {
        selectSuc.innerHTML = '<option value="">Todas las sucursales</option>' +
            sucursalesCache.map(s => `<option value="${s.id}">${s.nombre}</option>`).join('');
    }
}

function filtrarTablaProductos() {
    const busqueda = document.getElementById('buscarProducto')?.value.toLowerCase() || '';
    const categoria = document.getElementById('filtroCategoriaProd')?.value || '';
    const sucursal = document.getElementById('filtroSucursalProd')?.value || '';
    
    const filas = document.querySelectorAll('#tablaProductos tr');
    
    filas.forEach(fila => {
        const nombre = fila.dataset.nombre || '';
        const cat = fila.dataset.categoria || '';
        const suc = fila.dataset.sucursal || '';
        
        const coincideBusqueda = !busqueda || nombre.includes(busqueda);
        const coincideCategoria = !categoria || cat === categoria;
        const coincideSucursal = !sucursal || suc === sucursal;
        
        fila.style.display = (coincideBusqueda && coincideCategoria && coincideSucursal) ? '' : 'none';
    });
}

// =======================================================
//  VER VARIANTES
// =======================================================
async function verVariantes(productoId) {
    const producto = productosCache.find(p => String(p.id) === String(productoId));
    if (!producto) return;
    
    const data = await apiCall({ action: "getVariantesPorProducto", productoId });
    const variantes = data.variantes || [];
    
    document.getElementById('variantesProductoNombre').textContent = producto.nombre;
    
    const tbody = document.getElementById('tablaVerVariantes');
    if (tbody) {
        if (variantes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">Este producto no tiene variantes</td></tr>';
        } else {
            tbody.innerHTML = variantes.map(v => {
                const stock = Number(v.stock) || 0;
                const estado = stock > 5 ? '✅ Disponible' : (stock > 0 ? '⚠️ Stock bajo' : '❌ Agotado');
                const estadoColor = stock > 5 ? '#10b981' : (stock > 0 ? '#f59e0b' : '#ef4444');
                
                return `<tr>
                    <td>${getColorIcon(v.color)} ${v.color}</td>
                    <td><strong>${v.talla}</strong></td>
                    <td><code>${v.sku || '-'}</code></td>
                    <td><span style="color:${estadoColor};font-weight:600;">${stock}</span></td>
                    <td style="color:${estadoColor};">${estado}</td>
                </tr>`;
            }).join('');
        }
    }
    
    document.getElementById('modalVerVariantes').classList.add('active');
}

function cerrarModalVariantes() {
    document.getElementById('modalVerVariantes').classList.remove('active');
}

// =======================================================
//  EDITAR PRODUCTO
// =======================================================
async function abrirModalEditar(productoId) {
    const producto = productosCache.find(p => String(p.id) === String(productoId));
    if (!producto) return;
    
    productoPendiente = producto;
    
    // Llenar formulario
    document.getElementById('editProdId').value = producto.id;
    document.getElementById('editProdNombre').value = producto.nombre;
    document.getElementById('editProdCategoria').value = producto.categoria || '';
    document.getElementById('editProdTipo').value = producto.tipo || '';
    document.getElementById('editProdPrecioCompra').value = producto.precioCompra || 0;
    document.getElementById('editProdPrecio').value = producto.precioVenta || 0;
    document.getElementById('editProdSucursal').value = producto.sucursalId || '';
    
    // Cargar variantes
    const data = await apiCall({ action: "getVariantesPorProducto", productoId });
    const variantes = data.variantes || [];
    
    const tbody = document.getElementById('editTablaVariantes');
    if (tbody) {
        if (variantes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#94a3b8;">Sin variantes</td></tr>';
        } else {
            tbody.innerHTML = variantes.map(v => `
                <tr data-variante-id="${v.id}">
                    <td>${getColorIcon(v.color)} ${v.color}</td>
                    <td><strong>${v.talla}</strong></td>
                    <td><code>${v.sku || '-'}</code></td>
                    <td>
                        <input type="number" class="edit-variante-stock" value="${v.stock || 0}" min="0" style="width:70px;">
                    </td>
                    <td>
                        <select class="edit-variante-estado">
                            <option value="ACTIVO" ${v.estado !== 'INACTIVO' ? 'selected' : ''}>Activo</option>
                            <option value="INACTIVO" ${v.estado === 'INACTIVO' ? 'selected' : ''}>Inactivo</option>
                        </select>
                    </td>
                </tr>
            `).join('');
        }
    }
    
    document.getElementById('modalEditarProducto').classList.add('active');
}

function cerrarModalEditar() {
    document.getElementById('modalEditarProducto').classList.remove('active');
    productoPendiente = null;
}

async function confirmarEdicion() {
    // Preparar datos
    const datos = {
        id: document.getElementById('editProdId').value,
        nombre: document.getElementById('editProdNombre').value.trim(),
        categoria: document.getElementById('editProdCategoria').value,
        tipo: document.getElementById('editProdTipo').value,
        precioCompra: Number(document.getElementById('editProdPrecioCompra').value || 0),
        precioVenta: Number(document.getElementById('editProdPrecio').value || 0),
        sucursalId: document.getElementById('editProdSucursal').value
    };
    
    // Validar
    if (!datos.nombre) { toast("❌ El nombre es requerido"); return; }
    if (datos.precioVenta <= 0) { toast("❌ El precio de venta debe ser mayor a 0"); return; }
    
    // Preparar acción
    accionPendiente = {
        tipo: 'editar',
        datos: datos
    };
    
    // Mostrar modal de confirmación
    document.getElementById('confirmIcon').textContent = '✏️';
    document.getElementById('modalConfirmTitulo').textContent = '⚠️ Confirmar Edición';
    document.getElementById('modalConfirmMensaje').textContent = `¿Está seguro que desea modificar el producto "${datos.nombre}"?`;
    document.getElementById('modalConfirmDetalle').textContent = 'Los cambios se aplicarán inmediatamente.';
    document.getElementById('btnConfirmarAccion').textContent = 'Confirmar Edición';
    document.getElementById('btnConfirmarAccion').className = 'btn-primary';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('confirmError').style.display = 'none';
    
    document.getElementById('modalConfirmarAccion').classList.add('active');
}

// =======================================================
//  ELIMINAR PRODUCTO
// =======================================================
function confirmarEliminar(productoId) {
    const producto = productosCache.find(p => String(p.id) === String(productoId));
    if (!producto) return;
    
    productoPendiente = producto;
    
    accionPendiente = {
        tipo: 'eliminar',
        datos: { id: productoId }
    };
    
    // Mostrar modal de confirmación
    document.getElementById('confirmIcon').textContent = '🗑️';
    document.getElementById('modalConfirmTitulo').textContent = '⚠️ Confirmar Eliminación';
    document.getElementById('modalConfirmMensaje').textContent = `¿Está seguro que desea ELIMINAR el producto "${producto.nombre}"?`;
    document.getElementById('modalConfirmDetalle').textContent = 'Esta acción NO se puede deshacer. Se eliminarán también todas las variantes asociadas.';
    document.getElementById('btnConfirmarAccion').textContent = 'Eliminar Producto';
    document.getElementById('btnConfirmarAccion').className = 'btn-danger';
    document.getElementById('confirmPassword').value = '';
    document.getElementById('confirmError').style.display = 'none';
    
    document.getElementById('modalConfirmarAccion').classList.add('active');
}

function cerrarModalConfirm() {
    document.getElementById('modalConfirmarAccion').classList.remove('active');
    accionPendiente = null;
    productoPendiente = null;
}

// =======================================================
//  EJECUTAR ACCIÓN CON VERIFICACIÓN DE CONTRASEÑA
// =======================================================
async function ejecutarAccionConfirmada() {
    const password = document.getElementById('confirmPassword').value;
    
    if (!password) {
        document.getElementById('confirmError').textContent = '❌ Ingrese la contraseña';
        document.getElementById('confirmError').style.display = 'block';
        return;
    }
    
    // Obtener usuario actual
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    if (!user) {
        toast('❌ Sesión expirada');
        window.location.href = 'index.html';
        return;
    }
    
    // Verificar contraseña con el backend
    const verificacion = await apiCall({
        action: 'verificarPassword',
        email: user.email,
        password: password
    });
    
    if (!verificacion.success) {
        document.getElementById('confirmError').textContent = '❌ Contraseña incorrecta';
        document.getElementById('confirmError').style.display = 'block';
        document.getElementById('confirmPassword').value = '';
        return;
    }
    
    // Ejecutar acción según el tipo
    if (accionPendiente.tipo === 'eliminar') {
        await ejecutarEliminacion();
    } else if (accionPendiente.tipo === 'editar') {
        await ejecutarEdicion();
    }
    
    cerrarModalConfirm();
}

async function ejecutarEliminacion() {
    try {
        // Eliminar variantes primero
        await apiCall({
            action: 'eliminarVariantesProducto',
            productoId: accionPendiente.datos.id
        });
        
        // Eliminar producto
        const resp = await apiCall({
            action: 'eliminarProducto',
            id: accionPendiente.datos.id
        });
        
        if (resp.success) {
            toast('✅ Producto eliminado correctamente');
            await renderizarTablaProductos();
        } else {
            toast('❌ Error: ' + (resp.error || 'No se pudo eliminar'));
        }
    } catch (error) {
        console.error('Error eliminando:', error);
        toast('❌ Error al eliminar');
    }
}

async function ejecutarEdicion() {
    try {
        // Actualizar producto
        const resp = await apiCall({
            action: 'actualizarProducto',
            ...accionPendiente.datos
        });
        
        if (resp.success) {
            // Actualizar variantes si hay
            const filas = document.querySelectorAll('#editTablaVariantes tr[data-variante-id]');
            for (const fila of filas) {
                const varianteId = fila.dataset.varianteId;
                const stock = fila.querySelector('.edit-variante-stock')?.value || 0;
                const estado = fila.querySelector('.edit-variante-estado')?.value || 'ACTIVO';
                
                await apiCall({
                    action: 'actualizarVariante',
                    id: varianteId,
                    stock: Number(stock),
                    estado: estado
                });
            }
            
            toast('✅ Producto actualizado correctamente');
            cerrarModalEditar();
            await renderizarTablaProductos();
        } else {
            toast('❌ Error: ' + (resp.error || 'No se pudo actualizar'));
        }
    } catch (error) {
        console.error('Error actualizando:', error);
        toast('❌ Error al actualizar');
    }
}

function agregarVarianteEdicion() {
    toast('📝 Función en desarrollo - usa el formulario de nuevo producto para agregar variantes');
}
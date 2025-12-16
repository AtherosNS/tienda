/*******************************************
 *  PRODUCTOS CON VARIANTES - ADMIN
 *******************************************/

let productoEditando = null;
let accionPendiente = null;

// Inicializar vista de productos
async function initProductos() {
    await cargarSucursalesSelect();
    await cargarProductos();
    configurarEventos();
}

// Configurar todos los event listeners
function configurarEventos() {
    // Formulario producto
    const form = document.getElementById('formProducto');
    if (form) {
        form.addEventListener('submit', handleSubmitProducto);
    }
    
    // Botón agregar variante
    const btnAgregar = document.getElementById('btnAgregarVariante');
    if (btnAgregar) {
        btnAgregar.addEventListener('click', agregarVariante);
    }
    
    // Botón cancelar edición
    const btnCancelar = document.getElementById('btnCancelarEdicion');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', cancelarEdicion);
    }
    
    // Selector de archivo de imagen
    const fileInput = document.getElementById('prodImagen');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const fileName = e.target.files[0]?.name || 'Ningún archivo seleccionado';
            document.getElementById('fileName').textContent = fileName;
        });
    }
    
    // Modal confirmación
    const btnCancelarModal = document.getElementById('btnCancelarModal');
    if (btnCancelarModal) {
        btnCancelarModal.addEventListener('click', cerrarModal);
    }
    
    const btnConfirmarModal = document.getElementById('btnConfirmarModal');
    if (btnConfirmarModal) {
        btnConfirmarModal.addEventListener('click', ejecutarAccionPendiente);
    }
    
    const modalPassword = document.getElementById('modalPassword');
    if (modalPassword) {
        modalPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                ejecutarAccionPendiente();
            }
        });
    }
    
    // Modal variantes
    const btnCerrarVariantes = document.getElementById('btnCerrarVariantes');
    if (btnCerrarVariantes) {
        btnCerrarVariantes.addEventListener('click', cerrarModalVariantes);
    }
}

// Cargar sucursales en el select
async function cargarSucursalesSelect() {
    const select = document.getElementById('prodSucursal');
    if (!select) return;
    
    const data = await apiCall({ action: 'getSucursales' });
    
    if (data.success) {
        select.innerHTML = '<option value="">Seleccionar...</option>';
        data.sucursales.forEach(s => {
            select.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
        });
    }
}

// Eliminar variante del formulario
function eliminarVariante(index) {
    const item = document.querySelector(`.variante-item[data-index="${index}"]`);
    if (item) {
        item.remove();
        variantesActuales = variantesActuales.filter(v => v.index !== index);
        
        // Si no quedan variantes, mostrar mensaje
        const container = document.getElementById('variantesContainer');
        if (container && container.children.length === 0) {
            container.innerHTML = '<div class="variante-empty">No hay variantes agregadas. Haz clic en "Agregar Variante" para comenzar.</div>';
        }
    }
}

// Obtener variantes del formulario
function obtenerVariantesFormulario() {
    const items = document.querySelectorAll('.variante-item');
    const variantes = [];
    
    items.forEach(item => {
        const color = item.querySelector('.var-color').value;
        const talla = item.querySelector('.var-talla').value;
        const sku = item.querySelector('.var-sku').value;
        const stock = parseInt(item.querySelector('.var-stock').value) || 0;
        
        if (color && talla && sku) {
            variantes.push({ color, talla, sku, stock });
        }
    });
    
    return variantes;
}

// Submit del formulario
async function handleSubmitProducto(e) {
    e.preventDefault();
    
    const variantes = obtenerVariantesFormulario();
    
    if (variantes.length === 0) {
        alert('⚠️ Debes agregar al menos una variante (color y talla)');
        return;
    }
    
    // Calcular stock total
    const stockTotal = variantes.reduce((sum, v) => sum + v.stock, 0);
    
    const productoData = {
        nombre: document.getElementById('prodNombre').value.trim(),
        categoria: document.getElementById('prodCategoria').value,
        tipo: document.getElementById('prodTipo').value,
        precioVenta: parseFloat(document.getElementById('prodPrecioVenta').value),
        precioCompra: parseFloat(document.getElementById('prodPrecioCompra').value) || 0,
        sucursalId: document.getElementById('prodSucursal').value,
        stock: stockTotal
    };
    
    // Subir imagen si existe
    const fileInput = document.getElementById('prodImagen');
    if (fileInput && fileInput.files.length > 0) {
        toast('📤 Subiendo imagen...');
        const base64 = await toBase64(fileInput.files[0]);
        productoData.imagenBase64 = base64;
    }
    
    const productoIdEdit = document.getElementById('productoIdEdit').value;
    
    if (productoIdEdit) {
        // Editar producto existente
        productoData.action = 'actualizarProducto';
        productoData.id = productoIdEdit;
        
        const result = await apiCall(productoData);
        
        if (result.success) {
            // Actualizar variantes
            await actualizarVariantesProducto(productoIdEdit, variantes);
            toast('✅ Producto actualizado correctamente');
            cancelarEdicion();
            await cargarProductos();
        } else {
            toast('❌ Error al actualizar producto');
        }
    } else {
        // Crear nuevo producto
        productoData.action = 'crearProducto';
        
        const result = await apiCall(productoData);
        
        if (result.success) {
            // Crear variantes
            await crearVariantesProducto(result.id, variantes);
            toast('✅ Producto creado correctamente con sus variantes');
            limpiarFormulario();
            await cargarProductos();
        } else {
            toast('❌ Error al crear producto');
        }
    }
}

// Crear variantes para un producto
async function crearVariantesProducto(productoId, variantes) {
    for (const v of variantes) {
        await apiCall({
            action: 'crearVariante',
            productoId: productoId,
            color: v.color,
            talla: v.talla,
            sku: v.sku,
            stock: v.stock
        });
    }
}

// Actualizar variantes de un producto
async function actualizarVariantesProducto(productoId, variantes) {
    // Eliminar variantes antiguas
    await apiCall({
        action: 'eliminarVariantesProducto',
        productoId: productoId
    });
    
    // Crear nuevas variantes
    await crearVariantesProducto(productoId, variantes);
}

// Convertir archivo a base64
function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// Cargar productos en la tabla
async function cargarProductos() {
    const data = await apiCall({ action: 'getProductos' });
    
    if (!data.success) {
        toast('❌ Error al cargar productos');
        return;
    }
    
    const tbody = document.getElementById('tablaProductos');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (data.productos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 40px; color: #94a3b8;">
                    📦 No hay productos registrados
                </td>
            </tr>
        `;
        return;
    }
    
    for (const p of data.productos) {
        // Obtener variantes del producto
        const variantesData = await apiCall({
            action: 'getVariantesPorProducto',
            productoId: p.id
        });
        
        const numVariantes = variantesData.variantes?.length || 0;
        
        const tipoBadge = p.tipo ? `<span class="badge-tipo badge-${p.tipo.toLowerCase()}">${p.tipo}</span>` : '-';
        
        let stockClass = 'stock-alto';
        if (p.stock <= 5) stockClass = 'stock-bajo';
        else if (p.stock <= 15) stockClass = 'stock-medio';
        
        const imgHTML = p.imagenUrl 
            ? `<img src="${p.imagenUrl}" class="product-img" alt="${p.nombre}">` 
            : `<div class="product-img-placeholder">📦</div>`;
        
        tbody.innerHTML += `
            <tr>
                <td><code>${p.id}</code></td>
                <td>${imgHTML}</td>
                <td><strong>${p.nombre}</strong></td>
                <td>${p.categoria || '-'}</td>
                <td>${tipoBadge}</td>
                <td><strong>S/ ${p.precioVenta.toFixed(2)}</strong></td>
                <td><span class="stock-badge ${stockClass}">${p.stock}</span></td>
                <td>
                    <button class="btn-variantes" onclick="verVariantes(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">
                        ${numVariantes} variante(s)
                    </button>
                </td>
                <td>${getSucursalNombre(p.sucursalId)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" onclick="editarProducto(${p.id})">
                            ✏️ Editar
                        </button>
                        <button class="btn-action btn-delete" onclick="solicitarEliminar(${p.id}, '${p.nombre.replace(/'/g, "\\'")}')">
                            🗑️ Eliminar
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Ver variantes de un producto
async function verVariantes(productoId, nombreProducto) {
    const data = await apiCall({
        action: 'getVariantesPorProducto',
        productoId: productoId
    });
    
    const modal = document.getElementById('modalVariantes');
    const lista = document.getElementById('listaVariantesModal');
    
    if (!modal || !lista) return;
    
    modal.querySelector('h3').textContent = `🎨 Variantes de: ${nombreProducto}`;
    
    lista.innerHTML = '';
    
    if (data.variantes && data.variantes.length > 0) {
        data.variantes.forEach(v => {
            let stockClass = 'stock-alto';
            if (v.stock <= 5) stockClass = 'stock-bajo';
            else if (v.stock <= 15) stockClass = 'stock-medio';
            
            lista.innerHTML += `
                <div class="variante-card">
                    <div class="variante-info">
                        <span class="variante-label">Color</span>
                        <span class="variante-value">${v.color}</span>
                    </div>
                    <div class="variante-info">
                        <span class="variante-label">Talla</span>
                        <span class="variante-value">${v.talla}</span>
                    </div>
                    <div class="variante-info">
                        <span class="variante-label">SKU</span>
                        <span class="variante-value"><code>${v.sku}</code></span>
                    </div>
                    <div class="variante-info">
                        <span class="variante-label">Stock</span>
                        <span class="variante-stock ${stockClass}">${v.stock}</span>
                    </div>
                </div>
            `;
        });
    } else {
        lista.innerHTML = '<div class="variante-empty">No hay variantes registradas para este producto</div>';
    }
    
    modal.classList.add('active');
}

// Cerrar modal de variantes
function cerrarModalVariantes() {
    const modal = document.getElementById('modalVariantes');
    if (modal) {
        modal.classList.remove('active');
    }
}


// Ejecutar edición después de validar contraseña
async function ejecutarEdicion(id) {
    const data = await apiCall({ action: 'getProductos' });
    const producto = data.productos.find(p => p.id == id);
    
    if (!producto) {
        toast('❌ Producto no encontrado');
        return;
    }
    
    // Cargar variantes
    const variantesData = await apiCall({
        action: 'getVariantesPorProducto',
        productoId: id
    });
    
    // Llenar formulario
    document.getElementById('productoIdEdit').value = producto.id;
    document.getElementById('prodNombre').value = producto.nombre;
    document.getElementById('prodCategoria').value = producto.categoria;
    document.getElementById('prodTipo').value = producto.tipo;
    document.getElementById('prodPrecioVenta').value = producto.precioVenta;
    document.getElementById('prodPrecioCompra').value = producto.precioCompra || 0;
    document.getElementById('prodSucursal').value = producto.sucursalId;
    
    // Cambiar título del formulario
    document.getElementById('formTitle').textContent = '✏️ Editar Producto';
    document.getElementById('btnCancelarEdicion').style.display = 'block';
    document.getElementById('btnGuardarProducto').textContent = '💾 Actualizar Producto';
    
    // Cargar variantes
    variantesActuales = [];
    const container = document.getElementById('variantesContainer');
    container.innerHTML = '';
    
    if (variantesData.variantes && variantesData.variantes.length > 0) {
        variantesData.variantes.forEach((v, index) => {
            const varianteHTML = `
                <div class="variante-item" data-index="${index}">
                    <select class="var-color" required>
                        <option value="">Color...</option>
                        <option value="Negro" ${v.color === 'Negro' ? 'selected' : ''}>Negro</option>
                        <option value="Blanco" ${v.color === 'Blanco' ? 'selected' : ''}>Blanco</option>
                        <option value="Gris" ${v.color === 'Gris' ? 'selected' : ''}>Gris</option>
                        <option value="Azul" ${v.color === 'Azul' ? 'selected' : ''}>Azul</option>
                        <option value="Rojo" ${v.color === 'Rojo' ? 'selected' : ''}>Rojo</option>
                        <option value="Verde" ${v.color === 'Verde' ? 'selected' : ''}>Verde</option>
                        <option value="Amarillo" ${v.color === 'Amarillo' ? 'selected' : ''}>Amarillo</option>
                        <option value="Rosado" ${v.color === 'Rosado' ? 'selected' : ''}>Rosado</option>
                        <option value="Morado" ${v.color === 'Morado' ? 'selected' : ''}>Morado</option>
                        <option value="Naranja" ${v.color === 'Naranja' ? 'selected' : ''}>Naranja</option>
                        <option value="Beige" ${v.color === 'Beige' ? 'selected' : ''}>Beige</option>
                        <option value="Marrón" ${v.color === 'Marrón' ? 'selected' : ''}>Marrón</option>
                    </select>
                    
                    <select class="var-talla" required>
                        <option value="">Talla...</option>
                        <option value="XS" ${v.talla === 'XS' ? 'selected' : ''}>XS</option>
                        <option value="S" ${v.talla === 'S' ? 'selected' : ''}>S</option>
                        <option value="M" ${v.talla === 'M' ? 'selected' : ''}>M</option>
                        <option value="L" ${v.talla === 'L' ? 'selected' : ''}>L</option>
                        <option value="XL" ${v.talla === 'XL' ? 'selected' : ''}>XL</option>
                        <option value="XXL" ${v.talla === 'XXL' ? 'selected' : ''}>XXL</option>
                        <option value="XXXL" ${v.talla === 'XXXL' ? 'selected' : ''}>XXXL</option>
                    </select>
                    
                    <input type="text" class="var-sku" placeholder="SKU" value="${v.sku}" required>
                    
                    <input type="number" class="var-stock" placeholder="Stock" min="0" value="${v.stock}" required>
                    
                    <button type="button" class="btn-remove-variante" onclick="eliminarVariante(${index})">
                        🗑️
                    </button>
                </div>
            `;
            
            container.insertAdjacentHTML('beforeend', varianteHTML);
            variantesActuales.push({ index });
        });
    }
    
    // Scroll al formulario
    const formCard = document.querySelector('.form-card');
    if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth' });
    }
}

// Cancelar edición
function cancelarEdicion() {
    limpiarFormulario();
    document.getElementById('formTitle').textContent = '➕ Registrar Nuevo Producto';
    document.getElementById('btnCancelarEdicion').style.display = 'none';
    document.getElementById('btnGuardarProducto').textContent = '💾 Guardar Producto';
}

// Limpiar formulario
function limpiarFormulario() {
    const form = document.getElementById('formProducto');
    if (form) {
        form.reset();
    }
    
    const productoIdEdit = document.getElementById('productoIdEdit');
    if (productoIdEdit) {
        productoIdEdit.value = '';
    }
    
    const fileName = document.getElementById('fileName');
    if (fileName) {
        fileName.textContent = 'Ningún archivo seleccionado';
    }
    
    // Limpiar variantes
    variantesActuales = [];
    const container = document.getElementById('variantesContainer');
    if (container) {
        container.innerHTML = '<div class="variante-empty">No hay variantes agregadas. Haz clic en "Agregar Variante" para comenzar.</div>';
    }
}

// Solicitar eliminación con contraseña
function solicitarEliminar(id, nombre) {
    accionPendiente = {
        tipo: 'eliminar',
        id: id,
        nombre: nombre
    };
    
    mostrarModalConfirmacion(
        '⚠️ Eliminar Producto',
        `¿Estás seguro de eliminar "${nombre}"? Esta acción no se puede deshacer.`
    );
}

// Mostrar modal de confirmación
function mostrarModalConfirmacion(titulo, mensaje) {
    const modal = document.getElementById('modalConfirmacion');
    if (!modal) return;
    
    document.getElementById('modalTitulo').textContent = titulo;
    document.getElementById('modalMensaje').textContent = mensaje;
    document.getElementById('modalPassword').value = '';
    modal.classList.add('active');
}

// Cerrar modal
function cerrarModal() {
    const modal = document.getElementById('modalConfirmacion');
    if (modal) {
        modal.classList.remove('active');
    }
    accionPendiente = null;
}

// Ejecutar acción pendiente después de validar contraseña
async function ejecutarAccionPendiente() {
    if (!accionPendiente) return;
    
    const password = document.getElementById('modalPassword').value;
    
    if (!password) {
        toast('⚠️ Debes ingresar tu contraseña');
        return;
    }
    
    // Obtener email del admin actual
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Verificar contraseña
    const verificacion = await apiCall({
        action: 'verificarPassword',
        email: user.email,
        password: password
    });
    
    if (!verificacion.success) {
        toast('❌ Contraseña incorrecta');
        document.getElementById('modalPassword').value = '';
        return;
    }
    
    // Contraseña correcta, ejecutar acción
    cerrarModal();
    
    if (accionPendiente.tipo === 'eliminar') {
        await ejecutarEliminacion(accionPendiente.id);
    } else if (accionPendiente.tipo === 'editar') {
        await ejecutarEdicion(accionPendiente.id);
    }
    
    accionPendiente = null;
}

// Ejecutar eliminación
async function ejecutarEliminacion(id) {
    // Primero eliminar variantes
    await apiCall({
        action: 'eliminarVariantesProducto',
        productoId: id
    });
    
    // Luego eliminar producto
    const result = await apiCall({
        action: 'eliminarProducto',
        id: id
    });
    
    if (result.success) {
        toast('✅ Producto eliminado correctamente');
        await cargarProductos();
    } else {
        toast('❌ Error al eliminar producto');
    }
}

// Helper: obtener nombre de sucursal
let sucursalesCached = null;

function getSucursalNombre(id) {
    if (!sucursalesCached) return '-';
    const suc = sucursalesCached.find(s => s.id == id);
    return suc ? suc.nombre : '-';
}

// Cachear sucursales al cargar
(async function cachearSucursales() {
    const data = await apiCall({ action: 'getSucursales' });
    if (data.success) {
        sucursalesCached = data.sucursales;
    }
})();

// Inicializar al cargar la vista
if (document.getElementById('tablaProductos')) {
    initProductos();
}
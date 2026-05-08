/* ============================================================
 * 1. CONSTANTES
 * ============================================================ */

const STORAGE_KEY = 'citas_vet';

const IMAGENES_MASCOTAS = {
    perro:   './img/perro.jpg',
    gato:    './img/gato.jpg',
    ave:     './img/ave.jpg',
    conejo:  './img/conejo.jpg',
    hamster: './img/hamster.jpg',
    huron:   './img/huron.jpg',
    tortuga: './img/tortuga.jpg',
    iguana:  './img/iguana.jpg',
    cerdo:   './img/cerdo.jpg',
    otro:    './img/huellas.png'
};

const TEMAS_ESTADO = {
    Abierta:  { bg: 'bg-emerald-50', border: 'border-emerald-200', marker: 'bg-emerald-500' },
    Terminada: { bg: 'bg-blue-50',    border: 'border-blue-200',    marker: 'bg-blue-500'    },
    Anulada:  { bg: 'bg-red-50',     border: 'border-red-200',     marker: 'bg-red-500'     }
};

const CAMPOS_FORMULARIO = ['mascota', 'propietario', 'telefono', 'fecha', 'hora', 'sintomas'];

const HORARIO = { min: '08:00', max: '20:00' };


/* ============================================================
 * 2. ESTADO GLOBAL
 * ============================================================ */

let citas = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];


/* ============================================================
 * 3. REFERENCIAS AL DOM
 * ============================================================ */

const $ = (id) => document.getElementById(id);

const nodos = {
    contenedor:  $('contenedorCitas'),
    formulario:  $('formularioCita'),
    filtro:      $('filtroEstado'),
    modal:       $('modalFormulario'),
    tituloModal: $('modalTitulo'),
    sintomas:    $('sintomas'),
    charCount:   $('charCount'),
    inputFecha:  $('fecha'),
    editId:      $('editId'),
    btnAgregar:  $('btnAgregar')
};


/* ============================================================
 * 4. ALMACENAMIENTO
 * ============================================================ */

const guardarCitas = () =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(citas));

const guardarYRefrescar = () => {
    guardarCitas();
    renderizarApp();
};


/* ============================================================
 * 5. ALERTAS (SweetAlert2)
 * ============================================================ */

const toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
});

const toastExito  = (titulo) => toast.fire({ icon: 'success', title: titulo });
const toastInfo   = (titulo) => toast.fire({ icon: 'info',    title: titulo });

const alertaCampo = (etiqueta) =>
    Swal.fire('Campo requerido', `Por favor completa: ${etiqueta}`, 'warning');

const alertaHorario = () =>
    Swal.fire('Horario no válido', 'Atendemos de 08:00 AM a 08:00 PM', 'error');

const mostrarSintomasCompletos = (nombre, texto) =>
    Swal.fire({
        title: `<div class="text-emerald-600 flex items-center justify-center gap-2">
                    <i data-lucide="stethoscope"></i> Síntomas de ${nombre}
                </div>`,
        html: `<div class="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 italic text-slate-700 shadow-inner whitespace-pre-wrap">"${texto}"</div>`,
        confirmButtonColor: '#10b981',
        didOpen: () => { if (window.lucide) lucide.createIcons(); }
    });


/* ============================================================
 * 6. MODAL (abrir / cerrar)
 * ============================================================ */

const cerrarFormulario = () =>
    nodos.modal?.classList.add('hidden');

const limpiarFormulario = () => {
    nodos.formulario?.reset();
    nodos.editId.value = '';
};

const rellenarFormulario = (cita) => {
    nodos.editId.value = cita.id;
    CAMPOS_FORMULARIO.forEach((campo) => {
        const el = $(campo);
        if (el) el.value = cita[campo];
    });
    const tipoMascota = $('tipoMascota');
    if (tipoMascota) tipoMascota.value = cita.tipo;
};

const abrirModal = (id = null) => {
    if (!nodos.modal) return;
    nodos.modal.classList.remove('hidden');

    if (id) {
        const cita = citas.find((c) => c.id === id);
        nodos.tituloModal.innerText = 'Editar Cita';
        rellenarFormulario(cita);
    } else {
        nodos.tituloModal.innerText = 'Nueva Cita';
        limpiarFormulario();
    }

    nodos.sintomas?.dispatchEvent(new Event('input'));
};


/* ============================================================
 * 7. FORMULARIO (validación y guardado)
 * ============================================================ */

const leerDatosFormulario = () => ({
    mascota:    $('mascota').value.trim(),
    propietario: $('propietario').value.trim(),
    telefono:   $('telefono').value.trim(),
    fecha:      $('fecha').value,
    hora:       $('hora').value,
    sintomas:   nodos.sintomas.value.trim(),
    tipo:       $('tipoMascota').value
});

const validarCampos = (datos) => {
    const requeridos = [
        { valor: datos.mascota,     etiqueta: 'Nombre de la Mascota' },
        { valor: datos.propietario, etiqueta: 'Propietario'          },
        { valor: datos.telefono,    etiqueta: 'Teléfono'             },
        { valor: datos.fecha,       etiqueta: 'Fecha'                },
        { valor: datos.hora,        etiqueta: 'Hora'                 },
        { valor: datos.sintomas,    etiqueta: 'Síntomas'             }
    ];

    const faltante = requeridos.find((c) => !c.valor);
    if (faltante) { alertaCampo(faltante.etiqueta); return false; }

    if (datos.hora < HORARIO.min || datos.hora > HORARIO.max) {
        alertaHorario(); return false;
    }

    return true;
};

const construirCita = (datos, idExistente) => {
    const citaPrevia = idExistente ? citas.find((c) => c.id == idExistente) : null;
    return {
        ...datos,
        id:              idExistente ? parseInt(idExistente) : Date.now(),
        estado:          citaPrevia?.estado          || 'Abierta',
        motivoAnulacion: citaPrevia?.motivoAnulacion || ''
    };
};

const manejarEnvioFormulario = (e) => {
    e.preventDefault();

    const datos = leerDatosFormulario();
    if (!validarCampos(datos)) return;

    const idExistente = nodos.editId.value;
    const nuevaCita   = construirCita(datos, idExistente);

    citas = idExistente
        ? citas.map((c) => (c.id == idExistente ? nuevaCita : c))
        : [...citas, nuevaCita];

    guardarYRefrescar();
    cerrarFormulario();
    toastExito('Cita guardada correctamente');
};


/* ============================================================
 * 8. CRUD — cambio de estado y eliminación
 * ============================================================ */

const pedirMotivoAnulacion = async () => {
    const { value: texto, isConfirmed } = await Swal.fire({
        title: 'Motivo de Anulación',
        input: 'textarea',
        inputPlaceholder: 'Explica brevemente por qué se anula...',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        inputValidator: (valor) => !valor && '¡El motivo es obligatorio!'
    });
    return isConfirmed ? texto : null;
};

const confirmarCambioEstado = async () => {
    const { isConfirmed } = await Swal.fire({
        title: '¿Confirmar cambio?',
        text: '¿Deseas actualizar el estado de esta cita?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981'
    });
    return isConfirmed;
};

const actualizarEstado = async (id, nuevoEstado, estadoAnterior) => {
    if (nuevoEstado === estadoAnterior) return;

    let motivoAnulacion = '';

    if (nuevoEstado === 'Anulada') {
        const motivo = await pedirMotivoAnulacion();
        if (motivo === null) return renderizarApp();
        motivoAnulacion = motivo;
    } else {
        const confirmado = await confirmarCambioEstado();
        if (!confirmado) return renderizarApp();
    }

    citas = citas.map((c) =>
        c.id === id ? { ...c, estado: nuevoEstado, motivoAnulacion } : c
    );

    guardarYRefrescar();
    toastExito('Estado actualizado');
};

const eliminarCita = (id) =>
    Swal.fire({
        title: '¿Eliminar cita?',
        text: 'Esta acción es permanente.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Sí, eliminar'
    }).then(({ isConfirmed }) => {
        if (!isConfirmed) return;
        citas = citas.filter((c) => c.id !== id);
        guardarYRefrescar();
        toastInfo('Cita eliminada');
    });


/* ============================================================
 * 9. RENDER — partes de la tarjeta
 * ============================================================ */

const htmlImagenMascota = (cita) => `
    <div class="absolute -top-6 right-4 w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-xl flex items-center justify-center shadow-lg border border-slate-100 overflow-hidden z-10">
        <img src="${IMAGENES_MASCOTAS[cita.tipo] || IMAGENES_MASCOTAS.otro}"
             class="img-mascota"
             alt="${cita.tipo}"
             onerror="this.src='https://cdn-icons-png.flaticon.com/512/2138/2138440.png';">
    </div>`;

const htmlEncabezadoCita = (cita) => `
    <div class="mb-4">
        <span class="px-2 py-0.5 bg-white text-slate-400 rounded-full text-[12px] font-bold border">
            REF: ${cita.id.toString().slice(-6)}
        </span>
        <h2 class="text-xl font-black text-slate-800 mt-2 capitalize truncate pr-14 sm:pr-16">${cita.mascota}</h2>
    </div>`;

const htmlFila = (colorBg, colorText, icono, contenido) => `
    <div class="flex items-center gap-3 text-slate-600">
        <span class="w-7 h-7 rounded-lg ${colorBg} flex items-center justify-center ${colorText} shrink-0">
            <i data-lucide="${icono}" class="w-4 h-4"></i>
        </span>
        ${contenido}
    </div>`;

const htmlDatosCita = (cita) => `
    <div class="space-y-3 text-sm flex-grow">
        ${htmlFila('bg-emerald-100', 'text-emerald-600', 'user',
            `<p class="truncate font-semibold">${cita.propietario}</p>`)}
        ${htmlFila('bg-blue-100', 'text-blue-600', 'phone',
            `<p class="font-bold">${cita.telefono}</p>`)}
        ${htmlFila('bg-amber-100', 'text-amber-600', 'calendar',
            `<p class="font-bold">${cita.fecha} <span class="text-slate-400 font-medium text-xs">| ${cita.hora}</span></p>`)}
    </div>`;

const htmlSintomas = (cita, tema) => {
    const sintomasCortos = cita.sintomas.length > 25
        ? cita.sintomas.substring(0, 25) + '...'
        : cita.sintomas;
    const bordeColor = tema.marker.replace('bg-', 'border-');
    const sintomasEscapados = cita.sintomas
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '');

    return `
    <div class="mt-4">
        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Síntomas</span>
        <div class="p-3 bg-white/70 rounded-xl text-slate-500 italic border-l-4 ${bordeColor} text-xs leading-relaxed shadow-inner">
            <span>"${sintomasCortos}"</span>
            <button onclick="mostrarSintomasCompletos('${cita.mascota}', '${sintomasEscapados}')"
                class="text-emerald-600 font-bold text-[10px] underline ml-1">Ver detalles</button>
        </div>
    </div>`;
};

const htmlMotivoAnulacion = (cita) =>
    cita.estado === 'Anulada' && cita.motivoAnulacion ? `
    <div class="mt-2">
        <span class="text-[9px] font-bold text-red-400 uppercase tracking-widest block mb-1">Motivo Anulación</span>
        <p class="text-xs text-red-600 font-medium italic bg-red-100/50 p-2 rounded-lg">${cita.motivoAnulacion}</p>
    </div>` : '';

const htmlAccionesCita = (cita, estaBloqueada) => `
    <div class="mt-5 flex items-center justify-between gap-2">
        <select ${estaBloqueada ? 'disabled' : ''}
                onchange="actualizarEstado(${cita.id}, this.value, '${cita.estado}')"
                class="flex-grow text-[10px] font-bold border-none bg-white p-2 rounded-lg outline-none cursor-pointer uppercase shadow-sm ${estaBloqueada ? 'opacity-50 cursor-not-allowed' : ''}">
            <option value="Abierta"   ${cita.estado === 'Abierta'   ? 'selected' : ''}>Abierta</option>
            <option value="Terminada" ${cita.estado === 'Terminada' ? 'selected' : ''}>Terminada</option>
            <option value="Anulada"   ${cita.estado === 'Anulada'   ? 'selected' : ''}>Anulada</option>
        </select>

        <div class="flex gap-1.5">
            <button onclick="abrirModal(${cita.id})"
                    class="w-9 h-9 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">
                <i data-lucide="pencil" class="w-4 h-4"></i>
            </button>
            <button onclick="eliminarCita(${cita.id})"
                    class="w-9 h-9 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
        </div>
    </div>`;


/* ============================================================
 * 10. RENDER — tarjeta completa
 * ============================================================ */

const crearTarjetaCita = (cita) => {
    const tema         = TEMAS_ESTADO[cita.estado];
    const estaBloqueada = ['Terminada', 'Anulada'].includes(cita.estado);
    const tarjeta      = document.createElement('div');

    tarjeta.className = `${tema.bg} ${tema.border} p-5 rounded-2xl shadow-sm border-2 relative fade-in h-full flex flex-col transition-all hover:shadow-md`;

    tarjeta.innerHTML = `
        ${htmlImagenMascota(cita)}
        ${htmlEncabezadoCita(cita)}
        ${htmlDatosCita(cita)}
        ${htmlSintomas(cita, tema)}
        ${htmlMotivoAnulacion(cita)}
        ${htmlAccionesCita(cita, estaBloqueada)}`;

    return tarjeta;
};


/* ============================================================
 * 11. RENDER — contenedor principal
 * ============================================================ */

const mostrarEstadoVacio = () => {
    nodos.contenedor.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center fade-in">
            <div class="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-bounce border border-emerald-100">
                <i data-lucide="calendar-days" class="w-10 h-10 text-emerald-500"></i>
            </div>
            <h3 class="text-xl font-black text-slate-800 mb-2">No hay citas registradas</h3>
            <p class="text-slate-500 text-sm">Prueba ajustando el filtro o crea una nueva cita.</p>
            <button onclick="abrirModal()" class="mt-6 bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-2xl shadow-lg hover:bg-emerald-700 transition-all">
                Crear primera cita
            </button>
        </div>`;
    if (window.lucide) lucide.createIcons();
};

const filtrarCitas = () => {
    const filtro = nodos.filtro?.value ?? 'Todas';
    return filtro === 'Todas' ? citas : citas.filter((c) => c.estado === filtro);
};

const renderizarApp = () => {
    if (!nodos.contenedor) return;
    nodos.contenedor.innerHTML = '';

    const citasFiltradas = filtrarCitas();
    if (!citasFiltradas.length) return mostrarEstadoVacio();

    citasFiltradas.forEach((cita) => nodos.contenedor.appendChild(crearTarjetaCita(cita)));
    if (window.lucide) lucide.createIcons();
};


/* ============================================================
 * 12. EXPOSICIÓN GLOBAL
 * Requerida por los onclick inline generados en las tarjetas
 * ============================================================ */

window.cerrarFormulario      = cerrarFormulario;
window.abrirModal            = abrirModal;
window.actualizarEstado      = actualizarEstado;
window.eliminarCita          = eliminarCita;
window.mostrarSintomasCompletos = mostrarSintomasCompletos;


/* ============================================================
 * 13. INICIALIZACIÓN
 * ============================================================ */

const inicializarTextarea = () => {
    if (!nodos.sintomas) return;
    nodos.sintomas.addEventListener('input', (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
        if (nodos.charCount) nodos.charCount.innerText = `${e.target.value.length}/250`;
    });
};

const inicializarEventos = () => {
    inicializarTextarea();
    nodos.filtro?.addEventListener('change', renderizarApp);
    if (nodos.formulario) nodos.formulario.onsubmit = manejarEnvioFormulario;
    if (nodos.btnAgregar) nodos.btnAgregar.onclick = () => abrirModal();
};

document.addEventListener('DOMContentLoaded', () => {
    if (nodos.inputFecha) nodos.inputFecha.min = new Date().toISOString().split('T')[0];
    renderizarApp();
    inicializarEventos();
});
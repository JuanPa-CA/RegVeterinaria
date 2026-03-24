const STORAGE_KEY = 'citas_vet';

const IMAGENES_MASCOTAS = { 
    perro: './img/perro.jpg', 
    gato: './img/gato.jpg', 
    ave: './img/ave.jpg', 
    conejo: './img/conejo.jpg', 
    hamster: './img/hamster.jpg', 
    huron: './img/huron.jpg', 
    tortuga: './img/tortuga.jpg', 
    iguana: './img/iguana.jpg', 
    cerdo: './img/cerdo.jpg', 
    otro: './img/huellas.png'         
};

const TEMAS_ESTADO = {
    Abierta:   { bg: 'bg-emerald-50', border: 'border-emerald-200', marker: 'bg-emerald-500' },
    Terminada: { bg: 'bg-blue-50',    border: 'border-blue-200',    marker: 'bg-blue-500'    },
    Anulada:   { bg: 'bg-red-50',     border: 'border-red-200',     marker: 'bg-red-500'     }
};

const toast = Swal.mixin({ 
    toast: true, 
    position: 'top-end', 
    showConfirmButton: false, 
    timer: 3000, 
    timerProgressBar: true 
});

// --- Estado Global ---
let citas = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// --- Referencias al DOM ---
const nodos = {
    contenedor:  document.getElementById('contenedorCitas'),
    formulario:  document.getElementById('formularioCita'),
    filtro:      document.getElementById('filtroEstado'),
    modal:       document.getElementById('modalFormulario'),
    tituloModal: document.getElementById('modalTitulo'),
    sintomas:    document.getElementById('sintomas'),
    charCount:   document.getElementById('charCount'),
    inputFecha:  document.getElementById('fecha'),
    editId:      document.getElementById('editId')
};

// --- Auxiliares de Modal y Estado ---
function cerrarFormulario() { 
    if (nodos.modal) nodos.modal.classList.add('hidden'); 
}
window.cerrarFormulario = cerrarFormulario;

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', () => {
    // Bloquear fechas pasadas
    if (nodos.inputFecha) {
        nodos.inputFecha.min = new Date().toISOString().split('T')[0];
    }
    
    renderizarApp();
    inicializarEventos();
});

function inicializarEventos() {
    // Auto-resize y contador de caracteres para el textarea
    if (nodos.sintomas) {
        nodos.sintomas.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = `${this.scrollHeight}px`;
            if (nodos.charCount) nodos.charCount.innerText = `${this.value.length}/250`;
        });
    }

    if (nodos.filtro) nodos.filtro.addEventListener('change', renderizarApp);
    if (nodos.formulario) nodos.formulario.onsubmit = manejarEnvioFormulario;
    
    const btnAgregar = document.getElementById('btnAgregar');
    if (btnAgregar) btnAgregar.onclick = () => abrirModal();
}

// --- Lógica del Formulario ---
function manejarEnvioFormulario(e) {
    e.preventDefault();

    const datos = {
        mascota:     document.getElementById('mascota').value.trim(),
        propietario: document.getElementById('propietario').value.trim(),
        telefono:    document.getElementById('telefono').value.trim(),
        fecha:       document.getElementById('fecha').value,
        hora:        document.getElementById('hora').value,
        sintomas:    nodos.sintomas.value.trim(),
        tipo:        document.getElementById('tipoMascota').value
    };

    const camposRequeridos = [
        { valor: datos.mascota,     etiqueta: 'Nombre de la Mascota' },
        { valor: datos.propietario, etiqueta: 'Propietario' },
        { valor: datos.telefono,    etiqueta: 'Teléfono' },
        { valor: datos.fecha,       etiqueta: 'Fecha' },
        { valor: datos.hora,        etiqueta: 'Hora' },
        { valor: datos.sintomas,    etiqueta: 'Síntomas' }
    ];

    for (const campo of camposRequeridos) {
        if (!campo.valor) {
            return Swal.fire('Campo requerido', `Por favor completa: ${campo.etiqueta}`, 'warning');
        }
    }

    if (datos.hora < "08:00" || datos.hora > "20:00") {
        return Swal.fire('Horario no válido', 'Atendemos de 08:00 AM a 08:00 PM', 'error');
    }

    const idExistente = nodos.editId.value;
    const citaPrevia = idExistente ? citas.find(c => c.id == idExistente) : null;

    const nuevaCita = {
        ...datos,
        id: idExistente ? parseInt(idExistente) : Date.now(),
        estado: citaPrevia ? citaPrevia.estado : 'Abierta',
        motivoAnulacion: citaPrevia ? (citaPrevia.motivoAnulacion || '') : ''
    };

    if (idExistente) {
        citas = citas.map(c => c.id == idExistente ? nuevaCita : c);
    } else {
        citas.push(nuevaCita);
    }

    guardarYRefrescar();
    cerrarFormulario();
    toast.fire({ icon: 'success', title: 'Cita guardada correctamente' });
}

function renderizarApp() {
    if (!nodos.contenedor) return;
    nodos.contenedor.innerHTML = '';
    
    const valorFiltro = nodos.filtro ? nodos.filtro.value : 'Todas';
    const citasFiltradas = valorFiltro === 'Todas' 
        ? citas 
        : citas.filter(c => c.estado === valorFiltro);
    
    if (citasFiltradas.length === 0) {
        return mostrarEstadoVacio();
    }
    
    citasFiltradas.forEach(cita => {
        nodos.contenedor.appendChild(crearTarjetaCita(cita));
    });
    
    if (window.lucide) lucide.createIcons();
}

function crearTarjetaCita(cita) {
    const tema = TEMAS_ESTADO[cita.estado];
    const tarjeta = document.createElement('div');
    
    const sintomasCortos = cita.sintomas.length > 25 
        ? cita.sintomas.substring(0, 25) + '...' 
        : cita.sintomas;
    
    const estaBloqueada = ['Terminada', 'Anulada'].includes(cita.estado);

    tarjeta.className = `${tema.bg} ${tema.border} p-5 rounded-2xl shadow-sm border-2 relative fade-in h-full flex flex-col transition-all hover:shadow-md`;
    
    tarjeta.innerHTML = `
        <div class="absolute -top-6 right-4 w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-xl flex items-center justify-center shadow-lg border border-slate-100 overflow-hidden z-10">
            <img src="${IMAGENES_MASCOTAS[cita.tipo] || IMAGENES_MASCOTAS.otro}" 
                 class="img-mascota" 
                 alt="${cita.tipo}" 
                 onerror="this.src='https://cdn-icons-png.flaticon.com/512/2138/2138440.png';">
        </div>
        
        <div class="mb-4">
            <span class="px-2 py-0.5 bg-white text-slate-400 rounded-full text-[12px] font-bold border">
                REF: ${cita.id.toString().slice(-6)}
            </span>
            <h2 class="text-xl font-black text-slate-800 mt-2 capitalize truncate pr-14 sm:pr-16">${cita.mascota}</h2>
        </div>
        
        <div class="space-y-3 text-sm flex-grow">
            <div class="flex items-center gap-3 text-slate-600">
                <span class="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <i data-lucide="user" class="w-4 h-4"></i>
                </span>
                <p class="truncate font-semibold">${cita.propietario}</p>
            </div>
            
            <div class="flex items-center gap-3 text-slate-600">
                <span class="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                    <i data-lucide="phone" class="w-4 h-4"></i>
                </span>
                <p class="font-bold">${cita.telefono}</p>
            </div>
            
            <div class="flex items-center gap-3 text-slate-600">
                <span class="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                    <i data-lucide="calendar" class="w-4 h-4"></i>
                </span>
                <p class="font-bold">${cita.fecha} <span class="text-slate-400 font-medium text-xs">| ${cita.hora}</span></p>
            </div>
            
            <div class="mt-4">
                 <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Síntomas</span>
                 <div class="p-3 bg-white/70 rounded-xl text-slate-500 italic border-l-4 ${tema.marker.replace('bg-', 'border-')} text-xs leading-relaxed shadow-inner">
                    <span>"${sintomasCortos}"</span>
                    <button onclick="mostrarSintomasCompletos('${cita.mascota}', '${cita.sintomas.replace(/'/g, "\\'")}')" 
                        class="text-emerald-600 font-bold text-[10px] underline ml-1">Ver detalles</button>
                </div>
            </div>

            ${cita.estado === 'Anulada' && cita.motivoAnulacion ? `
            <div class="mt-2">
                <span class="text-[9px] font-bold text-red-400 uppercase tracking-widest block mb-1">Motivo Anulación</span>
                <p class="text-xs text-red-600 font-medium italic bg-red-100/50 p-2 rounded-lg">${cita.motivoAnulacion}</p>
            </div>` : ''}
        </div>

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
    
    return tarjeta;
}

async function actualizarEstado(id, nuevoEstado, estadoAnterior) {
    if (nuevoEstado === estadoAnterior) return;

    let motivoAnulacion = "";
    
    if (nuevoEstado === 'Anulada') {
        const { value: texto, isConfirmed } = await Swal.fire({
            title: 'Motivo de Anulación',
            input: 'textarea',
            inputPlaceholder: 'Explica brevemente por qué se anula...',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            inputValidator: (valor) => !valor && '¡El motivo es obligatorio!'
        });

        if (!isConfirmed) return renderizarApp();
        motivoAnulacion = texto;
    } else {
        const resultado = await Swal.fire({
            title: '¿Confirmar cambio?',
            text: `La cita pasará a estado ${nuevoEstado}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981'
        });

        if (!resultado.isConfirmed) return renderizarApp();
    }

    citas = citas.map(c => c.id === id ? { 
        ...c, 
        estado: nuevoEstado, 
        motivoAnulacion: nuevoEstado === 'Anulada' ? motivoAnulacion : '' 
    } : c);
    
    guardarYRefrescar();
    toast.fire({ icon: 'success', title: 'Estado actualizado' });
}

function eliminarCita(id) {
    Swal.fire({ 
        title: '¿Eliminar cita?', 
        text: "Esta acción es permanente.",
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#ef4444', 
        confirmButtonText: 'Sí, eliminar'
    }).then((resultado) => {
        if (resultado.isConfirmed) { 
            citas = citas.filter(c => c.id !== id);
            guardarYRefrescar();
            toast.fire({ icon: 'info', title: 'Cita eliminada' });
        }
    });
}

function mostrarSintomasCompletos(nombre, texto) {
    Swal.fire({ 
        title: `<div class="text-emerald-600 flex items-center justify-center gap-2">
                    <i data-lucide="stethoscope"></i> Síntomas de ${nombre}
                </div>`,
        html: `<div class="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 italic text-slate-700 shadow-inner">"${texto}"</div>`,
        confirmButtonColor: '#10b981',
        didOpen: () => { if (window.lucide) lucide.createIcons(); }
    });
}

function abrirModal(id = null) {
    if (!nodos.modal) return;
    nodos.modal.classList.remove('hidden');
    
    if (id) {
        const c = citas.find(c => c.id === id);
        nodos.tituloModal.innerText = 'Editar Cita';
        nodos.editId.value = c.id;
        
        const campos = ['mascota', 'propietario', 'telefono', 'fecha', 'hora', 'sintomas'];
        campos.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = c[f];
        });
        const tipoMascota = document.getElementById('tipoMascota');
        if (tipoMascota) tipoMascota.value = c.tipo;
    } else {
        nodos.tituloModal.innerText = 'Nueva Cita';
        if (nodos.formulario) nodos.formulario.reset();
        nodos.editId.value = '';
    }
    
    if (nodos.sintomas) {
        nodos.sintomas.dispatchEvent(new Event('input'));
    }
}

function mostrarEstadoVacio() {
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
}

function guardarYRefrescar() { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(citas));
    renderizarApp();
}
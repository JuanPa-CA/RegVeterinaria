// Nombre del array para guardar los datos en el LocalStorage del navegador
const STORAGE_KEY = 'citas_vet';

// Diccionario que vincula el tipo de mascota con la ruta de su imagen
const IMAGENES_MASCOTAS = { 
    perro: './img/perro.jpg', gato: './img/gato.jpg', ave: './img/ave.jpg', conejo: './img/conejo.jpg', 
    hamster: './img/hamster.jpg', huron: './img/huron.jpg', tortuga: './img/tortuga.jpg', 
    iguana: './img/iguana.jpg', cerdo: './img/cerdo.jpg', otro: './img/huellas.png' 
};

// Configuración de estilos visuales según el estado de la cita
const ESTADOS = {
    Abierta: { bg: 'bg-emerald-50', border: 'border-emerald-200', marker: 'bg-emerald-500' },
    Terminada: { bg: 'bg-blue-50', border: 'border-blue-200', marker: 'bg-blue-500' },
    Anulada: { bg: 'bg-red-50', border: 'border-red-200', marker: 'bg-red-500' }
};

// Configuración de las alertas rápidas (Toasts) de la librería SweetAlert2
const TOAST = Swal.mixin({ 
    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true 
});

/* Intenta obtener las citas de LocalStorage. Si no hay nada, inicializa un array vacío.
 * JSON.parse convierte el texto guardado de nuevo en un objeto/array de JavaScript.*/
let citas = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];


/* * Agrupamos los elementos de la interfaz en un objeto 'ui' para acceder a ellos 
 * fácilmente sin repetir 'document.getElementById' en todo el código.*/
const ui = {
    contenedor: document.getElementById('contenedorCitas'), // div donde se ven las tarjetas
    formulario: document.getElementById('formularioCita'), // formulario
    filtro: document.getElementById('filtroEstado'),       // select de filtrar
    modal: document.getElementById('modalFormulario'),     // ventana flotante
    tituloModal: document.getElementById('modalTitulo'),   // texto del encabezado del modal
    sintomas: document.getElementById('sintomas'),         // textarea
    charCount: document.getElementById('charCount'),       // contador 0/250
    inputFecha: document.getElementById('fecha')           // selector de fecha
};

// Bloqueo de fechas pasadas: calculamos el día de hoy y lo ponemos como 'min' en el calendario
const hoy = new Date().toISOString().split('T')[0];
ui.inputFecha.min = hoy;


//se dibujan las citas y activamos los iconos de Lucide
document.addEventListener('DOMContentLoaded', () => {
    renderizarCitas();
    lucide.createIcons();
});

// Evento para que el textarea de síntomas crezca solo y actualice el contador de letras
ui.sintomas.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px'; // Ajusta la altura al contenido
    ui.charCount.innerText = `${this.value.length}/250`;
});

// Evento para redibujar la lista cuando el usuario cambie el filtro (Abierta/Terminada/etc)
ui.filtro.addEventListener('change', renderizarCitas);

// Botón para abrir el modal de nueva cita
document.getElementById('btnAgregar').onclick = () => abrirFormulario();

// Evento al enviar el formulario (clic en Guardar)
ui.formulario.onsubmit = (e) => manejarEnvioFormulario(e);


function manejarEnvioFormulario(e) {
    e.preventDefault(); // Detiene la recarga de la página

    //Lista de campos que no pueden estar vacíos
    const fields = [
        { id: 'mascota', label: 'Nombre de la Mascota' },
        { id: 'propietario', label: 'Propietario' },
        { id: 'telefono', label: 'Teléfono' },
        { id: 'fecha', label: 'Fecha' },
        { id: 'hora', label: 'Hora' },
        { id: 'sintomas', label: 'Síntomas' }
    ];

    for (const field of fields) {
        const val = document.getElementById(field.id).value.trim();
        if (val === '') {
            return Swal.fire({ icon: 'warning', title: 'Campo incompleto', text: `Debes llenar: ${field.label}` });
        }
    }

    //Horario comercial (08:00 am a 08:00 pm)
    const horaSeleccionada = document.getElementById('hora').value;
    if (horaSeleccionada < "08:00" || horaSeleccionada > "20:00") {
        return Swal.fire({ icon: 'error', title: 'Horario no disponible', text: 'Atendemos de 08:00 AM a 08:00 PM' });
    }

    //Crear el objeto con los datos actuales
    const idExistente = document.getElementById('editId').value;
    const nuevaCita = { 
        mascota: document.getElementById('mascota').value.trim(),
        propietario: document.getElementById('propietario').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        fecha: document.getElementById('fecha').value,
        hora: horaSeleccionada,
        sintomas: ui.sintomas.value.trim(),
        id: idExistente ? parseInt(idExistente) : Date.now(), // Si es nuevo, usar el tiempo actual como ID único
        tipo: document.getElementById('tipoMascota').value, 
        estado: idExistente ? (citas.find(c => c.id == idExistente).estado) : 'Abierta',
        motivoAnulacion: idExistente ? (citas.find(c => c.id == idExistente).motivoAnulacion || '') : ''
    };
    
    // Si el ID existe, editamos (map). Si no existe, agregamos (push).
    if (idExistente) {
        citas = citas.map(c => c.id == idExistente ? nuevaCita : c);
    } else {
        citas.push(nuevaCita);
    }
    
    actualizarApp(); // Guarda en Storage y refresca la vista
    cerrarFormulario();
    TOAST.fire({ icon: 'success', title: 'Cita guardada correctamente' });
}


/** Limpia el contenedor y genera las tarjetas basadas en los datos actuales */
function renderizarCitas() {
    ui.contenedor.innerHTML = ''; // Borra lo que hay en pantalla
    
    // Aplicamos el filtro seleccionado
    const filtradas = ui.filtro.value === 'Todas' ? citas : citas.filter(c => c.estado === ui.filtro.value);
    
    // Si no hay citas que mostrar, ponemos el diseño de "Lista Vacía"
    if (filtradas.length === 0) return mostrarEstadoVacio();
    
    // Generamos cada tarjeta HTML
    filtradas.forEach(cita => ui.contenedor.appendChild(crearCardCita(cita)));
    lucide.createIcons(); // Reactiva los iconos en los nuevos elementos
}

/* Genera la estructura HTML de cada tarjeta individual */
function crearCardCita(cita) {
    const { id, mascota, propietario, telefono, fecha, hora, sintomas, tipo, estado, motivoAnulacion } = cita;
    const estilo = ESTADOS[estado];
    const card = document.createElement('div');
    
    const textoCorto = sintomas.length > 25 ? sintomas.substring(0, 25) + '...' : sintomas;
    const btnVerMas = `<button onclick="verMas('${mascota}', '${sintomas.replace(/'/g, "\\'")}')" class="text-emerald-600 font-bold text-[10px] underline ml-1">Ver detalles</button>`;
    
    // Si la cita terminó o se anuló, ya no se puede cambiar el estado desde el select
    const isLocked = estado === 'Terminada' || estado === 'Anulada';





    card.className = `${estilo.bg} ${estilo.border} p-5 rounded-2xl shadow-sm border-2 relative fade-in h-full flex flex-col transition-all hover:shadow-md`;
    card.innerHTML = `
        <div class="absolute -top-6 right-4 w-14 h-14 sm:w-16 sm:h-16 bg-white rounded-xl flex items-center justify-center shadow-lg border border-slate-100 overflow-hidden z-10">
            <img src="${IMAGENES_MASCOTAS[tipo] || IMAGENES_MASCOTAS.otro}" class="img-mascota" alt="${tipo}" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2138/2138440.png';">
        </div>
        
        <div class="mb-4">
            <span class="px-2 py-0.5 bg-white text-slate-400 rounded-full text-[12px] font-bold border">REF: ${id.toString().slice(-6)}</span>
            <h2 class="text-xl font-black text-slate-800 mt-2 capitalize truncate pr-14 sm:pr-16">${mascota}</h2>
        </div>
        
        <div class="space-y-3 text-sm flex-grow">
            <div class="flex items-center gap-3 text-slate-600">
                <span class="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0"><i data-lucide="user" class="w-4 h-4"></i></span>
                <p class="truncate font-semibold">${propietario}</p>
            </div>
            <div class="flex items-center gap-3 text-slate-600">
                <span class="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0"><i data-lucide="phone" class="w-4 h-4"></i></span>
                <p class="font-bold">${telefono}</p>
            </div>
            <div class="flex items-center gap-3 text-slate-600">
                <span class="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0"><i data-lucide="calendar" class="w-4 h-4"></i></span>
                <p class="font-bold">${fecha} <span class="text-slate-400 font-medium text-xs">| ${hora}</span></p>
            </div>
            
            <div class="mt-4">
                 <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Síntomas</span>
                 <div class="p-3 bg-white/70 rounded-xl text-slate-500 italic border-l-4 ${estilo.marker.replace('bg-', 'border-')} text-xs leading-relaxed shadow-inner">
                    <span>"${textoCorto}"</span>${btnVerMas}
                </div>
            </div>

            ${estado === 'Anulada' && motivoAnulacion ? `
            <div class="mt-2">
                <span class="text-[9px] font-bold text-red-400 uppercase tracking-widest block mb-1">Motivo Anulación</span>
                <p class="text-xs text-red-600 font-medium italic bg-red-100/50 p-2 rounded-lg">${motivoAnulacion}</p>
            </div>` : ''}
        </div>

        <div class="mt-5 flex items-center justify-between gap-2">
            <select ${isLocked ? 'disabled' : ''} onchange="confirmarCambioEstado(${id}, this.value, '${estado}')" class="flex-grow text-[10px] font-bold border-none bg-white p-2 rounded-lg outline-none cursor-pointer uppercase shadow-sm ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}">
                <option value="Abierta" ${estado === 'Abierta' ? 'selected' : ''}>Abierta</option>
                <option value="Terminada" ${estado === 'Terminada' ? 'selected' : ''}>Terminada</option>
                <option value="Anulada" ${estado === 'Anulada' ? 'selected' : ''}>Anulada</option>
            </select>
            <div class="flex gap-1.5">
                <button onclick="abrirFormulario(${id})" class="w-9 h-9 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                <button onclick="confirmarEliminar(${id})" class="w-9 h-9 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </div>`;
    return card;
}






async function confirmarCambioEstado(id, nuevoEstado, estadoAnterior) {
    if (nuevoEstado === estadoAnterior) return;

    let motivo = "";
    // Si se anula, pedimos obligatoriamente el motivo mediante un modal
    if (nuevoEstado === 'Anulada') {
        const { value: text, isConfirmed } = await Swal.fire({
            title: 'Motivo de Anulación',
            input: 'textarea',
            inputLabel: '¿Por qué se anula la cita?',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            inputValidator: (value) => { if (!value) return '¡Debes ingresar un motivo!'; }
        });

        if (!isConfirmed) { renderizarCitas(); return; } // Si cancela el modal, se aborta el cambio
        motivo = text;
    } else {
        // Confirmación simple para otros cambios
        const result = await Swal.fire({
            title: '¿Cambiar estado?',
            text: `La cita pasará a "${nuevoEstado.toUpperCase()}"`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981'
        });

        if (!result.isConfirmed) { renderizarCitas(); return; }
    }

    // Actualizamos el array local
    citas = citas.map(c => {
        if (c.id === id) {
            return { ...c, estado: nuevoEstado, motivoAnulacion: nuevoEstado === 'Anulada' ? motivo : '' };
        }
        return c;
    });
    
    actualizarApp(); // Sincronizar
    TOAST.fire({ icon: 'success', title: `Estado actualizado` });
}

//alerta de eliminacion
function confirmarEliminar(id) {
    Swal.fire({ 
        title: '¿Estás seguro?', 
        text: "Esta acción no se puede deshacer.",
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#ef4444', 
        confirmButtonText: 'Sí, eliminar cita'
    }).then((result) => {
        if (result.isConfirmed) { 
            citas = citas.filter(c => c.id !== id);
            actualizarApp(); 
            TOAST.fire({ icon: 'info', title: 'Cita eliminada' });
        }
    });
}

/** Muestra un modal con los síntomas completos */
function verMas(nombre, texto) {
    Swal.fire({ 
        title: `<div class="text-emerald-600 flex items-center justify-center gap-2"><i data-lucide="stethoscope"></i> Síntomas de ${nombre}</div>`,
        html: `<div class="text-left bg-slate-50 p-4 rounded-xl border border-slate-200 italic text-slate-700 shadow-inner">"${texto}"</div>`,
        confirmButtonColor: '#10b981',
        didOpen: () => { lucide.createIcons(); }
    });
}


/** Abre el modal. Si recibe un ID, rellena los datos para editar. Si no, limpia todo para crear una nueva. */
function abrirFormulario(id = null) {
    ui.modal.classList.remove('hidden');
    if (id) {
        const c = citas.find(c => c.id === id);
        ui.tituloModal.innerText = 'Editar Cita';
        document.getElementById('editId').value = c.id;
        document.getElementById('tipoMascota').value = c.tipo;
        document.getElementById('mascota').value = c.mascota;
        document.getElementById('propietario').value = c.propietario;
        document.getElementById('telefono').value = c.telefono;
        document.getElementById('fecha').value = c.fecha;
        document.getElementById('hora').value = c.hora;
        ui.sintomas.value = c.sintomas;
    } else {
        ui.tituloModal.innerText = 'Nueva Cita';
        ui.formulario.reset(); 
        document.getElementById('editId').value = '';
    }
    // Dispara el ajuste de altura del textarea al abrir
    ui.sintomas.dispatchEvent(new Event('input'));
}

function cerrarFormulario() { ui.modal.classList.add('hidden'); }

/** HTML que se muestra cuando no hay nada que filtrar o la lista está vacía */
function mostrarEstadoVacio() {
    ui.contenedor.innerHTML = `
        <div class="col-span-full flex flex-col items-center justify-center py-20 px-4 text-center fade-in">
            <div class="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-bounce border border-emerald-100">
                <i data-lucide="calendar-days" class="w-10 h-10 text-emerald-500"></i>
            </div>
            <h3 class="text-xl font-black text-slate-800 mb-2">No hay citas registradas</h3>
            <p class="text-slate-500 text-sm">Prueba ajustando el filtro o crea una nueva cita.</p>
            <button onclick="abrirFormulario()" class="mt-6 bg-emerald-600 text-white font-bold py-2.5 px-6 rounded-2xl shadow-lg hover:bg-emerald-700 transition-all">Crear primera cita</button>
        </div>`;
    lucide.createIcons();
}

/* Guarda el array de citas actual en el almacenamiento del navegador y redibuja la pantalla.*/
function actualizarApp() { 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(citas)); 
    renderizarCitas(); 
}
// ========== 1. CONFIGURACIÓN ==========
const SUPABASE_URL = 'https://zqkqffjvqghvtldcacce.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_s9bgm0nDTD-OFvCo3yRKyg_UVOzYzdc';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let tasks = []; 
let currentFilter = 'all'; 

// ========== 2. SELECTORES ==========
const taskInput = document.getElementById('taskInput');
const priorityInput = document.getElementById('priorityInput');
const searchInput = document.getElementById('searchInput');
const addButton = document.getElementById('addButton');
const taskList = document.getElementById('taskList');
const loadExampleBtn = document.getElementById('loadExampleBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const taskCounter = document.getElementById('taskCounter');
const filterButtons = document.querySelectorAll('.filters button');
const clearCompletedBtn = document.getElementById('clearCompleted');
const reloadBtn = document.getElementById('reloadBtn'); 
const offlineAlert = document.getElementById('offlineAlert'); 

// ========== 3. FUNCIONES DE BASE DE DATOS (CRUD) ==========

async function cargarTareas() {
    try {
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        const { data, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        tasks = data;
        renderTasks();
    } catch (error) {
        mostrarError('Error de conexión con el servidor');
    } finally {
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

async function addTask(text) {
    const priority = priorityInput.value;
    if (!navigator.onLine) return mostrarError('No puedes añadir tareas sin conexión');

    mostrarCarga(true);
    try {
        const { data, error } = await supabaseClient
            .from('tasks')
            .insert([{ text, completed: false, priority }])
            .select();

        if (error) throw error;
        tasks.unshift(data[0]);
        renderTasks();
        taskInput.value = '';
    } catch (error) {
        mostrarError('Error al guardar en la nube');
    } finally {
        mostrarCarga(false);
    }
}

async function toggleTask(id) {
    const idx = tasks.findIndex(t => t.id === id);
    const estadoOriginal = tasks[idx].completed;

    tasks[idx].completed = !estadoOriginal;
    renderTasks();

    if (!navigator.onLine) {
        setTimeout(() => {
            tasks[idx].completed = estadoOriginal;
            renderTasks();
            mostrarError('Sin conexión: No se pudo guardar');
        }, 500);
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('tasks')
            .update({ completed: !estadoOriginal })
            .eq('id', id);

        if (error) throw error;
    } catch (error) {
        tasks[idx].completed = estadoOriginal;
        renderTasks();
        mostrarError('Fallo al sincronizar');
    }
}

// CORREGIDO: deleteTask con Logging para Ejercicio 4.4
async function deleteTask(id) {
    const copiaTareas = [...tasks]; 
    const tareaAEliminar = tasks.find(t => t.id === id);
    
    tasks = tasks.filter(t => t.id !== id);
    renderTasks();

    if (!navigator.onLine) {
        setTimeout(() => {
            tasks = copiaTareas;
            renderTasks();
            mostrarError('Modo Offline: No se pueden borrar tareas');
        }, 500);
        return;
    }

    try {
        const { error } = await supabaseClient.from('tasks').delete().eq('id', id);
        if (error) throw error;
        
        // --- EJERCICIO 4.4: Enviamos el log a Make ---
        sendWebhookLog('TASK_DELETED', tareaAEliminar);
        
    } catch (error) {
        tasks = copiaTareas; 
        renderTasks();
        mostrarError('Error al eliminar en el servidor');
    }
}

// ========== 4. AUTOMATIZACIÓN (WEBHOOKS) ==========

async function sendWebhookLog(action, taskData) {
    const WEBHOOK_URL = 'https://hook.eu1.make.com/biom9wma71nlx48p3f9fp78ehcx8r1xm'; 
    
    try {
        await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: action,
                task: taskData,
                timestamp: new Date().toISOString(),
                user: 'President_evil'
            })
        });
        console.log(`Log enviado a Make: ${action}`);
    } catch (error) {
        console.error('Error al enviar el log al webhook:', error);
    }
}

// ========== 5. LÓGICA DE INTERFAZ ==========

function renderTasks() {
    taskList.innerHTML = '';
    const term = searchInput.value.toLowerCase();

    const filtered = tasks.filter(t => {
        const matchesType = currentFilter === 'all' || (currentFilter === 'pending' ? !t.completed : t.completed);
        const matchesSearch = t.text.toLowerCase().includes(term);
        return matchesType && matchesSearch;
    });

    filtered.forEach(t => {
        const li = document.createElement('li');
        if (t.completed) li.classList.add('completed');
        li.innerHTML = `
            <div class="task-content">
                <span class="priority-tag ${t.priority}">${t.priority}</span>
                <span class="task-text">${t.text}</span>
            </div>
            <button class="delete-btn">🗑️</button>
        `;
        li.querySelector('.task-text').onclick = () => toggleTask(t.id);
        li.querySelector('.delete-btn').onclick = () => deleteTask(t.id);
        taskList.appendChild(li);
    });
    actualizarContador();
}

function actualizarContador() {
    const p = tasks.filter(x => !x.completed).length;
    taskCounter.textContent = `Tareas pendientes: ${p}`;
}

function mostrarCarga(a) { 
    addButton.disabled = a; 
    addButton.textContent = a ? '...' : 'Añadir'; 
}

function mostrarError(m) {
    const d = document.createElement('div'); 
    d.className = 'error-notification'; 
    d.textContent = m;
    document.body.appendChild(d); 
    setTimeout(() => d.remove(), 3000);
}

// ========== 6. EVENTOS ==========

addButton.addEventListener('click', () => { 
    if(taskInput.value) addTask(taskInput.value); 
});

searchInput.addEventListener('input', renderTasks);

// CORREGIDO: Evento del botón Recargar
reloadBtn.addEventListener('click', async () => {
    reloadBtn.style.transform = 'rotate(360deg)';
    reloadBtn.style.transition = 'transform 0.5s';
    await cargarTareas();
    setTimeout(() => reloadBtn.style.transform = 'rotate(0deg)', 500);
});

filterButtons.forEach(b => b.addEventListener('click', () => {
    filterButtons.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    currentFilter = b.dataset.filter;
    renderTasks();
}));

window.addEventListener('online', () => {
    offlineAlert.style.display = 'none';
    mostrarError('✅ Conexión recuperada');
    cargarTareas();
});

window.addEventListener('offline', () => {
    offlineAlert.style.display = 'block';
});

loadExampleBtn.addEventListener('click', async () => {
    try {
        mostrarCarga(true);
        const res = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5');
        const data = await res.json();
        for (const item of data) {
            await supabaseClient.from('tasks').insert([{ text: item.title, completed: false, priority: 'media' }]);
        }
        await cargarTareas();
    } catch (e) { mostrarError('Error al cargar ejemplos'); }
    finally { mostrarCarga(false); }
});

// Inicio
cargarTareas();
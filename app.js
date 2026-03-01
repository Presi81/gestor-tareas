// ========== DATOS ==========
let tasks = [];

function addTask(text) {
  const newTask = {
    id: Date.now(),
    text,
    completed: false,
    createdAt: new Date().toLocaleString()
  };
  tasks.push(newTask);
  saveTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  saveTasks();
}

function toggleTask(id) {
  tasks = tasks.map(task =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );
  saveTasks();
}

// ========== LOCAL STORAGE ==========
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadTasks() {
  const stored = localStorage.getItem('tasks');
  if (stored) tasks = JSON.parse(stored);
}

// ========== INTERFAZ ==========
const taskInput = document.getElementById('taskInput');
const addButton = document.getElementById('addButton');
const taskList = document.getElementById('taskList');
const clearCompleted = document.getElementById('clearCompleted');
const taskCounter = document.getElementById('taskCounter');

let currentFilter = 'all';

function updateCounter() {
  const pending = tasks.filter(t => !t.completed).length;
  taskCounter.textContent = `Tareas pendientes: ${pending}`;
}

function renderTasks() {
  taskList.innerHTML = '';

  let filtered = tasks;

  if (currentFilter === 'pending') {
    filtered = tasks.filter(t => !t.completed);
  } else if (currentFilter === 'completed') {
    filtered = tasks.filter(t => t.completed);
  }

  filtered.forEach(task => {
    const li = document.createElement('li');
    li.dataset.id = task.id;

    if (task.completed) li.classList.add('completed');

    li.innerHTML = `
      <span>${task.text}</span>
      <small class="timestamp">${task.createdAt}</small>
      <button class="delete-btn">🗑️</button>
    `;

    taskList.appendChild(li);
  });

  updateCounter();
}

// Añadir tarea
addButton.addEventListener('click', () => {
  const text = taskInput.value.trim();
  if (!text) return alert('Escribe una tarea primero');

  addTask(text);
  renderTasks();

  taskInput.value = '';
  taskInput.focus();
});

// Enter para añadir
taskInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addButton.click();
});

// Delegación de eventos
taskList.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;

  const id = Number(li.dataset.id);

  if (e.target.tagName === 'SPAN') {
    toggleTask(id);
    renderTasks();
  }

  if (e.target.classList.contains('delete-btn')) {
    deleteTask(id);
    renderTasks();
  }
});

// Limpiar completadas
clearCompleted.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.completed);
  saveTasks();
  renderTasks();
});

// Filtros
document.querySelector('.filters').addEventListener('click', (e) => {
  if (!e.target.dataset.filter) return;
  currentFilter = e.target.dataset.filter;
  renderTasks();
});

// Inicializar
loadTasks();
renderTasks();

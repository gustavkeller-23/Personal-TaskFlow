// ═══════════════════════════════════════════════════════
// TaskFlow — Renderer (Frontend Logic)
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── State ──
  let tasks = [];
  let currentFilter = 'all';
  let searchQuery = '';
  let sortBy = 'newest';
  let deleteTargetId = null;
  let editingTaskId = null;

  // ── DOM References ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const taskListEl = $('#task-list');
  const emptyStateEl = $('#empty-state');
  const pageTitleEl = $('#page-title');
  const pageSubtitleEl = $('#page-subtitle');
  const searchInput = $('#search-input');
  const sortSelect = $('#sort-select');

  // Modal elements
  const modalOverlay = $('#modal-overlay');
  const modalTitle = $('#modal-title');
  const taskForm = $('#task-form');
  const taskTitleInput = $('#task-title');
  const taskDescInput = $('#task-description');
  const taskCategoryInput = $('#task-category');
  const taskPrioritySelect = $('#task-priority');
  const taskDueDateInput = $('#task-due-date');
  const taskIdInput = $('#task-id');
  const btnSubmit = $('#btn-submit');
  const categorySuggestions = $('#category-suggestions');

  // Delete modal
  const deleteOverlay = $('#delete-overlay');

  // Toast container
  const toastContainer = $('#toast-container');

  // ═══════════════════════════════════════════════════════
  //  INIT
  // ═══════════════════════════════════════════════════════
  async function init() {
    tasks = await window.electronAPI.loadTasks();
    bindEvents();
    render();
  }

  // ═══════════════════════════════════════════════════════
  //  EVENTS
  // ═══════════════════════════════════════════════════════
  function bindEvents() {
    // Window controls
    $('#btn-minimize').addEventListener('click', () => window.electronAPI.minimizeWindow());
    $('#btn-maximize').addEventListener('click', () => window.electronAPI.maximizeWindow());
    $('#btn-close').addEventListener('click', () => window.electronAPI.closeWindow());

    // Navigation
    $$('.nav-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentFilter = btn.dataset.filter;
        $$('.nav-item').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        updatePageTitle();
        render();
      });
    });

    // Search
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      render();
    });

    // Sort
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      render();
    });

    // Add task
    $('#btn-add-task').addEventListener('click', openNewTaskModal);

    // Modal
    $('#modal-close').addEventListener('click', closeModal);
    $('#btn-cancel').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });

    // Form submit
    taskForm.addEventListener('submit', handleFormSubmit);

    // Delete modal
    $('#btn-delete-cancel').addEventListener('click', closeDeleteModal);
    $('#btn-delete-confirm').addEventListener('click', confirmDelete);
    deleteOverlay.addEventListener('click', (e) => {
      if (e.target === deleteOverlay) closeDeleteModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeDeleteModal();
      }
      // Ctrl+N → Nova tarefa
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        openNewTaskModal();
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  //  TASK OPERATIONS
  // ═══════════════════════════════════════════════════════
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  async function addTask(taskData) {
    const task = {
      id: generateId(),
      title: taskData.title.trim(),
      description: taskData.description.trim(),
      category: taskData.category.trim(),
      priority: taskData.priority,
      dueDate: taskData.dueDate || null,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks.unshift(task);
    await persist();
    showToast('Tarefa criada com sucesso!', 'success');
  }

  async function updateTask(id, taskData) {
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return;

    tasks[index] = {
      ...tasks[index],
      title: taskData.title.trim(),
      description: taskData.description.trim(),
      category: taskData.category.trim(),
      priority: taskData.priority,
      dueDate: taskData.dueDate || null,
      updatedAt: new Date().toISOString(),
    };

    await persist();
    showToast('Tarefa atualizada!', 'success');
  }

  async function toggleTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    task.completed = !task.completed;
    task.updatedAt = new Date().toISOString();
    await persist();
  }

  async function deleteTask(id) {
    tasks = tasks.filter((t) => t.id !== id);
    await persist();
    showToast('Tarefa excluída!', 'info');
  }

  async function persist() {
    await window.electronAPI.saveTasks(tasks);
    render();
  }

  // ═══════════════════════════════════════════════════════
  //  FILTERING & SORTING
  // ═══════════════════════════════════════════════════════
  function getFilteredTasks() {
    let filtered = [...tasks];

    // Filter
    switch (currentFilter) {
      case 'pending':
        filtered = filtered.filter((t) => !t.completed);
        break;
      case 'completed':
        filtered = filtered.filter((t) => t.completed);
        break;
      case 'high':
        filtered = filtered.filter((t) => t.priority === 'high');
        break;
      case 'medium':
        filtered = filtered.filter((t) => t.priority === 'medium');
        break;
      case 'low':
        filtered = filtered.filter((t) => t.priority === 'low');
        break;
    }

    // Search
    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery) ||
          t.description.toLowerCase().includes(searchQuery) ||
          t.category.toLowerCase().includes(searchQuery)
      );
    }

    // Sort
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'priority':
        filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        break;
      case 'dueDate':
        filtered.sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate) - new Date(b.dueDate);
        });
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
        break;
    }

    return filtered;
  }

  // ═══════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════
  function render() {
    const filtered = getFilteredTasks();

    // Update badges
    updateBadges();

    // Clear list
    taskListEl.innerHTML = '';

    if (filtered.length === 0) {
      taskListEl.classList.add('hidden');
      emptyStateEl.classList.remove('hidden');
    } else {
      taskListEl.classList.remove('hidden');
      emptyStateEl.classList.add('hidden');

      filtered.forEach((task) => {
        taskListEl.appendChild(createTaskCard(task));
      });
    }

    // Update category suggestions
    updateCategorySuggestions();
  }

  function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card${task.completed ? ' completed' : ''}`;
    card.dataset.priority = task.priority;
    card.dataset.id = task.id;

    const priorityLabels = { high: 'Alta', medium: 'Média', low: 'Baixa' };
    const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate + 'T23:59:59') < new Date();

    card.innerHTML = `
      <button class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle" data-id="${task.id}" title="${task.completed ? 'Marcar como pendente' : 'Marcar como concluída'}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path d="M5 13l4 4L19 7" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="task-body">
        <div class="task-title">${escapeHtml(task.title)}</div>
        ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
        <div class="task-meta">
          ${task.category ? `<span class="task-tag task-tag--category">${escapeHtml(task.category)}</span>` : ''}
          <span class="task-tag task-tag--priority-${task.priority}">${priorityLabels[task.priority]}</span>
          ${task.dueDate ? `<span class="task-tag ${isOverdue ? 'task-tag--overdue' : 'task-tag--date'}">${isOverdue ? '⚠ ' : '📅 '}${formatDate(task.dueDate)}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="task-action-btn" data-action="edit" data-id="${task.id}" title="Editar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="task-action-btn task-action-btn--delete" data-action="delete" data-id="${task.id}" title="Excluir">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    `;

    // Event delegation
    card.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;

      const action = actionEl.dataset.action;
      const id = actionEl.dataset.id;

      switch (action) {
        case 'toggle':
          toggleTask(id);
          break;
        case 'edit':
          openEditTaskModal(id);
          break;
        case 'delete':
          openDeleteModal(id);
          break;
      }
    });

    return card;
  }

  function updateBadges() {
    $('#badge-all').textContent = tasks.length;
    $('#badge-pending').textContent = tasks.filter((t) => !t.completed).length;
    $('#badge-completed').textContent = tasks.filter((t) => t.completed).length;
    $('#badge-high').textContent = tasks.filter((t) => t.priority === 'high').length;
    $('#badge-medium').textContent = tasks.filter((t) => t.priority === 'medium').length;
    $('#badge-low').textContent = tasks.filter((t) => t.priority === 'low').length;
  }

  function updatePageTitle() {
    const titles = {
      all: ['Todas as Tarefas', 'Gerencie todas as suas tarefas'],
      pending: ['Pendentes', 'Tarefas que ainda precisam ser feitas'],
      completed: ['Concluídas', 'Tarefas que já foram finalizadas'],
      high: ['Prioridade Alta', 'Tarefas com prioridade alta'],
      medium: ['Prioridade Média', 'Tarefas com prioridade média'],
      low: ['Prioridade Baixa', 'Tarefas com prioridade baixa'],
    };
    const [title, subtitle] = titles[currentFilter] || titles.all;
    pageTitleEl.textContent = title;
    pageSubtitleEl.textContent = subtitle;
  }

  function updateCategorySuggestions() {
    const categories = [...new Set(tasks.map((t) => t.category).filter(Boolean))];
    categorySuggestions.innerHTML = categories
      .map((c) => `<option value="${escapeHtml(c)}">`)
      .join('');
  }

  // ═══════════════════════════════════════════════════════
  //  MODAL HANDLERS
  // ═══════════════════════════════════════════════════════
  function openNewTaskModal() {
    editingTaskId = null;
    modalTitle.textContent = 'Nova Tarefa';
    btnSubmit.textContent = 'Criar Tarefa';
    taskForm.reset();
    taskIdInput.value = '';
    taskPrioritySelect.value = 'medium';
    modalOverlay.classList.remove('hidden');
    setTimeout(() => taskTitleInput.focus(), 100);
  }

  function openEditTaskModal(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    editingTaskId = id;
    modalTitle.textContent = 'Editar Tarefa';
    btnSubmit.textContent = 'Salvar Alterações';

    taskTitleInput.value = task.title;
    taskDescInput.value = task.description;
    taskCategoryInput.value = task.category;
    taskPrioritySelect.value = task.priority;
    taskDueDateInput.value = task.dueDate || '';
    taskIdInput.value = task.id;

    modalOverlay.classList.remove('hidden');
    setTimeout(() => taskTitleInput.focus(), 100);
  }

  function closeModal() {
    modalOverlay.classList.add('hidden');
    editingTaskId = null;
    taskForm.reset();
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    const taskData = {
      title: taskTitleInput.value,
      description: taskDescInput.value,
      category: taskCategoryInput.value,
      priority: taskPrioritySelect.value,
      dueDate: taskDueDateInput.value,
    };

    if (!taskData.title.trim()) {
      showToast('O título é obrigatório!', 'error');
      return;
    }

    if (editingTaskId) {
      await updateTask(editingTaskId, taskData);
    } else {
      await addTask(taskData);
    }

    closeModal();
  }

  // Delete modal
  function openDeleteModal(id) {
    deleteTargetId = id;
    deleteOverlay.classList.remove('hidden');
  }

  function closeDeleteModal() {
    deleteTargetId = null;
    deleteOverlay.classList.add('hidden');
  }

  async function confirmDelete() {
    if (deleteTargetId) {
      await deleteTask(deleteTargetId);
    }
    closeDeleteModal();
  }

  // ═══════════════════════════════════════════════════════
  //  UTILITIES
  // ═══════════════════════════════════════════════════════
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const icons = {
      success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
      info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    };

    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════
  //  START
  // ═══════════════════════════════════════════════════════
  init();
})();

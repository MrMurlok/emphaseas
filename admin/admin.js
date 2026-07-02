'use strict';

const API = '../api/admin.php';
let content = null;
let modalState = null;

const loginSection = document.querySelector('[data-login]');
const panel = document.querySelector('[data-panel]');
const statusEl = document.querySelector('[data-status]');
const modal = document.querySelector('[data-modal]');
const modalForm = document.querySelector('[data-modal-form]');
const modalBody = document.querySelector('[data-modal-body]');
const modalTitle = document.querySelector('[data-modal-title]');
const modalSubtitle = document.querySelector('[data-modal-subtitle]');
const uploadProgress = document.querySelector('[data-upload-progress]');
const uploadProgressBar = uploadProgress?.querySelector('span');

const showLogin = () => {
  document.body.classList.add('auth_mode');
  document.body.classList.remove('is-authenticated');
  loginSection.hidden = false;
  panel.hidden = true;
};

const showPanel = () => {
  document.body.classList.remove('auth_mode');
  document.body.classList.add('is-authenticated');
  loginSection.hidden = true;
  panel.hidden = false;
};

const setStatus = (text) => {
  statusEl.textContent = text;
};

const api = async (action, options = {}) => {
  const response = await fetch(`${API}?action=${action}`, {
    credentials: 'include',
    ...options,
  });
  const payload = await response.json().catch(() => ({ ok: false, error: 'Invalid server response' }));
  if (!response.ok || !payload.ok) throw new Error(payload.error || 'Request failed');
  return payload;
};

const uploadWithProgress = (action, formData, onProgress) => new Promise((resolve, reject) => {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API}?action=${action}`);
  xhr.withCredentials = true;
  xhr.upload.addEventListener('progress', (event) => {
    if (!event.lengthComputable) return;
    onProgress?.(Math.round((event.loaded / event.total) * 100));
  });
  xhr.addEventListener('load', () => {
    let payload = null;
    try {
      payload = JSON.parse(xhr.responseText);
    } catch (error) {
      reject(new Error('Invalid server response'));
      return;
    }
    if (xhr.status < 200 || xhr.status >= 300 || !payload.ok) {
      reject(new Error(payload.error || 'Upload failed'));
      return;
    }
    resolve(payload);
  });
  xhr.addEventListener('error', () => reject(new Error('Network upload error')));
  xhr.send(formData);
});

const saveContent = async (message = 'Изменения сохранены.') => {
  const form = new FormData();
  form.append('data', JSON.stringify(content));
  const result = await api('save', { method: 'POST', body: form });
  content = result.data;
  render();
  setStatus(message);
};

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const getByPath = (path) => path.split('.').reduce((target, key) => target?.[key], content);

const setByPath = (path, value) => {
  const parts = path.split('.');
  let target = content;
  while (parts.length > 1) target = target[parts.shift()];
  target[parts[0]] = value;
};

const truncate = (value = '', length = 90) => {
  const text = String(value);
  return text.length > length ? `${text.slice(0, length).trim()}...` : text;
};

const fileName = (path = '') => String(path).split('/').pop() || path;

const table = (headers, rows) => `
  <div class="table_wrap">
    <table>
      <thead><tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead>
      <tbody>${rows || `<tr><td colspan="${headers.length}">Нет данных</td></tr>`}</tbody>
    </table>
  </div>
`;

const editButton = (type, index, group = '') => `<button type="button" data-edit="${type}" data-index="${index}" data-group="${group}" title="Редактировать">✎</button>`;
const deleteButton = (type, index, group = '') => `<button type="button" data-delete="${type}" data-index="${index}" data-group="${group}" title="Удалить">🗑</button>`;

const field = (label, name, value, type = 'text') => `
  <label>
    ${label}
    ${type === 'textarea'
      ? `<textarea name="${name}">${escapeHtml(value)}</textarea>`
      : `<input type="text" name="${name}" value="${escapeHtml(value)}" />`}
  </label>
`;

const uploadBox = (label, name, current, accept, uploadType) => `
  <label class="upload_box">
    <strong>${label}</strong>
    <small>Текущий файл: ${escapeHtml(fileName(current))}</small>
    <input type="hidden" name="${name}" value="${escapeHtml(current)}" />
    <input type="file" data-modal-upload="${name}" data-upload-type="${uploadType}" accept="${accept}" />
  </label>
`;

const switchSection = (section) => {
  document.querySelectorAll('[data-section]').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.section === section);
  });
  document.querySelectorAll('[data-page]').forEach((page) => {
    page.classList.toggle('is-active', page.dataset.page === section);
  });
  const active = document.querySelector(`[data-section="${section}"]`);
  document.querySelector('[data-page-title]').textContent = active?.textContent || 'Админ-панель';
};

const openModal = (state, title, subtitle, body) => {
  modalState = state;
  modalTitle.textContent = title;
  modalSubtitle.textContent = subtitle || '';
  modalBody.innerHTML = body;
  modal.hidden = false;
};

const closeModal = () => {
  modal.hidden = true;
  modalState = null;
  modalBody.innerHTML = '';
};

const renderMassimizer = () => {
  document.querySelector('[data-massimizer-current]').textContent = content.massimizer.download;
};

const renderMastering = () => {
  const root = document.querySelector('[data-mastering-editor]');
  root.innerHTML = content.mastering.groups.map((group, groupIndex) => {
    const rows = group.items.map((item, itemIndex) => `
      <tr>
        <td>${escapeHtml(item.title)}</td>
        <td><span class="badge">After</span> <span class="path_text">${escapeHtml(fileName(item.after))}</span></td>
        <td><span class="badge">Before</span> <span class="path_text">${escapeHtml(fileName(item.before))}</span></td>
        <td><div class="actions">${editButton('mastering', itemIndex, groupIndex)}</div></td>
      </tr>
    `).join('');
    return `
      <div class="card">
        <div class="table_head"><h3>${escapeHtml(group.title)}</h3></div>
        ${table(['Название', 'After', 'Before', 'Действие'], rows)}
      </div>
    `;
  }).join('');
};

const renderFaq = () => {
  const rows = content.faq.map((item, index) => `
    <tr>
      <td>${escapeHtml(item.question)}</td>
      <td>${escapeHtml(truncate(item.answer))}</td>
      <td><div class="actions">${editButton('faq', index)}${deleteButton('faq', index)}</div></td>
    </tr>
  `).join('');
  document.querySelector('[data-faq-editor]').innerHTML = table(['Вопрос', 'Ответ', 'Действие'], rows);
};

const renderReviews = () => {
  const rows = content.reviews.map((item, index) => `
    <tr>
      <td>${escapeHtml(item.author)}</td>
      <td>${escapeHtml(item.label)}</td>
      <td>${escapeHtml(truncate(item.text))}</td>
      <td><div class="actions">${editButton('reviews', index)}${deleteButton('reviews', index)}</div></td>
    </tr>
  `).join('');
  document.querySelector('[data-reviews-editor]').innerHTML = table(['Автор', 'Подпись', 'Текст', 'Действие'], rows);
};

const renderCatalog = () => {
  const rows = content.catalog.map((item, index) => `
    <tr>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.artist)}</td>
      <td><span class="path_text">${escapeHtml(fileName(item.cover))}</span></td>
      <td><span class="path_text">${escapeHtml(fileName(item.audio))}</span></td>
      <td><div class="actions">${editButton('catalog', index)}${deleteButton('catalog', index)}</div></td>
    </tr>
  `).join('');
  document.querySelector('[data-catalog-editor]').innerHTML = table(['Название', 'Артист', 'Обложка', 'Аудио', 'Действие'], rows);
};

const render = () => {
  renderMassimizer();
  renderMastering();
  renderFaq();
  renderReviews();
  renderCatalog();
};

const openEdit = (type, index, groupIndex = null) => {
  if (type === 'mastering') {
    const item = content.mastering.groups[groupIndex].items[index];
    openModal({ type, index, groupIndex }, 'Редактировать плеер', content.mastering.groups[groupIndex].title, `
      ${field('Название', 'title', item.title)}
      <div class="fields_2">
        ${uploadBox('After', 'after', item.after, '.mp3,.wav,.ogg,.m4a', 'audio')}
        ${uploadBox('Before', 'before', item.before, '.mp3,.wav,.ogg,.m4a', 'audio')}
      </div>
    `);
    return;
  }

  if (type === 'faq') {
    const item = content.faq[index];
    openModal({ type, index }, 'Редактировать FAQ', '', `
      ${field('Вопрос', 'question', item.question)}
      ${field('Ответ', 'answer', item.answer, 'textarea')}
    `);
    return;
  }

  if (type === 'reviews') {
    const item = content.reviews[index];
    openModal({ type, index }, 'Редактировать отзыв', '', `
      <div class="fields_2">
        ${field('Автор', 'author', item.author)}
        ${field('Подпись', 'label', item.label)}
      </div>
      ${field('Текст', 'text', item.text, 'textarea')}
    `);
    return;
  }

  if (type === 'catalog') {
    const item = content.catalog[index];
    openModal({ type, index }, 'Редактировать карточку лейбла', '', `
      <div class="fields_2">
        ${field('Название', 'title', item.title)}
        ${field('Артист', 'artist', item.artist)}
      </div>
      <div class="fields_2">
        ${uploadBox('Обложка', 'cover', item.cover, '.jpg,.jpeg,.png,.webp', 'image')}
        ${uploadBox('Аудио', 'audio', item.audio, '.mp3,.wav,.ogg,.m4a', 'audio')}
      </div>
    `);
  }
};

const deleteItem = (type, index) => {
  if (!confirm('Удалить элемент?')) return;
  content[type].splice(index, 1);
  saveContent('Элемент удален.');
};

const collectModalData = () => {
  const data = Object.fromEntries(new FormData(modalForm).entries());
  const { type, index, groupIndex } = modalState;

  if (type === 'mastering') Object.assign(content.mastering.groups[groupIndex].items[index], data);
  if (type === 'faq') Object.assign(content.faq[index], data);
  if (type === 'reviews') Object.assign(content.reviews[index], data);
  if (type === 'catalog') Object.assign(content.catalog[index], data);
};

const uploadFromModal = async (input) => {
  if (!input.files?.[0]) return;
  const form = new FormData();
  form.append('type', input.dataset.uploadType);
  form.append('file', input.files[0]);
  const result = await api('upload', { method: 'POST', body: form });
  modalForm.elements[input.dataset.modalUpload].value = result.path;
  input.closest('.upload_box')?.querySelector('small').replaceChildren(`Текущий файл: ${fileName(result.path)}`);
  setStatus('Файл загружен. Нажмите "Применить", чтобы сохранить изменения.');
};

const load = async () => {
  const status = await api('status');
  if (!status.authenticated) {
    showLogin();
    return;
  }
  showPanel();
  const payload = await api('content');
  content = payload.data;
  render();
};

document.querySelector('[data-login-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await api('login', { method: 'POST', body: new FormData(event.currentTarget) });
    await load();
  } catch (error) {
    alert(error.message);
  }
});

document.querySelectorAll('[data-section]').forEach((button) => {
  button.addEventListener('click', () => switchSection(button.dataset.section));
});

document.addEventListener('click', (event) => {
  const edit = event.target.closest('[data-edit]');
  if (edit && edit.dataset.edit) {
    openEdit(edit.dataset.edit, Number(edit.dataset.index), edit.dataset.group === '' ? null : Number(edit.dataset.group));
  }

  const remove = event.target.closest('[data-delete]');
  if (remove && remove.dataset.delete) deleteItem(remove.dataset.delete, Number(remove.dataset.index));
});

document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));

modalBody.addEventListener('change', (event) => {
  const input = event.target.closest('[data-modal-upload]');
  if (input) uploadFromModal(input).catch((error) => alert(error.message));
});

modalForm.addEventListener('submit', (event) => {
  event.preventDefault();
  collectModalData();
  closeModal();
  saveContent('Изменения сохранены.');
});

document.querySelector('[data-upload-massimizer]').addEventListener('submit', async (event) => {
  event.preventDefault();
  const uploadForm = event.currentTarget;
  try {
    const form = new FormData(uploadForm);
    form.append('type', 'massimizer');
    uploadProgress.hidden = false;
    uploadProgressBar.style.width = '0%';
    const result = await uploadWithProgress('upload', form, (percent) => {
      uploadProgressBar.style.width = `${percent}%`;
    });
    content = result.data;
    render();
    uploadForm.reset();
    uploadProgressBar.style.width = '100%';
    setStatus('Файл Massimizer обновлен.');
  } catch (error) {
    setStatus(`Ошибка загрузки Massimizer: ${error.message}`);
  } finally {
    setTimeout(() => {
      uploadProgress.hidden = true;
      uploadProgressBar.style.width = '0%';
    }, 800);
  }
});

document.querySelector('[data-add-faq]').addEventListener('click', () => {
  content.faq.push({ question: 'Новый вопрос', answer: 'Ответ' });
  const index = content.faq.length - 1;
  saveContent('Вопрос добавлен.').then(() => openEdit('faq', index));
});

document.querySelector('[data-add-review]').addEventListener('click', () => {
  content.reviews.push({ text: 'Текст отзыва', author: 'Автор', label: 'Подпись' });
  const index = content.reviews.length - 1;
  saveContent('Отзыв добавлен.').then(() => openEdit('reviews', index));
});

document.querySelector('[data-add-catalog]').addEventListener('click', () => {
  content.catalog.push({ title: 'Новый релиз', artist: 'Emphaseas Music', cover: 'assets/img/album_1.jpg', audio: 'assets/audio/audio_1.mp3' });
  const index = content.catalog.length - 1;
  saveContent('Карточка добавлена.').then(() => openEdit('catalog', index));
});

document.querySelector('[data-logout]').addEventListener('click', async () => {
  await api('logout', { method: 'POST' });
  location.reload();
});

showLogin();
load().catch(() => showLogin());

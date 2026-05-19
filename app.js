const storage = new StorageManager();
let messages = [];
let currentSender = 'me';

function formatTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function renderMessage(msg) {
  const div = document.createElement('div');
  div.className = `msg ${msg.sender}`;
  div.dataset.id = msg.id;

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = msg.content;

  const meta = document.createElement('div');
  meta.className = 'msg-meta';

  const time = document.createElement('span');
  time.className = 'msg-time';
  time.textContent = formatTime(msg.sentAt);

  const toggle = document.createElement('button');
  toggle.className = 'sender-toggle';
  toggle.textContent = msg.sender;
  toggle.title = 'Toggle sender';
  toggle.addEventListener('click', () => toggleSender(msg.id));

  meta.append(time, toggle);
  div.append(bubble, meta);
  return div;
}

function renderFeed() {
  const feed = document.getElementById('feed');
  feed.innerHTML = '';
  for (const msg of messages) {
    feed.appendChild(renderMessage(msg));
  }
  scrollToBottom();
}

function scrollToBottom() {
  const feed = document.getElementById('feed');
  feed.scrollTop = feed.scrollHeight;
}

function sendMessage() {
  const compose = document.getElementById('compose');
  const text = compose.value.trim();
  if (!text) return;

  const msg = {
    id: crypto.randomUUID(),
    content: text,
    sender: currentSender,
    sentAt: new Date().toISOString(),
  };

  messages.push(msg);
  storage.saveMessages(messages);
  storage.saveDraft('');

  compose.value = '';
  compose.style.height = '';

  const feed = document.getElementById('feed');
  feed.appendChild(renderMessage(msg));
  scrollToBottom();
  compose.focus();

  if (storage.isCloudflareConfigured()) {
    storage.syncToCloudflare(messages).catch(() => {});
  }
}

function toggleSender(id) {
  const msg = messages.find(m => m.id === id);
  if (!msg) return;
  msg.sender = msg.sender === 'me' ? 'them' : 'me';
  storage.saveMessages(messages);

  const div = document.querySelector(`.msg[data-id="${id}"]`);
  if (div) {
    div.className = `msg ${msg.sender}`;
    div.querySelector('.sender-toggle').textContent = msg.sender;
  }

  if (storage.isCloudflareConfigured()) {
    storage.syncToCloudflare(messages).catch(() => {});
  }
}

function setComposeSender(sender) {
  currentSender = sender;
  document.getElementById('compose-area').className = `mode-${sender}`;
  document.getElementById('mode-me').classList.toggle('active', sender === 'me');
  document.getElementById('mode-them').classList.toggle('active', sender === 'them');
  document.getElementById('compose').focus();
}

let draftTimer;
function onCompose(e) {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => storage.saveDraft(e.target.value), 300);
  e.target.style.height = 'auto';
  e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
}

function initSettings() {
  const panel = document.getElementById('settings-panel');
  const btn = document.getElementById('settings-btn');
  const cfUrl = document.getElementById('cf-url');
  const cfSecret = document.getElementById('cf-secret');
  const saveBtn = document.getElementById('save-cf-btn');
  const syncBtn = document.getElementById('sync-btn');
  const syncStatus = document.getElementById('sync-status');
  const exportBtn = document.getElementById('export-btn');
  const importFile = document.getElementById('import-file');
  const importLabel = document.querySelector('.import-label');

  cfUrl.value = storage.getCfUrl();
  cfSecret.value = storage.getCfSecret();

  btn.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
  });

  saveBtn.addEventListener('click', () => {
    storage.saveCfConfig(cfUrl.value.trim(), cfSecret.value.trim());
    syncStatus.textContent = 'Saved.';
    setTimeout(() => { syncStatus.textContent = ''; }, 2000);
  });

  syncBtn.addEventListener('click', async () => {
    syncStatus.textContent = 'Syncing...';
    try {
      const remote = await storage.fetchFromCloudflare();
      messages = storage.mergeMessages(messages, remote);
      storage.saveMessages(messages);
      renderFeed();
      syncStatus.textContent = 'Synced.';
    } catch (err) {
      syncStatus.textContent = `Error: ${err.message}`;
    }
    setTimeout(() => { syncStatus.textContent = ''; }, 3000);
  });

  exportBtn.addEventListener('click', () => storage.exportJSON(messages));

  importFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const imported = await storage.importJSON(file);
      messages = storage.mergeMessages(messages, imported);
      storage.saveMessages(messages);
      renderFeed();
      syncStatus.textContent = `Imported ${imported.length} messages.`;
    } catch (err) {
      syncStatus.textContent = `Import failed: ${err.message}`;
    }
    importFile.value = '';
    setTimeout(() => { syncStatus.textContent = ''; }, 3000);
  });
}

function init() {
  messages = storage.getMessages();
  renderFeed();

  const compose = document.getElementById('compose');
  compose.value = storage.getDraft();
  if (compose.value) {
    compose.style.height = 'auto';
    compose.style.height = Math.min(compose.scrollHeight, 200) + 'px';
  }

  compose.addEventListener('input', onCompose);
  compose.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  document.getElementById('send-btn').addEventListener('click', sendMessage);
  document.getElementById('mode-me').addEventListener('click', () => setComposeSender('me'));
  document.getElementById('mode-them').addEventListener('click', () => setComposeSender('them'));
  document.getElementById('feed').addEventListener('click', () => document.getElementById('compose').blur());

  initSettings();
}

document.addEventListener('DOMContentLoaded', init);

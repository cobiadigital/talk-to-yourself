class StorageManager {
  constructor() {
    this._msgsKey = 'tty_messages';
    this._draftKey = 'tty_draft';
    this._cfUrlKey = 'tty_cf_url';
    this._cfSecretKey = 'tty_cf_secret';
  }

  getMessages() {
    try {
      return JSON.parse(localStorage.getItem(this._msgsKey) || '[]');
    } catch {
      return [];
    }
  }

  saveMessages(msgs) {
    localStorage.setItem(this._msgsKey, JSON.stringify(msgs));
  }

  getDraft() {
    return localStorage.getItem(this._draftKey) || '';
  }

  saveDraft(text) {
    localStorage.setItem(this._draftKey, text);
  }

  getCfUrl() {
    return localStorage.getItem(this._cfUrlKey) || '';
  }

  getCfSecret() {
    return localStorage.getItem(this._cfSecretKey) || '';
  }

  saveCfConfig(url, secret) {
    localStorage.setItem(this._cfUrlKey, url);
    localStorage.setItem(this._cfSecretKey, secret);
  }

  isCloudflareConfigured() {
    return !!(this.getCfUrl() && this.getCfSecret());
  }

  async syncToCloudflare(msgs) {
    const url = this.getCfUrl();
    const secret = this.getCfSecret();
    if (!url || !secret) return;
    await fetch(`${url}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`,
      },
      body: JSON.stringify(msgs),
    });
  }

  async fetchFromCloudflare() {
    const url = this.getCfUrl();
    const secret = this.getCfSecret();
    if (!url || !secret) throw new Error('Cloudflare not configured');
    const res = await fetch(`${url}/messages`, {
      headers: { 'Authorization': `Bearer ${secret}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  mergeMessages(local, remote) {
    const byId = new Map();
    for (const m of local) byId.set(m.id, m);
    for (const m of remote) byId.set(m.id, m);
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.sentAt) - new Date(b.sentAt)
    );
  }

  exportJSON(msgs) {
    const blob = new Blob([JSON.stringify(msgs, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tty-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (!Array.isArray(data)) throw new Error('Expected a JSON array');
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsText(file);
    });
  }
}

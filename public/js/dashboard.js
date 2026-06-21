'use strict';

// ===== INIT =====
let currentPage = 'home';
let driveView = 'list';
let photoSelectMode = false;
let selectedPhotos = new Set();
let lightboxIndex = 0;
let calYear = 2026, calMonth = 5; // 0-indexed month (5 = June)
let activeNote = null;
let activeMail = null;
let activeReminder = null;

document.addEventListener('DOMContentLoaded', () => {
  loadUser();
  buildHomeApps();
  buildHomeRecents();
  buildPhotos();
  buildDrive();
  buildMail();
  buildCalendar();
  buildNotes();
  buildReminders();
  buildContacts();
  buildFindMy();
  buildStorage();
  buildSettings();
  buildNotifications();
  setupSearch();
  setupDragDrop();
  setupSidebarStorage();
});

// ===== USER =====
async function loadUser() {
  let email = '';
  try {
    const res = await fetch('/api/me');
    if (!res.ok) { window.location.href = 'index.html'; return; }
    const data = await res.json();
    email = data.email || '';
  } catch (_) {
    window.location.href = 'index.html'; return;
  }
  const name    = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const initial = name[0]?.toUpperCase() || '?';
  document.getElementById('user-greeting').textContent  = name;
  document.getElementById('menu-name').textContent      = name;
  document.getElementById('menu-email').textContent     = email;
  document.getElementById('user-avatar-btn').textContent = initial;
  document.getElementById('menu-avatar').textContent    = initial;
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' }).catch(() => {});
  window.location.href = 'index.html';
}

// logout tanımı loadUser bloğunda zaten var

// ===== NAVIGATION =====
function navigate(page) {
  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
  const sideItem = document.querySelector(`.sidebar-item[onclick*="'${page}'"]`);
  if (sideItem) sideItem.classList.add('active');
  currentPage = page;
  closeAllPanels();
  document.title = `iCloud — ${pageTitles[page] || 'iCloud'}`;
}

const pageTitles = {
  home:'Ana Sayfa', photos:'Fotoğraflar', drive:'iCloud Drive',
  mail:'Mail', calendar:'Takvim', contacts:'Kişiler',
  notes:'Notlar', reminders:'Anımsatıcılar', find:'Bul',
  storage:'Depolama', settings:'Ayarlar'
};

// ===== HOME =====
const HOME_APPS = [
  { page:'photos',    icon:'📷', bg:'linear-gradient(135deg,#ff9f0a,#ff6b35)', name:'Fotoğraflar',   subId:'home-sub-photos'    },
  { page:'drive',     icon:'☁️', bg:'linear-gradient(135deg,#0071e3,#5ac8fa)', name:'iCloud Drive',  subId:'home-sub-drive'     },
  { page:'mail',      icon:'✉️', bg:'linear-gradient(135deg,#0071e3,#00c7be)', name:'Mail',          subId:'home-sub-mail'      },
  { page:'calendar',  icon:'📅', bg:'linear-gradient(135deg,#ff3b30,#ff6961)', name:'Takvim',        subId:'home-sub-calendar'  },
  { page:'contacts',  icon:'👥', bg:'linear-gradient(135deg,#636366,#aeaeb2)', name:'Kişiler',       subId:'home-sub-contacts'  },
  { page:'notes',     icon:'📝', bg:'linear-gradient(135deg,#ffcc00,#ff9500)', name:'Notlar',        subId:'home-sub-notes'     },
  { page:'reminders', icon:'⏰', bg:'linear-gradient(135deg,#ff9500,#ffcc00)', name:'Anımsatıcılar', subId:'home-sub-reminders' },
  { page:'find',      icon:'📍', bg:'linear-gradient(135deg,#34c759,#00c7be)', name:'Bul',           subId:null                 },
];

function buildHomeApps() {
  const grid = document.getElementById('home-app-grid');
  grid.innerHTML = HOME_APPS.map(app => `
    <div class="app-tile" onclick="navigate('${app.page}')">
      <div class="app-tile-icon" style="background:${app.bg}">${app.icon}</div>
      <div class="app-tile-name">${app.name}</div>
      <div class="app-tile-sub" id="${app.subId || ''}"></div>
    </div>
  `).join('');
}

function setHomeSub(id, text) {
  const el = id && document.getElementById(id);
  if (el) el.textContent = text;
}

function buildHomeRecents() {
  // Gerçek son mailleri göstereceğiz — veri yüklendikten sonra updateHomeRecents() çağrılır
  document.getElementById('home-recents').innerHTML =
    '<div style="color:var(--apple-gray);font-size:0.85rem;padding:12px 0">Mailler yüklendikten sonra burada görünecek.</div>';
}

function updateHomeRecents(messages) {
  const list = document.getElementById('home-recents');
  if (!list || !messages.length) return;
  list.innerHTML = messages.slice(0, 5).map(m => `
    <div class="recent-item" onclick="navigate('mail')">
      <div class="recent-icon" style="background:#0071e320;color:#0071e3;font-size:22px">✉️</div>
      <div class="recent-info">
        <div class="recent-name">${escHtml(m.subject)}</div>
        <div class="recent-meta">Mail • ${escHtml(m.fromName || m.from)} • ${formatMailDate(m.date)}</div>
      </div>
    </div>`).join('');
}

// ===== PHOTOS =====
function buildPhotos() {
  const c = document.getElementById('photos-container');
  c.innerHTML = `
    <div class="photos-unavailable">
      <div class="photos-unavail-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </div>
      <h3 class="photos-unavail-title">Fotoğraflar bu uygulamada görüntülenemiyor</h3>
      <p class="photos-unavail-text">
        Apple, iCloud Fotoğrafları için Mail (IMAP), Kişiler (CardDAV) veya
        Takvim (CalDAV) gibi bir açık protokol sunmuyor. Fotoğraflara erişmek
        için tam Apple ID kimlik doğrulaması gerekiyor; bu uygulama şifresiyle
        mümkün değil.
      </p>
      <div class="photos-unavail-actions">
        <a href="https://www.icloud.com/photos/" target="_blank" rel="noopener" class="btn-primary" style="max-width:240px;text-decoration:none">
          iCloud.com'da Aç
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
        <button class="btn-secondary" style="max-width:240px" onclick="openUpload('photo')">
          📤 Dosya Yükle
        </button>
      </div>
      <div class="photos-unavail-info">
        <div class="photos-unavail-info-item">
          <span class="ok">✓</span> Mail (IMAP)
        </div>
        <div class="photos-unavail-info-item">
          <span class="ok">✓</span> Kişiler (CardDAV)
        </div>
        <div class="photos-unavail-info-item">
          <span class="ok">✓</span> Takvim (CalDAV)
        </div>
        <div class="photos-unavail-info-item">
          <span class="no">✕</span> Fotoğraflar (API yok)
        </div>
      </div>
    </div>`;
}

function togglePhotoSelect() {
  photoSelectMode = !photoSelectMode;
  document.querySelectorAll('.photo-check').forEach(el => {
    el.style.opacity = photoSelectMode ? '1' : '';
  });
  showToast(photoSelectMode ? 'Seçim modu açıldı. Fotoğraflara tıklayın.' : 'Seçim modu kapatıldı.', 'info');
}

// ===== LIGHTBOX =====
function openLightbox(photoId) {
  const idx = PHOTOS.findIndex(p => p.id === photoId);
  if (idx < 0) return;
  lightboxIndex = idx;
  showLightboxAt(idx);
  document.getElementById('lightbox').classList.remove('hidden');
}

function showLightboxAt(idx) {
  const p = PHOTOS[idx];
  document.getElementById('lightbox-img').src = p.src;
  document.getElementById('lightbox-img').alt = p.name;
  document.getElementById('lightbox-caption').textContent = `${p.name} — ${p.size} — ${p.date}`;
}

function lightboxNav(dir) {
  lightboxIndex = (lightboxIndex + dir + PHOTOS.length) % PHOTOS.length;
  showLightboxAt(lightboxIndex);
}

function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
}

document.addEventListener('keydown', e => {
  if (!document.getElementById('lightbox').classList.contains('hidden')) {
    if (e.key === 'ArrowLeft')  lightboxNav(-1);
    if (e.key === 'ArrowRight') lightboxNav(1);
    if (e.key === 'Escape')     closeLightbox();
  }
});

// ===== DRIVE =====
function buildDrive() {
  document.getElementById('drive-container').innerHTML = unavailablePage(
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.41 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l.92-1.02a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    'iCloud Drive bu uygulamada görüntülenemiyor',
    'iCloud Drive dosyalarınıza erişmek için standart bir protokol (WebDAV gibi) Apple tarafından uygulama şifresiyle desteklenmiyor.',
    'https://www.icloud.com/iclouddrive/'
  );
}
function setDriveView() {}
function navigateDrive() {}
function createFolder() {}

// ===== MAIL (GERÇEK iCLOUD IMAP) =====
let mailFolder = 'INBOX';
let mailPage   = 1;
let mailTotal  = 0;

function buildMail() {
  const c = document.getElementById('mail-container');
  c.innerHTML = `
    <div class="mail-list" id="mail-list-panel">
      <div class="mail-list-header">
        <h3 id="mail-folder-title">Gelen Kutusu</h3>
        <span class="mail-count" id="mail-unread-count">yükleniyor…</span>
      </div>
      <div id="mail-items" style="overflow-y:auto;flex:1">
        <div style="padding:32px;text-align:center;color:var(--apple-gray)">
          <div class="btn-spinner" style="margin:0 auto 12px;display:block"></div>
          Mailler yükleniyor…
        </div>
      </div>
      <div id="mail-pagination" style="padding:10px 14px;border-top:1px solid rgba(0,0,0,0.07);display:flex;gap:8px;justify-content:center;flex-shrink:0"></div>
    </div>
    <div class="mail-detail" id="mail-detail">
      <div class="mail-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <span>Bir mail seçerek okuyun</span>
      </div>
    </div>`;
  fetchMails();
}

async function fetchMails(page) {
  if (page) mailPage = page;
  const items = document.getElementById('mail-items');
  if (!items) return;
  items.innerHTML = '<div style="padding:24px;text-align:center;color:var(--apple-gray)"><div class="btn-spinner" style="margin:0 auto 10px;display:block"></div>Yükleniyor…</div>';

  try {
    const res  = await fetch(`/api/mail/messages?folder=${encodeURIComponent(mailFolder)}&page=${mailPage}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hata');

    mailTotal = data.total;
    const count = document.getElementById('mail-unread-count');
    if (count) count.textContent = data.unseen ? `${data.unseen} okunmamış` : '';

    // Sidebar + home stats güncelle
    const badge = document.getElementById('sidebar-mail-badge');
    if (badge) badge.innerHTML = data.unseen ? `<span class="badge">${data.unseen}</span>` : '';
    setHomeSub('home-sub-mail', data.unseen ? `${data.unseen} okunmamış` : `${data.total} mail`);
    updateHomeRecents(data.messages || []);

    if (!data.messages.length) {
      items.innerHTML = '<div style="padding:32px;text-align:center;color:var(--apple-gray)">Bu klasörde mail yok.</div>';
      return;
    }

    const MAIL_COLORS = ['#0071e3','#ff3b30','#34c759','#ff9500','#5856d6','#ff2d55','#00c7be','#8e8e93'];
    items.innerHTML = data.messages.map(m => {
      const sName = m.fromName || m.from || '?';
      const initials = sName.split(/\s+/).slice(0,2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
      const color = MAIL_COLORS[(sName.charCodeAt(0) || 0) % MAIL_COLORS.length];
      return `
      <div class="mail-item ${m.seen ? '' : 'unread'}" id="mail-item-${m.uid}" onclick="openMail(${m.uid})">
        <div class="mail-item-av" style="background:${color}">${escHtml(initials)}</div>
        <div class="mail-item-body">
          <div class="mail-item-row1">
            <span class="mail-sender">${m.seen ? '' : '<span class="unread-dot"></span>'}${escHtml(sName)}</span>
            <span class="mail-time">${formatMailDate(m.date)}</span>
          </div>
          <div class="mail-subject">${escHtml(m.subject)}</div>
        </div>
      </div>`;
    }).join('');

    // Sayfalama
    const pagination = document.getElementById('mail-pagination');
    const totalPages = Math.ceil(mailTotal / data.perPage);
    if (totalPages > 1 && pagination) {
      pagination.innerHTML = `
        <button class="select-btn" onclick="fetchMails(${mailPage - 1})" ${mailPage <= 1 ? 'disabled style="opacity:0.4"' : ''}>‹ Önceki</button>
        <span style="font-size:0.82rem;color:var(--apple-gray);align-self:center">${mailPage} / ${totalPages}</span>
        <button class="select-btn" onclick="fetchMails(${mailPage + 1})" ${mailPage >= totalPages ? 'disabled style="opacity:0.4"' : ''}>Sonraki ›</button>`;
    }
  } catch (err) {
    items.innerHTML = `<div style="padding:24px;text-align:center;color:#ff3b30">${escHtml(err.message)}</div>`;
  }
}

async function openMail(uid) {
  activeMail = uid;
  document.querySelectorAll('.mail-item').forEach(el => el.classList.remove('active'));
  const item = document.getElementById(`mail-item-${uid}`);
  if (item) { item.classList.add('active'); item.classList.remove('unread'); item.querySelector('.unread-dot')?.remove(); }

  const detail = document.getElementById('mail-detail');
  detail.innerHTML = '<div class="mail-empty"><div class="btn-spinner" style="width:24px;height:24px;border-width:2.5px;border-color:rgba(0,0,0,0.1);border-top-color:var(--apple-blue)"></div></div>';

  try {
    const res  = await fetch(`/api/mail/message/${uid}?folder=${encodeURIComponent(mailFolder)}`);
    const m    = await res.json();
    if (!res.ok) throw new Error(m.error || 'Yüklenemedi');

    const MAIL_COLORS = ['#0071e3','#ff3b30','#34c759','#ff9500','#5856d6','#ff2d55','#00c7be','#8e8e93'];
    const sName = m.fromName || m.from || '?';
    const initials = sName.split(/\s+/).slice(0,2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
    const sColor = MAIL_COLORS[(sName.charCodeAt(0) || 0) % MAIL_COLORS.length];

    const body = m.htmlBody
      ? `<iframe sandbox="allow-same-origin" class="mail-iframe" srcdoc="${escAttr(m.htmlBody)}" onload="this.style.height=this.contentDocument.body.scrollHeight+32+'px'"></iframe>`
      : `<div class="mail-body-area" style="white-space:pre-wrap">${escHtml(m.textBody || '(İçerik yok)')}</div>`;

    detail.innerHTML = `
      <div class="mail-detail-toolbar">
        <button class="mail-action-btn" onclick="replyMail(${uid})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
          Yanıtla
        </button>
        <button class="mail-action-btn" onclick="forwardMail(${uid})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>
          İlet
        </button>
        <div class="mail-toolbar-sep"></div>
        <button class="mail-action-btn" onclick="toggleFlag(${uid})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          Yıldızla
        </button>
        <div style="flex:1"></div>
        <button class="mail-action-btn danger" onclick="deleteMail(${uid})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          Sil
        </button>
      </div>
      <div class="mail-detail-scroll">
        <div class="mail-detail-subject">${escHtml(m.subject)}</div>
        <div class="mail-sender-card">
          <div class="mail-sender-av" style="background:${sColor}">${escHtml(initials)}</div>
          <div class="mail-sender-info">
            <div class="mail-sender-name">${escHtml(m.fromName || m.from)}</div>
            <div class="mail-sender-email">${escHtml(m.from)}</div>
            <div class="mail-sender-to">
              Kime: ${escHtml(m.to)}${m.cc ? `<br>CC: ${escHtml(m.cc)}` : ''}
            </div>
          </div>
          <div class="mail-sender-date">${formatMailDate(m.date)}</div>
        </div>
        ${body}
        ${m.attachments?.length ? `
        <div class="mail-attach-wrap">
          <div class="mail-attach-title">📎 ${m.attachments.length} ek dosya</div>
          ${m.attachments.map(a => `
            <span class="mail-attach-chip">
              📄 <span>${escHtml(a.filename)}</span>
              <span class="mail-attach-size">${formatSize(a.size)}</span>
            </span>`).join('')}
        </div>` : ''}
      </div>`;
  } catch (err) {
    detail.innerHTML = `<div style="padding:24px;color:#ff3b30">${escHtml(err.message)}</div>`;
  }
}

async function deleteMail(uid) {
  if (!confirm('Bu maili silmek istediğinizden emin misiniz?')) return;
  try {
    const res = await fetch(`/api/mail/message/${uid}?folder=${encodeURIComponent(mailFolder)}`, { method: 'DELETE' });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    document.getElementById(`mail-item-${uid}`)?.remove();
    document.getElementById('mail-detail').innerHTML = '<div class="mail-empty"><span>Mail silindi</span></div>';
    showToast('Mail silindi.', 'success');
  } catch (err) {
    showToast('Silinemedi: ' + err.message, 'error');
  }
}

async function toggleFlag(uid) {
  try {
    await fetch(`/api/mail/message/${uid}/flag`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder: mailFolder, flag: '\\Flagged', value: true })
    });
    showToast('Yıldızlandı.', 'success');
  } catch (_) { showToast('İşlem başarısız.', 'error'); }
}

function replyMail(uid) {
  document.getElementById('compose-modal').classList.remove('hidden');
  // Detay panelindeki from bilgisini al
  const fromEl = document.querySelector('#mail-detail .mail-detail-from');
  if (fromEl) {
    const match = fromEl.textContent.match(/<(.+?)>/);
    if (match) document.getElementById('compose-to').value = match[1];
  }
}

function forwardMail(uid) {
  document.getElementById('compose-modal').classList.remove('hidden');
}

function composeMail() {
  document.getElementById('compose-to').value = '';
  document.getElementById('compose-subject').value = '';
  document.getElementById('compose-body').value = '';
  document.getElementById('compose-modal').classList.remove('hidden');
}

async function sendMail() {
  const to      = document.getElementById('compose-to').value.trim();
  const subject = document.getElementById('compose-subject').value.trim();
  const body    = document.getElementById('compose-body').value.trim();
  if (!to)      { showToast('Alıcı girin.', 'error'); return; }
  if (!subject) { showToast('Konu girin.', 'error');  return; }
  if (!body)    { showToast('Mesaj girin.', 'error'); return; }

  const btn = document.querySelector('#compose-modal .btn-primary');
  btn.disabled = true; btn.textContent = 'Gönderiliyor…';

  try {
    const res = await fetch('/api/mail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, body })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast('Mail gönderildi!', 'success');
    closeModal('compose-modal');
    document.getElementById('compose-to').value = '';
    document.getElementById('compose-subject').value = '';
    document.getElementById('compose-body').value = '';
  } catch (err) {
    showToast('Gönderilemedi: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Gönder ↗';
  }
}

// ===== MAIL UTILS =====
function formatMailDate(d) {
  if (!d) return '';
  const date = new Date(d);
  const now  = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Dün';
  return date.toLocaleDateString('tr-TR', { day:'numeric', month:'short' });
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes/1024).toFixed(0) + ' KB';
  return (bytes/1048576).toFixed(1) + ' MB';
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(str) {
  if (!str) return '';
  return String(str).replace(/"/g, '&quot;');
}

// ===== CALENDAR (GERÇEK CalDAV) =====
let _calEvents = []; // gerçek takvim etkinlikleri

async function buildCalendar() {
  const c = document.getElementById('calendar-container');
  c.innerHTML = `
    <div class="cal-grid">
      <div class="cal-main">
        <div class="cal-header">
          <button class="cal-nav-btn" onclick="changeMonth(-1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h2 id="cal-title"></h2>
          <button class="cal-nav-btn" onclick="changeMonth(1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <button class="select-btn" onclick="showToast('Yeni etkinlik ekleniyor...','info')">+ Etkinlik</button>
        </div>
        <div class="cal-days-header">
          ${['Paz','Pzt','Sal','Çar','Per','Cum','Cmt'].map(d => `<div class="cal-day-label">${d}</div>`).join('')}
        </div>
        <div class="cal-days-grid" id="cal-days-grid"></div>
      </div>
      <div class="cal-sidebar-panel">
        <h3>Yaklaşan Etkinlikler</h3>
        <div id="upcoming-events">
          <div style="display:flex;align-items:center;gap:8px;color:var(--apple-gray);font-size:0.85rem">
            <div class="btn-spinner" style="width:14px;height:14px;border-width:2px;border-color:rgba(0,0,0,0.12);border-top-color:var(--apple-blue)"></div>
            Yükleniyor…
          </div>
        </div>
      </div>
    </div>`;

  renderCalendar();

  try {
    const res  = await fetch('/api/calendar/events');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Takvim yüklenemedi');
    _calEvents = (data.events || []).map(e => ({
      ...e,
      startDate: e.start ? new Date(e.start) : null
    }));
    renderCalendar();
    // Home stats güncelle
    const now = new Date();
    const upcoming = _calEvents.filter(e => e.startDate && e.startDate >= now).length;
    setHomeSub('home-sub-calendar', upcoming ? `${upcoming} etkinlik` : 'Takvim');
  } catch (err) {
    const up = document.getElementById('upcoming-events');
    if (up) up.innerHTML = `<p style="color:#ff3b30;font-size:0.82rem">${escHtml(err.message)}</p>`;
  }
}

function renderCalendar() {
  if (!document.getElementById('cal-title')) return;
  const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  const MONTHS_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
  document.getElementById('cal-title').textContent = `${MONTHS[calMonth]} ${calYear}`;

  const firstDay   = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevDays   = new Date(calYear, calMonth, 0).getDate();
  const today      = new Date();
  const COLORS     = ['#0071e3','#ff3b30','#34c759','#ff9500','#5856d6','#ff2d55','#00c7be'];

  // Events for this month from real data
  const monthEvents = _calEvents.filter(e => {
    if (!e.startDate) return false;
    return e.startDate.getFullYear() === calYear && e.startDate.getMonth() === calMonth;
  });

  let cells = '';
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  for (let i = 0; i < totalCells; i++) {
    let day, isOther = false;
    if (i < firstDay)                        { day = prevDays - firstDay + i + 1; isOther = true; }
    else if (i >= firstDay + daysInMonth)    { day = i - firstDay - daysInMonth + 1; isOther = true; }
    else                                     { day = i - firstDay + 1; }

    const isToday = !isOther && day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
    const evs = isOther ? [] : monthEvents.filter(e => e.startDate.getDate() === day);

    cells += `
      <div class="cal-day ${isOther ? 'other-month' : ''} ${isToday ? 'today' : ''}">
        <div class="cal-day-num">${day}</div>
        ${evs.slice(0, 2).map((e, idx) => {
          const bg = COLORS[idx % COLORS.length];
          return `<div class="cal-event" style="background:${bg}22;color:${bg}" title="${escHtml(e.title)}">${escHtml(e.title)}</div>`;
        }).join('')}
        ${evs.length > 2 ? `<div class="cal-event" style="background:#0071e322;color:#0071e3">+${evs.length - 2} daha</div>` : ''}
      </div>`;
  }
  document.getElementById('cal-days-grid').innerHTML = cells;

  // Upcoming sidebar
  const upcoming = monthEvents
    .filter(e => e.startDate >= new Date(calYear, calMonth, 1))
    .sort((a, b) => a.startDate - b.startDate)
    .slice(0, 8);

  const upEl = document.getElementById('upcoming-events');
  if (!upEl) return;

  if (!_calEvents.length && !upcoming.length) {
    upEl.innerHTML = '<p style="color:var(--apple-gray);font-size:0.85rem">Bu ay etkinlik yok.</p>';
    return;
  }

  upEl.innerHTML = upcoming.length
    ? upcoming.map((e, idx) => `
      <div class="event-list-item">
        <div class="event-dot" style="background:${COLORS[idx % COLORS.length]}"></div>
        <div>
          <div class="event-list-name">${escHtml(e.title)}</div>
          <div class="event-list-time">
            ${e.startDate.getDate()} ${MONTHS_SHORT[e.startDate.getMonth()]} ${e.startDate.getFullYear()}
            ${e.location ? `· 📍 ${escHtml(e.location)}` : ''}
            ${e.calName ? `<span style="opacity:0.6"> · ${escHtml(e.calName)}</span>` : ''}
          </div>
        </div>
      </div>`).join('')
    : '<p style="color:var(--apple-gray);font-size:0.85rem">Bu ay etkinlik yok.</p>';
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

// ===== NOTES (Yalnızca tarayıcıda — iCloud sync yok) =====
let _localNotes = JSON.parse(localStorage.getItem('icloud_web_notes') || '[]');

function saveLocalNotes() {
  localStorage.setItem('icloud_web_notes', JSON.stringify(_localNotes));
}

function buildNotes() {
  const c = document.getElementById('notes-container');
  c.innerHTML = `
    <div class="local-notes-banner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Bu notlar yalnızca bu tarayıcıda saklanır — iCloud ile senkronize edilmez.
    </div>
    <div class="notes-layout">
      <div class="notes-list">
        <div class="notes-list-header">
          <h3>Notlar</h3>
          <button class="select-btn" onclick="newNote()" style="padding:5px 12px;font-size:0.8rem">+ Yeni</button>
        </div>
        <div id="notes-list-items">
          ${_localNotes.length === 0
            ? `<div style="padding:20px 16px;color:var(--apple-gray);font-size:0.85rem">Henüz not yok. "Yeni" ile başlayın.</div>`
            : _localNotes.map(n => `
            <div class="note-item" id="note-item-${n.id}" onclick="openNote(${n.id})">
              <div class="note-title-text">${escHtml(n.title)}</div>
              <div class="note-preview">${escHtml(n.body.split('\n')[0])}</div>
              <div class="note-date">${n.date}</div>
            </div>`).join('')}
        </div>
      </div>
      <div class="note-editor" id="note-editor">
        <input class="note-editor-title" id="note-title-input" placeholder="Başlık" />
        <textarea class="note-editor-body" id="note-body-input" placeholder="Notunuzu yazın..."></textarea>
        <div style="display:flex;gap:10px;margin-top:12px">
          <button class="select-btn" onclick="saveNote()">💾 Kaydet</button>
          <button class="select-btn" style="color:#ff3b30" onclick="deleteNote()">🗑 Sil</button>
        </div>
      </div>
    </div>`;
  if (_localNotes.length) openNote(_localNotes[0].id);
  setHomeSub('home-sub-notes', `${_localNotes.length} not`);
}

function openNote(id) {
  activeNote = id;
  const n = _localNotes.find(x => x.id === id);
  if (!n) return;
  document.querySelectorAll('.note-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`note-item-${id}`)?.classList.add('active');
  document.getElementById('note-title-input').value = n.title;
  document.getElementById('note-body-input').value = n.body;
}

function saveNote() {
  const title = document.getElementById('note-title-input').value || 'Başlıksız';
  const body  = document.getElementById('note-body-input').value;
  if (activeNote) {
    const n = _localNotes.find(x => x.id === activeNote);
    if (n) { n.title = title; n.body = body; n.date = 'Az önce'; }
    const item = document.getElementById(`note-item-${activeNote}`);
    if (item) {
      item.querySelector('.note-title-text').textContent = title;
      item.querySelector('.note-preview').textContent = body.split('\n')[0];
      item.querySelector('.note-date').textContent = 'Az önce';
    }
    saveLocalNotes();
  }
  showToast('Not kaydedildi.', 'success');
}

function deleteNote() {
  if (!activeNote) return;
  if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return;
  _localNotes = _localNotes.filter(x => x.id !== activeNote);
  saveLocalNotes();
  document.getElementById(`note-item-${activeNote}`)?.remove();
  activeNote = null;
  document.getElementById('note-title-input').value = '';
  document.getElementById('note-body-input').value = '';
  showToast('Not silindi.', 'info');
}

function newNote() {
  const id = Date.now();
  const note = { id, title: 'Yeni Not', body: '', date: 'Az önce' };
  _localNotes.unshift(note);
  saveLocalNotes();
  const container = document.getElementById('notes-list-items');
  if (container) {
    const existing = container.querySelector('[style*="Henüz"]');
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.className = 'note-item'; div.id = `note-item-${id}`;
    div.onclick = () => openNote(id);
    div.innerHTML = `<div class="note-title-text">Yeni Not</div><div class="note-preview"></div><div class="note-date">Az önce</div>`;
    container.prepend(div);
  }
  openNote(id);
  setHomeSub('home-sub-notes', `${_localNotes.length} not`);
}

// ===== REMINDERS (GERÇEK CalDAV VTODO) =====
let _reminders = [];

async function buildReminders() {
  const c = document.getElementById('reminders-container');
  c.innerHTML = `<div style="padding:32px;text-align:center;color:var(--apple-gray)">
    <div class="btn-spinner" style="margin:0 auto 14px;display:block;width:22px;height:22px;border-width:2.5px;border-color:rgba(0,0,0,0.12);border-top-color:var(--apple-blue)"></div>
    iCloud anımsatıcıları yükleniyor…</div>`;

  try {
    const res  = await fetch('/api/reminders');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Anımsatıcılar yüklenemedi');
    _reminders = data.reminders;
    renderReminders();
    const pending = _reminders.filter(r => !r.done).length;
    const sb = document.getElementById('sidebar-reminders-count');
    if (sb) sb.textContent = pending || '';
    setHomeSub('home-sub-reminders', pending ? `${pending} bekliyor` : 'Hepsi tamam');
  } catch (err) {
    c.innerHTML = `<div style="padding:28px;color:#ff3b30;text-align:center">${escHtml(err.message)}</div>`;
  }
}

function renderReminders() {
  const c = document.getElementById('reminders-container');
  if (!c) return;
  const priorityColor = { high:'#ff3b30', medium:'#ff9500', low:'#34c759' };

  const pending   = _reminders.filter(r => !r.done);
  const completed = _reminders.filter(r => r.done);

  const rows = (items) => items.map((r, i) => {
    const due = r.due ? new Date(r.due) : null;
    const dueStr = due ? due.toLocaleDateString('tr-TR', { day:'numeric', month:'short' }) : '';
    return `
      <div class="reminder-row" id="rem-${escHtml(r.uid || String(i))}">
        <span class="reminder-check" onclick="toggleReminderLocal('${escHtml(r.uid || String(i))}')">${r.done ? '✅' : '⭕'}</span>
        <div class="reminder-info">
          <div class="reminder-title ${r.done ? 'done' : ''}">${escHtml(r.title)}</div>
          <div class="reminder-meta">${r.listName ? escHtml(r.listName) : ''}${dueStr ? ` · ${dueStr}` : ''}</div>
        </div>
        ${r.priority !== 'low'
          ? `<span class="reminder-priority" style="color:${priorityColor[r.priority]||'#ff9500'}">${r.priority === 'high' ? '!!!' : '!!'}</span>`
          : ''}
      </div>`;
  }).join('');

  c.innerHTML = `
    <div class="reminders-list">
      ${pending.length === 0 && completed.length === 0
        ? `<div style="padding:40px;text-align:center;color:var(--apple-gray)">Anımsatıcı yok.</div>`
        : ''}
      ${pending.length   ? `<div class="reminders-section-title">Bekliyor (${pending.length})</div>${rows(pending)}` : ''}
      ${completed.length ? `<div class="reminders-section-title" style="margin-top:16px">Tamamlandı (${completed.length})</div>${rows(completed)}` : ''}
    </div>`;
}

function toggleReminderLocal(uid) {
  const r = _reminders.find(x => (x.uid || '') === uid);
  if (!r) return;
  r.done = !r.done;
  renderReminders();
  showToast(r.done ? 'Tamamlandı!' : 'Geri alındı.', r.done ? 'success' : 'info');
}

function addReminder() {
  showToast('Anımsatıcı eklemek için iCloud.com\'u kullanın.', 'info');
}

// ===== CONTACTS (GERÇEK CardDAV) =====
let _contacts = [];

async function buildContacts() {
  const c = document.getElementById('contacts-container');
  c.innerHTML = `
    <div class="contacts-search-wrap">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input type="text" class="contacts-search-input" id="contacts-search-input" placeholder="Kişi, telefon veya e-posta ara…" oninput="filterContacts(this.value)" />
    </div>
    <div id="contacts-body">
      <div style="padding:40px;text-align:center;color:var(--apple-gray)">
        <div class="btn-spinner" style="margin:0 auto 14px;display:block;width:22px;height:22px;border-width:2.5px;border-color:rgba(0,0,0,0.15);border-top-color:var(--apple-blue)"></div>
        iCloud kişileri yükleniyor…
      </div>
    </div>`;

  try {
    const res  = await fetch('/api/contacts');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Kişiler yüklenemedi');
    _contacts = data.contacts;
    renderContacts('');
    // Sidebar + home stats güncelle
    const n = _contacts.length;
    const sb = document.getElementById('sidebar-contacts-count');
    if (sb) sb.textContent = n;
    setHomeSub('home-sub-contacts', `${n} kişi`);
  } catch (err) {
    document.getElementById('contacts-body').innerHTML =
      `<div style="padding:28px;color:#ff3b30;text-align:center">${escHtml(err.message)}</div>`;
  }
}

function filterContacts(query) {
  renderContacts((query || '').trim().toLowerCase());
}

function renderContacts(query) {
  const body = document.getElementById('contacts-body');
  if (!body) return;

  const filtered = _contacts.filter(con =>
    !query ||
    con.name.toLowerCase().includes(query) ||
    con.phone.includes(query) ||
    con.email.toLowerCase().includes(query)
  );

  const grouped = {};
  filtered.forEach(con => {
    const letter = con.name[0]?.toUpperCase() || '#';
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(con);
  });

  if (!filtered.length) {
    body.innerHTML = `<div style="padding:40px;text-align:center;color:var(--apple-gray)">${query ? 'Sonuç bulunamadı.' : 'Kişi yok.'}</div>`;
    return;
  }

  body.innerHTML = `<div class="contacts-body">
    ${Object.entries(grouped).sort(([a],[b]) => a.localeCompare(b,'tr')).map(([letter, cons]) => `
      <div class="contact-group">
        <div class="contact-group-letter">${letter}</div>
        ${cons.map(con => `
          <div class="contact-row">
            <div class="contact-avatar-circle" style="background:${con.color}">${escHtml(con.initials)}</div>
            <div class="contact-row-info">
              <div class="contact-row-name">${escHtml(con.name)}</div>
              <div class="contact-row-sub">
                ${con.phone ? `<span>${escHtml(con.phone)}</span>` : ''}
                ${con.phone && con.email ? `<span class="contact-row-dot">·</span>` : ''}
                ${con.email ? `<span>${escHtml(con.email)}</span>` : ''}
              </div>
            </div>
            <div class="contact-row-btns">
              ${con.phone ? `<button class="contact-icon-btn" title="Ara" onclick="showToast('Aranıyor: ${escHtml(con.phone)}','info')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.71 3.41 2 2 0 0 1 3.68 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </button>` : ''}
              ${con.email ? `<button class="contact-icon-btn" title="Mail Gönder" onclick="composeTo('${escHtml(con.email)}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </button>` : ''}
            </div>
          </div>`).join('')}
      </div>`).join('')}
  </div>`;
}

function composeTo(email) {
  document.getElementById('compose-to').value = email;
  document.getElementById('compose-subject').value = '';
  document.getElementById('compose-body').value = '';
  document.getElementById('compose-modal').classList.remove('hidden');
}

// ===== FIND MY =====
function buildFindMy() {
  document.getElementById('find-container').innerHTML = unavailablePage(
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    '"Bul" bu uygulamada görüntülenemiyor',
    'Apple, "iPhone\'umu Bul" ve cihaz konumu için herhangi bir açık protokol veya API sunmuyor. Bu özelliğe yalnızca iCloud.com veya Apple cihazlarından erişilebilir.',
    'https://www.icloud.com/find/'
  );
}

// ===== STORAGE =====
function buildStorage() {
  document.getElementById('storage-container').innerHTML = unavailablePage(
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
    'Depolama bilgisi bu uygulamada görüntülenemiyor',
    'iCloud depolama kullanımına erişmek için Apple, yalnızca kendi uygulamalarına açık bir API kullanmaktadır. Üçüncü taraf uygulamalar bu bilgiye erişemez.',
    'https://www.icloud.com/settings/'
  );
}

// ===== UNAVAILABLE PAGE HELPER =====
function unavailablePage(svgIcon, title, text, link) {
  return `
    <div class="page-unavailable">
      <div class="page-unavail-icon">${svgIcon}</div>
      <h3 class="page-unavail-title">${title}</h3>
      <p class="page-unavail-text">${text}</p>
      ${link ? `<a href="${link}" target="_blank" rel="noopener" class="btn-primary" style="max-width:220px;text-decoration:none;margin-top:8px">
        iCloud.com'da Aç
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>` : ''}
    </div>`;
}

// ===== SETTINGS =====
function buildSettings() {
  const c = document.getElementById('settings-container');
  c.innerHTML = `
    <div style="max-width:520px;display:flex;flex-direction:column;gap:16px">
      <div class="glass-card" style="padding:24px">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:4px">Hesap Bilgileri</h3>
        <p style="font-size:0.82rem;color:var(--apple-gray);margin-bottom:16px">Bu uygulama iCloud bilgilerini yalnızca IMAP/CardDAV/CalDAV üzerinden okur. Hesap değişiklikleri için Apple ID ayarlarını kullanın.</p>
        <div style="display:flex;align-items:center;gap:16px;padding:14px;background:rgba(0,0,0,0.04);border-radius:12px;margin-bottom:12px">
          <div id="settings-avatar" style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#0071e3,#5ac8fa);display:flex;align-items:center;justify-content:center;color:white;font-size:22px;font-weight:700;flex-shrink:0"></div>
          <div>
            <div id="settings-name-display" style="font-weight:700;font-size:1rem"></div>
            <div id="settings-email-display" style="font-size:0.82rem;color:var(--apple-gray)"></div>
          </div>
        </div>
        <a href="https://appleid.apple.com" target="_blank" rel="noopener" class="btn-secondary" style="text-decoration:none">Apple ID Ayarlarını Aç ↗</a>
      </div>
      <div class="glass-card" style="padding:24px">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">Bu Uygulama Hakkında</h3>
        <div style="display:flex;flex-direction:column;gap:10px;font-size:0.88rem">
          <div style="display:flex;justify-content:space-between"><span>Mail</span><span style="color:#34c759;font-weight:600">IMAP (gerçek)</span></div>
          <div style="display:flex;justify-content:space-between"><span>Kişiler</span><span style="color:#34c759;font-weight:600">CardDAV (gerçek)</span></div>
          <div style="display:flex;justify-content:space-between"><span>Takvim</span><span style="color:#34c759;font-weight:600">CalDAV (gerçek)</span></div>
          <div style="display:flex;justify-content:space-between"><span>Anımsatıcılar</span><span style="color:#34c759;font-weight:600">CalDAV VTODO (gerçek)</span></div>
          <div style="display:flex;justify-content:space-between"><span>Notlar</span><span style="color:#ff9500;font-weight:600">Yalnızca tarayıcı</span></div>
          <div style="display:flex;justify-content:space-between"><span>Fotoğraflar / Drive / Bul</span><span style="color:#ff3b30;font-weight:600">API yok</span></div>
        </div>
      </div>
      <button class="btn-secondary" style="color:#ff3b30;border-color:#ff3b30" onclick="logout()">Hesaptan Çıkış Yap</button>
    </div>`;

  // Gerçek kullanıcı bilgilerini doldur
  const emailEl = document.getElementById('settings-email-display');
  const nameEl  = document.getElementById('settings-name-display');
  const avatarEl= document.getElementById('settings-avatar');
  const email   = document.getElementById('menu-email')?.textContent || '';
  const name    = document.getElementById('menu-name')?.textContent  || '';
  if (emailEl) emailEl.textContent = email;
  if (nameEl)  nameEl.textContent  = name;
  if (avatarEl)avatarEl.textContent = name[0]?.toUpperCase() || '?';
}

function saveSettings() {}

// ===== NOTIFICATIONS =====
function buildNotifications() {
  const list = document.getElementById('notif-list');
  list.innerHTML = NOTIFICATIONS.map(n => `
    <div class="user-menu-item">
      <span style="font-size:18px">${n.icon}</span>
      <div>
        <div style="font-size:0.85rem">${n.text}</div>
        <div style="font-size:0.75rem;color:var(--apple-gray)">${n.time}</div>
      </div>
    </div>`).join('') +
    `<div class="user-menu-divider"></div>
     <div class="user-menu-item" onclick="showToast('Tüm bildirimler temizlendi.','info')">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--apple-gray)"><polyline points="20 6 9 17 4 12"/></svg>
       Tümünü Okundu İşaretle
     </div>`;
}

// ===== SIDEBAR STORAGE ANIMATION =====
function setupSidebarStorage() {
  setTimeout(() => {
    const fill = document.getElementById('sidebar-storage-fill');
    if (fill) fill.style.width = '39.4%';
  }, 500);
}

// ===== UPLOAD =====
let uploadContext = '';

function openUpload(ctx) {
  uploadContext = ctx;
  document.getElementById('upload-modal-title').textContent = ctx === 'photo' ? 'Fotoğraf Yükle' : 'Dosya Yükle';
  document.getElementById('upload-modal').classList.remove('hidden');
  document.getElementById('upload-progress-list').innerHTML = '';
}

function handleFileSelect(input) {
  const files = [...input.files];
  const list = document.getElementById('upload-progress-list');
  list.innerHTML = '';
  files.forEach(file => {
    const item = document.createElement('div');
    item.style.cssText = 'margin-top:12px;font-size:0.85rem;display:flex;flex-direction:column;gap:6px';
    item.innerHTML = `
      <div style="display:flex;justify-content:space-between">
        <span>${file.name}</span>
        <span id="pct-${file.name.replace(/\W/g,'')}" style="color:var(--apple-blue);font-weight:600">0%</span>
      </div>
      <div style="height:6px;background:rgba(0,0,0,0.08);border-radius:3px;overflow:hidden">
        <div id="bar-${file.name.replace(/\W/g,'')}" style="height:100%;background:var(--apple-blue);border-radius:3px;width:0;transition:width 0.3s"></div>
      </div>`;
    list.appendChild(item);
    simulateUpload(file.name);
  });
}

function simulateUpload(name) {
  const key = name.replace(/\W/g,'');
  let pct = 0;
  const iv = setInterval(() => {
    pct += Math.random() * 20 + 5;
    if (pct >= 100) { pct = 100; clearInterval(iv); showToast(`"${name}" yüklendi.`, 'success'); }
    const el = document.getElementById(`pct-${key}`);
    const bar = document.getElementById(`bar-${key}`);
    if (el) el.textContent = `${Math.round(pct)}%`;
    if (bar) bar.style.width = `${pct}%`;
  }, 200);
}

function setupDragDrop() {
  const zone = document.getElementById('upload-zone');
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const input = document.getElementById('file-input');
    const dt = new DataTransfer();
    [...e.dataTransfer.files].forEach(f => dt.items.add(f));
    input.files = dt.files;
    handleFileSelect(input);
  });
}

// ===== SEARCH =====
function setupSearch() {
  const input = document.getElementById('global-search');
  const clearBtn = document.getElementById('search-clear-btn');
  if (!input) return;
  input.addEventListener('input', () => {
    clearBtn.classList.toggle('hidden', !input.value);
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      showToast(`"${input.value}" için arama sonuçları: henüz uygulanmadı.`, 'info');
    }
  });
}

function clearSearch() {
  const input = document.getElementById('global-search');
  input.value = '';
  document.getElementById('search-clear-btn').classList.add('hidden');
  input.focus();
}

// ===== PANELS =====
function toggleUserMenu() {
  const menu = document.getElementById('user-menu');
  const notif = document.getElementById('notif-panel');
  notif.classList.add('hidden');
  menu.classList.toggle('hidden');
}

function toggleNotifications() {
  const notif = document.getElementById('notif-panel');
  const menu = document.getElementById('user-menu');
  menu.classList.add('hidden');
  notif.classList.toggle('hidden');
}

function closeAllPanels() {
  document.getElementById('user-menu')?.classList.add('hidden');
  document.getElementById('notif-panel')?.classList.add('hidden');
}

document.addEventListener('click', e => {
  if (!e.target.closest('#user-avatar-btn') && !e.target.closest('#user-menu')) {
    document.getElementById('user-menu')?.classList.add('hidden');
  }
  if (!e.target.closest('.header-btn') && !e.target.closest('#notif-panel')) {
    document.getElementById('notif-panel')?.classList.add('hidden');
  }
});

// ===== MODAL =====
function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.add('hidden'); });
});

// ===== TOAST =====
function showToast(msg, type = 'info') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.4s'; setTimeout(() => t.remove(), 400); }, 3000);
}

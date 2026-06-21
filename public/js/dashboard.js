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
  { page:'photos',   icon:'📷', bg:'linear-gradient(135deg,#ff9f0a,#ff6b35)', name:'Fotoğraflar',  sub:'2.847 öğe' },
  { page:'drive',    icon:'☁️', bg:'linear-gradient(135deg,#0071e3,#5ac8fa)', name:'iCloud Drive', sub:'19,7 GB' },
  { page:'mail',     icon:'✉️', bg:'linear-gradient(135deg,#0071e3,#00c7be)', name:'Mail',         sub:'12 okunmamış' },
  { page:'calendar', icon:'📅', bg:'linear-gradient(135deg,#ff3b30,#ff6961)', name:'Takvim',       sub:'2 etkinlik' },
  { page:'contacts', icon:'👥', bg:'linear-gradient(135deg,#636366,#aeaeb2)', name:'Kişiler',      sub:'284 kişi' },
  { page:'notes',    icon:'📝', bg:'linear-gradient(135deg,#ffcc00,#ff9500)', name:'Notlar',       sub:'5 not' },
  { page:'reminders',icon:'⏰', bg:'linear-gradient(135deg,#ff9500,#ffcc00)', name:'Anımsatıcılar',sub:'4 bekliyor' },
  { page:'find',     icon:'📍', bg:'linear-gradient(135deg,#34c759,#00c7be)', name:'Bul',          sub:'3 cihaz' },
];

function buildHomeApps() {
  const grid = document.getElementById('home-app-grid');
  grid.innerHTML = HOME_APPS.map(app => `
    <div class="app-tile" onclick="navigate('${app.page}')">
      <div class="app-tile-icon" style="background:${app.bg}">${app.icon}</div>
      <div class="app-tile-name">${app.name}</div>
      <div class="app-tile-sub">${app.sub}</div>
    </div>
  `).join('');
}

function buildHomeRecents() {
  const list = document.getElementById('home-recents');
  const recents = [
    { icon:'📷', bg:'#ff9f0a', name:'IMG_0001.jpg',        meta:'Fotoğraflar • Bugün, 14:32', size:'3.2 MB', page:'photos' },
    { icon:'📝', bg:'#ffcc00', name:'Proje Fikirleri',      meta:'Notlar • Bugün, 14:00',       size:'',       page:'notes'  },
    { icon:'📄', bg:'#ff3b30', name:'CV_2026.pdf',          meta:'iCloud Drive • Dün',          size:'1.2 MB', page:'drive'  },
    { icon:'✉️', bg:'#0071e3', name:'Proje Toplantısı',     meta:'Mail • Ahmet Yılmaz',         size:'',       page:'mail'   },
    { icon:'📊', bg:'#34c759', name:'Bütçe_2026.xlsx',      meta:'iCloud Drive • 15 Haz',       size:'2.3 MB', page:'drive'  },
  ];
  list.innerHTML = recents.map(r => `
    <div class="recent-item" onclick="navigate('${r.page}')">
      <div class="recent-icon" style="background:${r.bg}20;color:${r.bg};font-size:22px">${r.icon}</div>
      <div class="recent-info">
        <div class="recent-name">${r.name}</div>
        <div class="recent-meta">${r.meta}</div>
      </div>
      <div class="recent-size">${r.size}</div>
    </div>
  `).join('');
}

// ===== PHOTOS =====
function buildPhotos() {
  const c = document.getElementById('photos-container');
  const todayPhotos = PHOTOS.filter(p => p.date.startsWith('Bugün'));
  const dunPhotos   = PHOTOS.filter(p => p.date.startsWith('Dün'));
  const older       = PHOTOS.filter(p => !p.date.startsWith('Bugün') && !p.date.startsWith('Dün'));

  c.innerHTML = renderPhotoSection('Bugün', todayPhotos) +
                renderPhotoSection('Dün',   dunPhotos)   +
                renderPhotoSection('21 Haziran', older);
}

function renderPhotoSection(label, photos) {
  if (!photos.length) return '';
  return `<div class="photo-month">${label}</div>
    <div class="photo-grid">
      ${photos.map((p, i) => `
        <div class="photo-cell" data-id="${p.id}" onclick="openLightbox(${p.id})">
          <img src="${p.src}" alt="${p.name}" loading="lazy" />
          <div class="photo-overlay">
            <div class="photo-check">✓</div>
          </div>
        </div>`).join('')}
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
  renderDriveList(DRIVE_FILES);
}

function renderDriveList(files) {
  const c = document.getElementById('drive-container');
  if (driveView === 'list') {
    c.innerHTML = `
      <div class="drive-file-list">
        <div class="drive-file-header">
          <span>Ad</span><span>Değiştirme Tarihi</span><span>Boyut</span><span>Tür</span>
        </div>
        ${files.map(f => `
          <div class="drive-file-row" onclick="driveClick(${f.id})">
            <div class="drive-file-name-cell">
              <span class="drive-file-icon-sm">${FILE_ICONS[f.type] || FILE_ICONS.default}</span>
              <span class="drive-file-name-text">${f.name}</span>
            </div>
            <span class="drive-file-meta">${f.modified}</span>
            <span class="drive-file-meta">${f.size}</span>
            <span class="drive-file-meta">${f.type === 'folder' ? `${f.items} öğe` : f.type.toUpperCase()}</span>
          </div>
        `).join('')}
      </div>`;
  } else {
    c.innerHTML = `
      <div class="app-grid">
        ${files.map(f => `
          <div class="app-tile" onclick="driveClick(${f.id})">
            <div class="app-tile-icon" style="background:rgba(0,113,227,0.1);font-size:32px">${FILE_ICONS[f.type] || FILE_ICONS.default}</div>
            <div class="app-tile-name" style="font-size:0.82rem">${f.name}</div>
            <div class="app-tile-sub">${f.size !== '—' ? f.size : f.items + ' öğe'}</div>
          </div>
        `).join('')}
      </div>`;
  }
}

function setDriveView(v) {
  driveView = v;
  document.getElementById('list-btn').classList.toggle('active', v === 'list');
  document.getElementById('grid-btn').classList.toggle('active', v === 'grid');
  renderDriveList(DRIVE_FILES);
}

function driveClick(id) {
  const file = DRIVE_FILES.find(f => f.id === id);
  if (!file) return;
  if (file.type === 'folder') {
    showToast(`"${file.name}" klasörü açılıyor…`, 'info');
    updateDrivePath(file.name);
  } else {
    showToast(`"${file.name}" indiriliyor…`, 'success');
  }
}

function updateDrivePath(folder) {
  const path = document.getElementById('drive-path');
  path.innerHTML = `
    <span class="drive-path-item" onclick="navigateDrive(null)">iCloud Drive</span>
    <span class="drive-path-sep">›</span>
    <span class="drive-path-current">${folder}</span>`;
}

function navigateDrive(folder) {
  const path = document.getElementById('drive-path');
  path.innerHTML = `<span class="drive-path-item" onclick="navigateDrive(null)">iCloud Drive</span>`;
  renderDriveList(DRIVE_FILES);
}

function createFolder() {
  const name = prompt('Klasör adı:');
  if (name) showToast(`"${name}" klasörü oluşturuldu.`, 'success');
}

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
      <div id="mail-items" style="overflow-y:auto;max-height:calc(100vh - 220px)">
        <div style="padding:32px;text-align:center;color:var(--apple-gray)">
          <div class="btn-spinner" style="margin:0 auto 12px;display:block"></div>
          Mailler yükleniyor…
        </div>
      </div>
      <div id="mail-pagination" style="padding:12px 16px;border-top:1px solid rgba(0,0,0,0.07);display:flex;gap:8px;justify-content:center"></div>
    </div>
    <div class="mail-detail" id="mail-detail">
      <div class="mail-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <span>Bir mail seçin</span>
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

    if (!data.messages.length) {
      items.innerHTML = '<div style="padding:32px;text-align:center;color:var(--apple-gray)">Bu klasörde mail yok.</div>';
      return;
    }

    items.innerHTML = data.messages.map(m => `
      <div class="mail-item ${m.seen ? '' : 'unread'}" id="mail-item-${m.uid}" onclick="openMail(${m.uid})">
        <div class="mail-item-header">
          <span class="mail-sender">${m.seen ? '' : '<span class="unread-dot"></span>'}${escHtml(m.fromName || m.from)}</span>
          <span class="mail-time">${formatMailDate(m.date)}</span>
        </div>
        <div class="mail-subject">${escHtml(m.subject)}</div>
      </div>`).join('');

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
  detail.innerHTML = '<div style="padding:40px;text-align:center;color:var(--apple-gray)"><div class="btn-spinner" style="margin:0 auto;display:block"></div></div>';

  try {
    const res  = await fetch(`/api/mail/message/${uid}?folder=${encodeURIComponent(mailFolder)}`);
    const m    = await res.json();
    if (!res.ok) throw new Error(m.error || 'Yüklenemedi');

    const body = m.htmlBody
      ? `<iframe sandbox="allow-same-origin" style="width:100%;min-height:360px;border:none;margin-top:16px" srcdoc="${escAttr(m.htmlBody)}"></iframe>`
      : `<div class="mail-detail-body" style="white-space:pre-wrap">${escHtml(m.textBody || '(İçerik yok)')}</div>`;

    detail.innerHTML = `
      <div class="mail-detail-from">${escHtml(m.fromName)} &lt;${escHtml(m.from)}&gt;</div>
      <div style="font-size:0.8rem;color:var(--apple-gray);margin-bottom:4px">Kime: ${escHtml(m.to)}</div>
      <div style="font-size:0.78rem;color:var(--apple-gray);margin-bottom:16px">${formatMailDate(m.date)}</div>
      <div class="mail-detail-subject">${escHtml(m.subject)}</div>
      ${body}
      ${m.attachments?.length ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(0,0,0,0.08)">
        📎 <strong>${m.attachments.length} ek:</strong>
        ${m.attachments.map(a => `<span style="margin-left:8px;font-size:0.82rem;color:var(--apple-gray)">${escHtml(a.filename)} (${formatSize(a.size)})</span>`).join('')}
      </div>` : ''}
      <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="select-btn" onclick="replyMail(${uid})">↩ Yanıtla</button>
        <button class="select-btn" onclick="forwardMail(${uid})">↗ İlet</button>
        <button class="select-btn" onclick="toggleFlag(${uid})">⭐ Yıldızla</button>
        <button class="select-btn" style="color:#ff3b30" onclick="deleteMail(${uid})">🗑 Sil</button>
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

// ===== CALENDAR =====
function buildCalendar() {
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
        <div id="upcoming-events"></div>
      </div>
    </div>`;
  renderCalendar();
}

function renderCalendar() {
  const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
  document.getElementById('cal-title').textContent = `${MONTHS[calMonth]} ${calYear}`;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const prevDays = new Date(calYear, calMonth, 0).getDate();
  const today = new Date();

  let cells = '';
  let totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  for (let i = 0; i < totalCells; i++) {
    let day, isOther = false;
    if (i < firstDay) { day = prevDays - firstDay + i + 1; isOther = true; }
    else if (i >= firstDay + daysInMonth) { day = i - firstDay - daysInMonth + 1; isOther = true; }
    else { day = i - firstDay + 1; }

    const isToday = !isOther && day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
    const evs = CALENDAR_EVENTS.filter(e => !isOther && e.day === day && e.month === calMonth && e.year === calYear);
    cells += `
      <div class="cal-day ${isOther ? 'other-month' : ''} ${isToday ? 'today' : ''}">
        <div class="cal-day-num">${day}</div>
        ${evs.slice(0,2).map(e => `<div class="cal-event ${e.color}" title="${e.title}">${e.title}</div>`).join('')}
        ${evs.length > 2 ? `<div class="cal-event blue">+${evs.length-2} daha</div>` : ''}
      </div>`;
  }
  document.getElementById('cal-days-grid').innerHTML = cells;

  // Upcoming
  const upcoming = CALENDAR_EVENTS.filter(e => e.year === calYear && e.month === calMonth).slice(0,5);
  document.getElementById('upcoming-events').innerHTML = upcoming.length ? upcoming.map(e => `
    <div class="event-list-item">
      <div class="event-dot" style="background:${{blue:'#0071e3',red:'#ff3b30',green:'#34c759',orange:'#ff9500'}[e.color]||'#0071e3'}"></div>
      <div>
        <div class="event-list-name">${e.title}</div>
        <div class="event-list-time">${e.day} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][e.month]} — ${e.time}</div>
      </div>
    </div>`).join('') : '<p style="color:var(--apple-gray);font-size:0.85rem">Bu ay etkinlik yok.</p>';
}

function changeMonth(dir) {
  calMonth += dir;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  if (calMonth < 0)  { calMonth = 11; calYear--; }
  renderCalendar();
}

// ===== NOTES =====
function buildNotes() {
  const c = document.getElementById('notes-container');
  c.innerHTML = `
    <div class="notes-layout">
      <div class="notes-list">
        <div class="notes-list-header">
          <h3>Notlar</h3>
          <button class="select-btn" onclick="newNote()" style="padding:5px 12px;font-size:0.8rem">+ Yeni</button>
        </div>
        ${NOTES_DATA.map(n => `
          <div class="note-item" id="note-item-${n.id}" onclick="openNote(${n.id})">
            <div class="note-title-text">${n.title}</div>
            <div class="note-preview">${n.body.split('\n')[0]}</div>
            <div class="note-date">${n.date}</div>
          </div>`).join('')}
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
  openNote(NOTES_DATA[0].id);
}

function openNote(id) {
  activeNote = id;
  const n = NOTES_DATA.find(x => x.id === id);
  if (!n) return;
  document.querySelectorAll('.note-item').forEach(el => el.classList.remove('active'));
  document.getElementById(`note-item-${id}`)?.classList.add('active');
  document.getElementById('note-title-input').value = n.title;
  document.getElementById('note-body-input').value = n.body;
}

function saveNote() {
  const title = document.getElementById('note-title-input').value;
  const body  = document.getElementById('note-body-input').value;
  if (activeNote) {
    const n = NOTES_DATA.find(x => x.id === activeNote);
    if (n) { n.title = title; n.body = body; n.date = 'Az önce'; }
    const item = document.getElementById(`note-item-${activeNote}`);
    if (item) {
      item.querySelector('.note-title-text').textContent = title;
      item.querySelector('.note-preview').textContent = body.split('\n')[0];
      item.querySelector('.note-date').textContent = 'Az önce';
    }
  }
  showToast('Not kaydedildi.', 'success');
}

function deleteNote() {
  if (!activeNote) return;
  if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return;
  const idx = NOTES_DATA.findIndex(x => x.id === activeNote);
  if (idx > -1) NOTES_DATA.splice(idx, 1);
  document.getElementById(`note-item-${activeNote}`)?.remove();
  activeNote = null;
  document.getElementById('note-title-input').value = '';
  document.getElementById('note-body-input').value = '';
  showToast('Not silindi.', 'error');
}

function newNote() {
  const id = Date.now();
  NOTES_DATA.unshift({ id, title:'Yeni Not', body:'', date:'Az önce' });
  const list = document.querySelector('.notes-list');
  const header = list.querySelector('.notes-list-header');
  const div = document.createElement('div');
  div.className = 'note-item'; div.id = `note-item-${id}`;
  div.onclick = () => openNote(id);
  div.innerHTML = `<div class="note-title-text">Yeni Not</div><div class="note-preview"></div><div class="note-date">Az önce</div>`;
  header.insertAdjacentElement('afterend', div);
  openNote(id);
}

// ===== REMINDERS =====
function buildReminders() {
  renderReminders();
}

function renderReminders() {
  const c = document.getElementById('reminders-container');
  const priorityColor = { high:'#ff3b30', medium:'#ff9500', low:'#34c759' };
  c.innerHTML = `
    <div class="drive-file-list">
      ${REMINDERS.map(r => `
        <div class="drive-file-row" style="grid-template-columns:40px 1fr 120px 80px">
          <span onclick="toggleReminder(${r.id})" style="cursor:pointer;font-size:20px">${r.done ? '✅' : '⭕'}</span>
          <div>
            <div style="font-weight:600;text-decoration:${r.done ? 'line-through' : 'none'};color:${r.done ? 'var(--apple-gray)' : 'inherit'}">${r.title}</div>
            <div class="drive-file-meta">${r.list}</div>
          </div>
          <span class="drive-file-meta">${r.due}</span>
          <span style="font-size:0.78rem;font-weight:600;color:${priorityColor[r.priority]}">${r.priority.toUpperCase()}</span>
        </div>`).join('')}
    </div>`;
}

function toggleReminder(id) {
  const r = REMINDERS.find(x => x.id === id);
  if (r) { r.done = !r.done; renderReminders(); showToast(r.done ? 'Tamamlandı!' : 'Geri alındı.', r.done ? 'success' : 'info'); }
}

function addReminder() {
  const title = prompt('Anımsatıcı başlığı:');
  if (!title) return;
  const id = Date.now();
  REMINDERS.unshift({ id, title, due:'Bugün', done:false, priority:'medium', list:'Kişisel' });
  renderReminders();
  showToast('Anımsatıcı eklendi.', 'success');
}

// ===== CONTACTS =====
function buildContacts() {
  const c = document.getElementById('contacts-container');
  c.innerHTML = `
    <div class="drive-file-list">
      ${CONTACTS.map(con => `
        <div class="drive-file-row" style="grid-template-columns:50px 1fr 180px 180px">
          <div style="width:36px;height:36px;border-radius:50%;background:${con.color};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px">${con.initials}</div>
          <div style="font-weight:600">${con.name}</div>
          <span class="drive-file-meta">${con.phone}</span>
          <span class="drive-file-meta">${con.email}</span>
        </div>`).join('')}
    </div>`;
}

// ===== FIND MY =====
function buildFindMy() {
  const c = document.getElementById('find-container');
  c.innerHTML = `
    <div class="find-map">
      <div class="map-grid-h" style="top:30%"></div>
      <div class="map-grid-h" style="top:60%"></div>
      <div class="map-grid-v" style="left:25%"></div>
      <div class="map-grid-v" style="left:50%"></div>
      <div class="map-grid-v" style="left:75%"></div>
      <div class="map-pin" style="left:55%;top:45%">
        <div class="map-pin-dot" style="background:linear-gradient(135deg,#0071e3,#5ac8fa)"></div>
        <div class="map-pin-label">iPhone 15 Pro</div>
      </div>
      <div class="map-pin" style="left:52%;top:43%">
        <div class="map-pin-dot" style="background:linear-gradient(135deg,#636366,#aeaeb2)"></div>
        <div class="map-pin-label">MacBook Pro</div>
      </div>
      <div class="map-pin" style="left:30%;top:55%">
        <div class="map-pin-dot" style="background:linear-gradient(135deg,#ff9500,#ffcc00)"></div>
        <div class="map-pin-label">Apple Watch</div>
      </div>
      <div style="position:absolute;bottom:12px;right:12px;background:white;border-radius:8px;padding:8px 12px;font-size:0.8rem;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.15)">
        📍 İstanbul, Türkiye
      </div>
    </div>
    <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:14px">Cihazlarım</h3>
    <div class="devices-list">
      ${DEVICES.map(d => `
        <div class="device-card">
          <div class="device-icon">${d.icon}</div>
          <div class="device-name">${d.name}</div>
          <div class="device-location">📍 ${d.location}</div>
          ${d.battery !== '—' ? `<div class="drive-file-meta">🔋 ${d.battery}</div>` : ''}
          <span class="device-status ${d.status}">${d.status === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
          <div style="display:flex;gap:6px;margin-top:4px">
            <button class="select-btn" onclick="showToast('Ses çalındı.','success')" style="flex:1;padding:6px 0;font-size:0.75rem">🔔 Ses</button>
            <button class="select-btn" onclick="showToast('Kayıp modu açıldı.','info')" style="flex:1;padding:6px 0;font-size:0.75rem">🔒 Kayıp</button>
          </div>
        </div>`).join('')}
    </div>`;
}

// ===== STORAGE =====
function buildStorage() {
  const c = document.getElementById('storage-container');
  c.innerHTML = `
    <div class="storage-overview">
      <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:20px">iCloud Depolama</h3>
      <div class="storage-donut-row">
        <div class="storage-donut">
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e0e0e0" stroke-width="14"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#0071e3" stroke-width="14"
              stroke-dasharray="${2*Math.PI*50*0.38} ${2*Math.PI*50*0.62}" stroke-linecap="round"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#ff9500" stroke-width="14"
              stroke-dasharray="${2*Math.PI*50*0.15} ${2*Math.PI*50*0.85}"
              stroke-dashoffset="${-2*Math.PI*50*0.38}" stroke-linecap="round"/>
            <circle cx="60" cy="60" r="50" fill="none" stroke="#ff3b30" stroke-width="14"
              stroke-dasharray="${2*Math.PI*50*0.08} ${2*Math.PI*50*0.92}"
              stroke-dashoffset="${-2*Math.PI*50*0.53}" stroke-linecap="round"/>
          </svg>
          <div class="storage-donut-label">19.7<div class="storage-donut-sub">GB / 50 GB</div></div>
        </div>
        <div class="storage-legend">
          <div class="legend-item"><div class="legend-dot" style="background:#0071e3"></div><span class="legend-label">Fotoğraflar</span><span class="legend-size">12.4 GB</span></div>
          <div class="legend-item"><div class="legend-dot" style="background:#ff9500"></div><span class="legend-label">Yedeklemeler</span><span class="legend-size">4.8 GB</span></div>
          <div class="legend-item"><div class="legend-dot" style="background:#ff3b30"></div><span class="legend-label">iCloud Drive</span><span class="legend-size">2.5 GB</span></div>
          <div class="legend-item"><div class="legend-dot" style="background:#e0e0e0"></div><span class="legend-label">Boş</span><span class="legend-size">30.3 GB</span></div>
        </div>
      </div>
    </div>
    <div class="upgrade-banner">
      <div>
        <h3>Daha Fazla Depolama Alanı mı Gerekiyor?</h3>
        <p>50 GB'dan 200 GB'a yükseltin — yalnızca ₺39,99/ay</p>
      </div>
      <button class="btn" onclick="showToast('Apple One abonelik sayfasına yönlendiriliyorsunuz...','info')">Planı Yükselt</button>
    </div>`;
}

// ===== SETTINGS =====
function buildSettings() {
  const raw = sessionStorage.getItem('icloud_user');
  const user = raw ? JSON.parse(raw) : { name:'Kullanıcı', email:'kullanici@icloud.com' };
  const c = document.getElementById('settings-container');
  c.innerHTML = `
    <div style="max-width:600px;display:flex;flex-direction:column;gap:16px">
      <div class="glass-card" style="padding:24px">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">Kişisel Bilgiler</h3>
        <div class="input-group"><input type="text" value="${user.name || ''}" placeholder="Ad Soyad" id="settings-name" /></div>
        <div class="input-group"><input type="email" value="${user.email || ''}" placeholder="E-posta" id="settings-email" readonly style="opacity:0.6;cursor:not-allowed" /></div>
        <div class="input-group"><input type="tel" placeholder="+90 5XX XXX XX XX" id="settings-phone" /></div>
        <button class="btn-primary" onclick="saveSettings()">Kaydet</button>
      </div>
      <div class="glass-card" style="padding:24px">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">Güvenlik</h3>
        <div class="input-group"><input type="password" placeholder="Mevcut Şifre" /></div>
        <div class="input-group"><input type="password" placeholder="Yeni Şifre" /></div>
        <div class="input-group"><input type="password" placeholder="Yeni Şifre (Tekrar)" /></div>
        <button class="btn-secondary" onclick="showToast('Şifre değişikliği için e-posta gönderildi.','success')">Şifreyi Değiştir</button>
      </div>
      <div class="glass-card" style="padding:24px">
        <h3 style="font-size:1rem;font-weight:700;margin-bottom:16px">Bildirim Tercihleri</h3>
        ${['Yeni mail bildirimleri','Fotoğraf senkronizasyon bildirimleri','Depolama uyarıları','Güvenlik bildirimleri'].map((label, i) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(0,0,0,0.06)">
            <span style="font-size:0.9rem">${label}</span>
            <label style="position:relative;display:inline-block;width:44px;height:26px">
              <input type="checkbox" ${i < 3 ? 'checked' : ''} style="opacity:0;width:0;height:0" onchange="showToast('Tercih güncellendi.','success')" />
              <span style="position:absolute;cursor:pointer;inset:0;background:${i < 3 ? 'var(--apple-blue)' : '#ccc'};border-radius:26px;transition:background 0.2s"></span>
            </label>
          </div>`).join('')}
      </div>
      <button class="btn-secondary" style="color:#ff3b30;border-color:#ff3b30" onclick="logout()">Hesaptan Çıkış Yap</button>
    </div>`;
}

function saveSettings() {
  const name = document.getElementById('settings-name').value;
  const raw = sessionStorage.getItem('icloud_user');
  const user = raw ? JSON.parse(raw) : {};
  user.name = name;
  sessionStorage.setItem('icloud_user', JSON.stringify(user));
  loadUser();
  showToast('Ayarlar kaydedildi.', 'success');
}

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

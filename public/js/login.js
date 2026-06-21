'use strict';

let userEmail = '';

// ===== ADIM 1 → 2 =====
function goToPassword() {
  const input = document.getElementById('email-input');
  const email = input.value.trim();
  if (!email) { input.focus(); showToast('Lütfen e-posta adresinizi girin.', 'error'); return; }
  if (!isValidEmail(email)) { input.focus(); showToast('Geçerli bir e-posta girin.', 'error'); return; }
  userEmail = email;
  document.getElementById('email-display').textContent = email;
  showStep('step-password');
  setTimeout(() => document.getElementById('password-input').focus(), 80);
}

function goBack() {
  showStep('step-email');
  setTimeout(() => document.getElementById('email-input').focus(), 80);
}

function showStep(id) {
  document.querySelectorAll('.login-step').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  hideError();
}

// ===== GERÇEK GİRİŞ (API) =====
async function doLogin() {
  const password = document.getElementById('password-input').value.trim();
  if (!password) { showToast('Şifrenizi girin.', 'error'); return; }

  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span><span>iCloud\'a bağlanıyor…</span>';
  hideError();

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password })
    });
    const data = await res.json();

    if (res.ok && data.ok) {
      showToast('Giriş başarılı!', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
    } else {
      showError(data.error || 'Giriş başarısız.');
      btn.disabled = false;
      btn.innerHTML = '<span>Oturum Aç</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    }
  } catch (_) {
    showError('Sunucuya bağlanılamadı. Sunucunun çalıştığından emin olun.');
    btn.disabled = false;
    btn.innerHTML = '<span>Oturum Aç</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  }
}

function showError(msg) {
  const box = document.getElementById('login-error');
  if (!box) return;
  box.textContent = msg;
  box.classList.remove('hidden');
}
function hideError() {
  document.getElementById('login-error')?.classList.add('hidden');
}

// ===== MODAL =====
function showHelpModal() { document.getElementById('help-modal').classList.remove('hidden'); }
function closeModal(id)  { document.getElementById(id)?.classList.add('hidden'); }

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.add('hidden'); });
});

// ===== ŞİFRE GÖR/GİZLE =====
function togglePassword() {
  const input = document.getElementById('password-input');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  document.getElementById('eye-icon').innerHTML = show
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
}

// ===== KLAVYE =====
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const active = document.querySelector('.login-step:not(.hidden)');
    if (!active) return;
    if (active.id === 'step-email')    goToPassword();
    if (active.id === 'step-password') doLogin();
  }
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  }
});

// ===== UTILS =====
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function showToast(msg, type = 'info') {
  let c = document.getElementById('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.4s'; setTimeout(() => t.remove(), 400); }, 3000);
}

// Oturum zaten açıksa direkt dashboard'a git
(async () => {
  try {
    const res = await fetch('/api/me');
    if (res.ok) window.location.href = 'dashboard.html';
  } catch (_) {}
})();

'use strict';

// ===== STATE =====
let userEmail = '';

// ===== NAVIGATION =====
function goToPassword() {
  const emailInput = document.getElementById('email-input');
  const email = emailInput.value.trim();
  if (!email) { showToast('Lütfen Apple Kimliğinizi girin.', 'error'); emailInput.focus(); return; }
  if (!isValidEmail(email)) { showToast('Geçerli bir e-posta adresi girin.', 'error'); emailInput.focus(); return; }
  userEmail = email;
  document.getElementById('email-display').textContent = email;
  showStep('step-password');
  setTimeout(() => document.getElementById('password-input').focus(), 100);
}

function goBack() {
  showStep('step-email');
  setTimeout(() => document.getElementById('email-input').focus(), 100);
}

function showStep(id) {
  document.querySelectorAll('.login-step').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// ===== LOGIN =====
function doLogin() {
  const pw = document.getElementById('password-input').value;
  if (!pw) { showToast('Lütfen şifrenizi girin.', 'error'); return; }
  if (pw.length < 6) { showToast('Şifre en az 6 karakter olmalıdır.', 'error'); return; }

  const btn = document.querySelector('#step-password .btn-primary');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span><span>Giriş yapılıyor...</span>';

  // Simülasyon: 2FA adımına geç
  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = '<span>Oturum Aç</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    const maskedPhone = '+90 (5••) ••• ••' + Math.floor(Math.random() * 90 + 10);
    document.getElementById('phone-hint').textContent = maskedPhone;
    showStep('step-2fa');
    setupCodeInputs();
    showToast('Doğrulama kodu gönderildi.', 'success');
  }, 1400);
}

// ===== 2FA CODE INPUTS =====
function setupCodeInputs() {
  const digits = document.querySelectorAll('.code-digit');
  digits.forEach((input, idx) => {
    input.value = '';
    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        digits[idx - 1].focus();
      }
    });
    input.addEventListener('input', e => {
      const val = input.value.replace(/[^0-9]/g, '');
      input.value = val ? val[val.length - 1] : '';
      if (val && idx < digits.length - 1) digits[idx + 1].focus();
      if (getCode().length === 6) verify2FA();
    });
    input.addEventListener('paste', e => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
      [...pasted.slice(0, 6)].forEach((ch, i) => { if (digits[i]) digits[i].value = ch; });
      const next = Math.min(pasted.length, 5);
      digits[next].focus();
      if (getCode().length === 6) setTimeout(verify2FA, 100);
    });
  });
  setTimeout(() => digits[0].focus(), 100);
}

function getCode() {
  return [...document.querySelectorAll('.code-digit')].map(d => d.value).join('');
}

function verify2FA() {
  const code = getCode();
  if (code.length < 6) { showToast('Lütfen 6 haneli kodu girin.', 'error'); return; }
  showToast('Doğrulanıyor...', 'info');
  setTimeout(() => {
    sessionStorage.setItem('icloud_user', JSON.stringify({ email: userEmail, name: nameFromEmail(userEmail) }));
    window.location.href = 'dashboard.html';
  }, 1000);
}

function resendCode() {
  showToast('Doğrulama kodu tekrar gönderildi.', 'info');
  document.querySelectorAll('.code-digit').forEach(d => { d.value = ''; });
  document.querySelectorAll('.code-digit')[0].focus();
}

// ===== MODALS =====
function showForgotModal() { document.getElementById('forgot-modal').classList.remove('hidden'); }
function showCreateModal() { document.getElementById('create-modal').classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.add('hidden');
  });
});

// ===== PASSWORD TOGGLE =====
function togglePassword() {
  const input = document.getElementById('password-input');
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  document.getElementById('eye-icon').innerHTML = isPassword
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const activeStep = document.querySelector('.login-step:not(.hidden)');
    if (!activeStep) return;
    if (activeStep.id === 'step-email') goToPassword();
    else if (activeStep.id === 'step-password') doLogin();
  }
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  }
});

// ===== UTILS =====
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function nameFromEmail(email) {
  const local = email.split('@')[0];
  return local.split(/[._\-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}

function showToast(msg, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.4s'; setTimeout(() => toast.remove(), 400); }, 3000);
}

// Redirect if already logged in
if (sessionStorage.getItem('icloud_user')) {
  window.location.href = 'dashboard.html';
}

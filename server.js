'use strict';

const express    = require('express');
const session    = require('express-session');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'icloud-web-secret-degistir-bunu',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000  // 8 saat
  }
}));

// ===== HELPERS =====
function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Oturum açılmamış' });
  next();
}

function makeImap(email, password) {
  return new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: password },
    logger: false,
    tls: { rejectUnauthorized: true }
  });
}

function makeSmtp(email, password) {
  return nodemailer.createTransport({
    host: 'smtp.mail.me.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: email, pass: password },
    tls: { rejectUnauthorized: true }
  });
}

// ===== AUTH ROUTES =====

// POST /api/login  { email, password }
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'E-posta ve şifre gerekli' });

  const client = makeImap(email, password);
  try {
    await client.connect();
    await client.logout();
    req.session.user = { email, password };
    res.json({ ok: true, email });
  } catch (err) {
    const msg = err.authenticationFailed
      ? 'E-posta veya şifre hatalı. Apple ID şifresi değil, Uygulamaya Özel Şifre kullanmanız gerekiyor.'
      : 'Bağlantı kurulamadı: ' + err.message;
    res.status(401).json({ error: msg });
  }
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/me
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ email: req.session.user.email });
});

// ===== MAIL ROUTES =====

// GET /api/mail/folders
app.get('/api/mail/folders', requireAuth, async (req, res) => {
  const { email, password } = req.session.user;
  const client = makeImap(email, password);
  try {
    await client.connect();
    const list = await client.list();
    await client.logout();
    const folders = list
      .filter(f => !f.flags.has('\\Noselect'))
      .map(f => ({ path: f.path, name: f.name, delimiter: f.delimiter }));
    res.json({ folders });
  } catch (err) {
    await client.logout().catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mail/messages?folder=INBOX&page=1
app.get('/api/mail/messages', requireAuth, async (req, res) => {
  const { email, password } = req.session.user;
  const folder  = req.query.folder || 'INBOX';
  const page    = Math.max(1, parseInt(req.query.page) || 1);
  const perPage = 30;

  const client = makeImap(email, password);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);

    const total   = client.mailbox.exists;
    const unseen  = client.mailbox.unseen || 0;
    const toSeq   = Math.max(0, total - (page - 1) * perPage);
    const fromSeq = Math.max(1, toSeq - perPage + 1);

    const messages = [];
    if (total > 0 && toSeq >= fromSeq) {
      for await (const msg of client.fetch(`${fromSeq}:${toSeq}`, {
        uid: true, flags: true, envelope: true, size: true
      })) {
        messages.push({
          uid:      msg.uid,
          seq:      msg.seq,
          subject:  msg.envelope.subject || '(Konu yok)',
          from:     msg.envelope.from?.[0]?.address   || '',
          fromName: msg.envelope.from?.[0]?.name      || msg.envelope.from?.[0]?.address || '(Bilinmiyor)',
          to:       msg.envelope.to?.map(t => t.address).join(', ') || '',
          date:     msg.envelope.date,
          seen:     msg.flags.has('\\Seen'),
          flagged:  msg.flags.has('\\Flagged'),
          size:     msg.size
        });
      }
      messages.reverse(); // en yeni üstte
    }

    lock.release();
    await client.logout();

    res.json({ messages, total, page, perPage, unseen });
  } catch (err) {
    await client.logout().catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mail/message/:uid?folder=INBOX
app.get('/api/mail/message/:uid', requireAuth, async (req, res) => {
  const { email, password } = req.session.user;
  const uid    = parseInt(req.params.uid);
  const folder = req.query.folder || 'INBOX';

  const client = makeImap(email, password);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);

    // Okundu olarak işaretle
    await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });

    // Ham kaynağı çek ve mailparser ile ayrıştır
    const raw = await client.fetchOne({ uid }, { source: true }, { uid: true });
    const parsed = await simpleParser(raw.source);

    lock.release();
    await client.logout();

    res.json({
      uid,
      subject:  parsed.subject || '(Konu yok)',
      from:     parsed.from?.value?.[0]?.address || '',
      fromName: parsed.from?.value?.[0]?.name    || parsed.from?.value?.[0]?.address || '',
      to:       parsed.to?.text || '',
      cc:       parsed.cc?.text || '',
      date:     parsed.date,
      htmlBody: parsed.html  || null,
      textBody: parsed.text  || null,
      attachments: (parsed.attachments || []).map(a => ({
        filename:    a.filename,
        contentType: a.contentType,
        size:        a.size
      }))
    });
  } catch (err) {
    await client.logout().catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/mail/message/:uid/flag  { folder, flag, value }
app.patch('/api/mail/message/:uid/flag', requireAuth, async (req, res) => {
  const { email, password } = req.session.user;
  const uid    = parseInt(req.params.uid);
  const folder = req.body.folder || 'INBOX';
  const flag   = req.body.flag;    // e.g. '\\Flagged'
  const value  = req.body.value;   // true = add, false = remove

  const client = makeImap(email, password);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    if (value) await client.messageFlagsAdd({ uid }, [flag], { uid: true });
    else       await client.messageFlagsRemove({ uid }, [flag], { uid: true });
    lock.release();
    await client.logout();
    res.json({ ok: true });
  } catch (err) {
    await client.logout().catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/mail/message/:uid?folder=INBOX
app.delete('/api/mail/message/:uid', requireAuth, async (req, res) => {
  const { email, password } = req.session.user;
  const uid    = parseInt(req.params.uid);
  const folder = req.query.folder || 'INBOX';

  const client = makeImap(email, password);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);

    // Trash klasörünü bul (iCloud'da genellikle "Deleted Messages")
    const folders = await client.list();
    const trash   = folders.find(f =>
      f.flags.has('\\Trash') || /trash|deleted|çöp/i.test(f.name)
    );

    if (trash) {
      await client.messageMove({ uid }, trash.path, { uid: true });
    } else {
      await client.messageFlagsAdd({ uid }, ['\\Deleted'], { uid: true });
      await client.messageExpunge({ uid }, { uid: true });
    }

    lock.release();
    await client.logout();
    res.json({ ok: true });
  } catch (err) {
    await client.logout().catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mail/send  { to, subject, body, replyToUid?, folder? }
app.post('/api/mail/send', requireAuth, async (req, res) => {
  const { email, password } = req.session.user;
  const { to, cc, subject, body, replyToMsgId } = req.body || {};

  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Alıcı, konu ve mesaj zorunlu' });
  }

  const transporter = makeSmtp(email, password);
  try {
    await transporter.sendMail({
      from:    email,
      to,
      cc:      cc || undefined,
      subject,
      text:    body,
      html:    body.replace(/\n/g, '<br>'),
      ...(replyToMsgId ? { inReplyTo: replyToMsgId, references: replyToMsgId } : {})
    });

    // Gönderileni Sent klasörüne kaydet
    const imap = makeImap(email, password);
    try {
      await imap.connect();
      const folders = await imap.list();
      const sent = folders.find(f =>
        f.flags.has('\\Sent') || /sent|gönderilen/i.test(f.name)
      );
      if (sent) {
        const raw = `From: ${email}\r\nTo: ${to}\r\nSubject: ${subject}\r\nDate: ${new Date().toUTCString()}\r\n\r\n${body}`;
        await imap.append(sent.path, raw, ['\\Seen']);
      }
      await imap.logout();
    } catch (_) { /* sessiz hata - gönderme başarılıysa önemli değil */ }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Mail gönderilemedi: ' + err.message });
  }
});

// ===== SPA FALLBACK =====
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== START =====
app.listen(PORT, () => {
  console.log(`✅  iCloud Mail sunucusu http://localhost:${PORT} adresinde çalışıyor`);
});

'use strict';

const express      = require('express');
const cookieSession = require('cookie-session');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const nodemailer   = require('nodemailer');
const path         = require('path');
const { createDAVClient } = require('tsdav');

const app  = express();
const PORT = process.env.PORT || 3000;

// ===== MIDDLEWARE =====
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-store')
}));
app.use(cookieSession({
  name: 'icloud_sess',
  keys: [process.env.SESSION_SECRET || 'icloud-web-secret-degistir-bunu'],
  maxAge: 8 * 60 * 60 * 1000,  // 8 saat
  secure: false,
  httpOnly: true,
  sameSite: 'lax'
}));

// ===== HELPERS =====
function requireAuth(req, res, next) {
  console.log('[AUTH] %s %s | cookie var mı: %s | session.user: %s',
    req.method, req.path,
    req.headers.cookie ? 'EVET' : 'HAYIR',
    req.session && req.session.user ? req.session.user.email : 'YOK');
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Oturum açılmamış' });
  }
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
    console.log('[LOGIN] Başarılı, session ayarlandı: %s — Set-Cookie gönderiliyor', email);
    res.json({ ok: true, email });
  } catch (err) {
    console.log('[LOGIN] Başarısız: %s', err.message);
    const msg = err.authenticationFailed
      ? 'E-posta veya şifre hatalı. Apple ID şifresi değil, Uygulamaya Özel Şifre kullanmanız gerekiyor.'
      : 'Bağlantı kurulamadı: ' + err.message;
    res.status(401).json({ error: msg });
  }
});

// POST /api/logout
app.post('/api/logout', (req, res) => {
  req.session = null;  // cookie-session: oturumu temizle
  res.json({ ok: true });
});

// GET /api/me
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ email: req.session.user.email });
});

// ===== MAIL BODY CACHE =====
const _mailCache = new Map();
const MAIL_CACHE_TTL = 10 * 60 * 1000;
function getCached(key) {
  const e = _mailCache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > MAIL_CACHE_TTL) { _mailCache.delete(key); return null; }
  return e.data;
}
function setCache(key, data) {
  _mailCache.set(key, { data, ts: Date.now() });
  if (_mailCache.size > 200) {
    const cut = Date.now() - MAIL_CACHE_TTL;
    for (const [k, v] of _mailCache) { if (v.ts < cut) _mailCache.delete(k); }
  }
}

// ===== MAIL ROUTES =====

// GET /api/mail/status — hafif kontrol (bildirim polling için)
app.get('/api/mail/status', requireAuth, async (req, res) => {
  const { email, password } = req.session.user;
  const client = makeImap(email, password);
  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    const total  = client.mailbox.exists;
    const unseen = client.mailbox.unseen || 0;
    lock.release();
    await client.logout();
    res.json({ total, unseen });
  } catch (err) {
    await client.logout().catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

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

  const cacheKey = `${email}:${folder}:${uid}`;
  const cached = getCached(cacheKey);
  if (cached) return res.json(cached);

  const client = makeImap(email, password);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);

    await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
    const raw = await client.fetchOne(String(uid), { source: true }, { uid: true });
    const parsed = await simpleParser(raw.source);

    lock.release();
    await client.logout();

    const result = {
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
    };
    setCache(cacheKey, result);
    res.json(result);
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
    if (value) await client.messageFlagsAdd(String(uid), [flag], { uid: true });
    else       await client.messageFlagsRemove(String(uid), [flag], { uid: true });
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
      await client.messageMove(String(uid), trash.path, { uid: true });
    } else {
      await client.messageFlagsAdd(String(uid), ['\\Deleted'], { uid: true });
      await client.messageExpunge(String(uid), { uid: true });
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

// GET /api/mail/search?q=...&folder=INBOX
app.get('/api/mail/search', requireAuth, async (req, res) => {
  const { email, password } = req.session.user;
  const q      = (req.query.q || '').trim();
  const folder = req.query.folder || 'INBOX';
  if (!q) return res.json({ messages: [] });

  const client = makeImap(email, password);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);

    const criteria = { or: [{ subject: q }, { from: q }, { text: q }] };
    const uids = await client.search(criteria, { uid: true });

    const messages = [];
    if (uids.length) {
      const limited = uids.slice(-40);
      for await (const msg of client.fetch(limited, {
        uid: true, flags: true, envelope: true
      }, { uid: true })) {
        messages.push({
          uid:      msg.uid,
          subject:  msg.envelope.subject || '(Konu yok)',
          from:     msg.envelope.from?.[0]?.address   || '',
          fromName: msg.envelope.from?.[0]?.name      || msg.envelope.from?.[0]?.address || '(Bilinmiyor)',
          date:     msg.envelope.date,
          seen:     msg.flags.has('\\Seen'),
          flagged:  msg.flags.has('\\Flagged')
        });
      }
      messages.reverse();
    }

    lock.release();
    await client.logout();
    res.json({ messages, folder });
  } catch (err) {
    await client.logout().catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// ===== CALDAV – ANIMSATICIlar (VTODO) =====

function parseICalTodos(icsStr) {
  if (!icsStr) return [];
  const todos = [];
  const re = /BEGIN:VTODO\r?\n([\s\S]*?)\r?\nEND:VTODO/g;
  let m;
  while ((m = re.exec(icsStr)) !== null) {
    const block = m[1];
    const get = (key) => {
      const rx = new RegExp(`(?:^|\\r?\\n)${key}(?:;[^:\\n]*)?:(.+)`, 'i');
      const r = rx.exec(block);
      return r ? r[1].replace(/\\n/g, ' ').trim() : '';
    };
    const summary = get('SUMMARY');
    if (!summary) continue;
    const parseDate = (ds) => {
      if (!ds) return null;
      const s = ds.replace(/Z$/, '').replace(/T\d{6}.*$/, '');
      const pm = s.match(/^(\d{4})(\d{2})(\d{2})$/);
      return pm ? new Date(+pm[1], +pm[2] - 1, +pm[3]) : null;
    };
    const prio = get('PRIORITY');
    todos.push({
      uid:      get('UID'),
      title:    summary,
      done:     get('STATUS') === 'COMPLETED',
      due:      parseDate(get('DUE'))?.toISOString() || null,
      priority: prio === '1' ? 'high' : prio === '5' ? 'medium' : 'low',
    });
  }
  return todos;
}

// GET /api/reminders
app.get('/api/reminders', requireAuth, async (req, res) => {
  const { email, password } = req.session.user;
  try {
    const client = await createDAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: { username: email, password },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });
    const calendars = await client.fetchCalendars();
    const allTodos = [];

    for (const cal of calendars) {
      try {
        const objects = await client.fetchCalendarObjects({ calendar: cal });
        for (const obj of objects) {
          if (obj.data && obj.data.includes('BEGIN:VTODO')) {
            parseICalTodos(obj.data).forEach(t =>
              allTodos.push({ ...t, listName: cal.displayName || 'Anımsatıcılar' })
            );
          }
        }
      } catch (_) { /* hatalı takvimi atla */ }
    }

    allTodos.sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0));
    res.json({ reminders: allTodos });
  } catch (err) {
    console.error('[Reminders]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== CARDDAV – KİŞİLER =====

function parseVCard(str) {
  if (!str) return null;
  // Unfold long lines (RFC 6350)
  str = str.replace(/\r\n[ \t]/g, '').replace(/\r\n/g, '\n');

  const getOne = (key) => {
    const m = str.match(new RegExp(`(?:^|\\n)${key}(?:;[^:\\n]*)?:(.+)`, 'i'));
    return m ? m[1].trim() : '';
  };
  const getAll = (key) => {
    const rx = new RegExp(`(?:^|\\n)${key}(?:;[^:\\n]*)?:(.+)`, 'gi');
    return [...str.matchAll(rx)].map(m => m[1].trim());
  };

  const fn = getOne('FN');
  const n  = getOne('N').split(';').slice(0, 2).reverse().filter(Boolean).join(' ');
  const name = fn || n;
  if (!name) return null;

  const emails = getAll('EMAIL');
  const phones = getAll('TEL').map(p => p.replace(/[^\d\s+\-().]/g, '').trim()).filter(Boolean);
  const org    = getOne('ORG').split(';')[0];

  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
  const COLORS   = ['#0071e3','#ff3b30','#34c759','#ff9500','#5856d6','#ff2d55','#00c7be','#8e8e93'];
  const color    = COLORS[(name.charCodeAt(0) || 0) % COLORS.length];

  return { name, email: emails[0] || '', phone: phones[0] || '', org, initials, color };
}

// GET /api/contacts
app.get('/api/contacts', requireAuth, async (req, res) => {
  const { email, password } = req.session.user;
  try {
    const client = await createDAVClient({
      serverUrl: 'https://contacts.icloud.com',
      credentials: { username: email, password },
      authMethod: 'Basic',
      defaultAccountType: 'carddav',
    });
    const books = await client.fetchAddressBooks();
    if (!books.length) return res.json({ contacts: [] });

    const vcards = await client.fetchVCards({ addressBook: books[0] });
    const contacts = vcards
      .map(v => parseVCard(v.data))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    res.json({ contacts });
  } catch (err) {
    console.error('[CardDAV]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ===== CALDAV – TAKVİM =====

function parseICalEvents(icsStr) {
  if (!icsStr) return [];
  const events = [];
  const re = /BEGIN:VEVENT\r?\n([\s\S]*?)\r?\nEND:VEVENT/g;
  let m;
  while ((m = re.exec(icsStr)) !== null) {
    const block = m[1];
    const get = (key) => {
      const rx = new RegExp(`(?:^|\\r?\\n)${key}(?:;[^:\\n]*)?:(.+)`, 'i');
      const r = rx.exec(block);
      return r ? r[1].replace(/\\n/g, ' ').replace(/\\,/g, ',').trim() : '';
    };
    const summary = get('SUMMARY');
    if (!summary) continue;

    const parseDate = (ds) => {
      if (!ds) return null;
      const s = ds.replace(/Z$/, '').replace(/T\d{6}$/, '');
      const pm = s.match(/^(\d{4})(\d{2})(\d{2})$/);
      return pm ? new Date(+pm[1], +pm[2] - 1, +pm[3]) : new Date(ds);
    };

    events.push({
      uid:      get('UID'),
      title:    summary,
      start:    parseDate(get('DTSTART')),
      location: get('LOCATION'),
    });
  }
  return events;
}

// GET /api/calendar/events
app.get('/api/calendar/events', requireAuth, async (req, res) => {
  const { email, password } = req.session.user;
  try {
    const client = await createDAVClient({
      serverUrl: 'https://caldav.icloud.com',
      credentials: { username: email, password },
      authMethod: 'Basic',
      defaultAccountType: 'caldav',
    });
    const calendars = await client.fetchCalendars();
    if (!calendars.length) return res.json({ events: [] });

    const now   = new Date();
    const past  = new Date(now - 30  * 86400000);
    const future= new Date(+now + 90 * 86400000);
    const allEvents = [];

    for (const cal of calendars.slice(0, 6)) {
      try {
        const objects = await client.fetchCalendarObjects({
          calendar: cal,
          timeRange: { start: past.toISOString(), end: future.toISOString() }
        });
        for (const obj of objects) {
          parseICalEvents(obj.data).forEach(e =>
            allEvents.push({ ...e, calName: cal.displayName || 'Takvim' })
          );
        }
      } catch (_) { /* hatalı takvimi atla */ }
    }

    allEvents.sort((a, b) => (a.start || 0) - (b.start || 0));
    res.json({
      events: allEvents.map(e => ({ ...e, start: e.start ? e.start.toISOString() : null }))
    });
  } catch (err) {
    console.error('[CalDAV]', err.message);
    res.status(500).json({ error: err.message });
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

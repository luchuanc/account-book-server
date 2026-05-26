const express = require('express');
const crypto = require('crypto');

const app = express();
const port = process.env.APP_PORT || 3000;
app.use(express.json());

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const inviteCode = () => crypto.randomBytes(4).toString('hex');

const db = {
  users: [],
  tokens: new Map(),
  books: [],
  invitations: [],
};

function auth(req, res, next) {
  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
  if (!token || !db.tokens.has(token)) {
    return res.status(401).json({ code: 401, message: 'Unauthorized' });
  }
  req.userId = db.tokens.get(token);
  next();
}

function findBook(bookId) {
  return db.books.find((b) => b.id === bookId);
}

function canAccessBook(book, userId) {
  return book.members.some((m) => m.userId === userId && m.status === 'active');
}

// auth
app.post('/api/v1/auth/register', (req, res) => {
  const { phone, nickname, password } = req.body || {};
  if (!phone || !password) return res.status(400).json({ code: 400, message: 'phone and password required' });
  if (db.users.some((u) => u.phone === phone)) return res.status(409).json({ code: 409, message: 'phone already exists' });
  const user = { id: id(), phone, nickname: nickname || `user_${phone.slice(-4)}`, password, createdAt: now() };
  db.users.push(user);
  return res.status(201).json({ id: user.id, phone: user.phone, nickname: user.nickname, createdAt: user.createdAt });
});

app.post('/api/v1/auth/login', (req, res) => {
  const { phone, password } = req.body || {};
  const user = db.users.find((u) => u.phone === phone && u.password === password);
  if (!user) return res.status(401).json({ code: 401, message: 'invalid credentials' });
  const accessToken = `atk_${id()}`;
  const refreshToken = `rtk_${id()}`;
  db.tokens.set(accessToken, user.id);
  db.tokens.set(refreshToken, user.id);
  return res.json({ accessToken, refreshToken, expiresIn: 7200 });
});

app.post('/api/v1/auth/refresh', (req, res) => {
  const { refreshToken } = req.body || {};
  const userId = db.tokens.get(refreshToken);
  if (!userId) return res.status(401).json({ code: 401, message: 'invalid refresh token' });
  const accessToken = `atk_${id()}`;
  db.tokens.set(accessToken, userId);
  return res.json({ accessToken, expiresIn: 7200 });
});

app.post('/api/v1/auth/logout', auth, (req, res) => {
  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
  db.tokens.delete(token);
  res.json({ success: true });
});

app.get('/api/v1/auth/me', auth, (req, res) => {
  const user = db.users.find((u) => u.id === req.userId);
  res.json({ id: user.id, phone: user.phone, nickname: user.nickname, createdAt: user.createdAt });
});

// books
app.post('/api/v1/books', auth, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ code: 400, message: 'name required' });
  const book = {
    id: id(),
    name,
    ownerUserId: req.userId,
    createdAt: now(),
    members: [{ id: id(), userId: req.userId, role: 'owner', status: 'active' }],
    categories: [],
    transactions: [],
  };
  db.books.push(book);
  res.status(201).json(book);
});
app.get('/api/v1/books', auth, (req, res) => res.json(db.books.filter((b) => canAccessBook(b, req.userId))));
app.get('/api/v1/books/:bookId', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  res.json(b);
});
app.put('/api/v1/books/:bookId', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || b.ownerUserId !== req.userId) return res.status(404).json({ code: 404, message: 'book not found' });
  b.name = req.body?.name || b.name;
  res.json(b);
});
app.delete('/api/v1/books/:bookId', auth, (req, res) => {
  const idx = db.books.findIndex((b) => b.id === req.params.bookId && b.ownerUserId === req.userId);
  if (idx < 0) return res.status(404).json({ code: 404, message: 'book not found' });
  db.books.splice(idx, 1);
  res.json({ success: true });
});

// members
app.get('/api/v1/books/:bookId/members', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  res.json(b.members);
});
app.put('/api/v1/books/:bookId/members/:memberId', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || b.ownerUserId !== req.userId) return res.status(404).json({ code: 404, message: 'book not found' });
  const m = b.members.find((v) => v.id === req.params.memberId);
  if (!m) return res.status(404).json({ code: 404, message: 'member not found' });
  m.role = req.body?.role || m.role;
  m.status = req.body?.status || m.status;
  res.json(m);
});
app.delete('/api/v1/books/:bookId/members/:memberId', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || b.ownerUserId !== req.userId) return res.status(404).json({ code: 404, message: 'book not found' });
  b.members = b.members.filter((v) => v.id !== req.params.memberId);
  res.json({ success: true });
});

// invitations
app.post('/api/v1/books/:bookId/invitations', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  const inv = { code: inviteCode(), bookId: b.id, createdBy: req.userId, status: 'pending', createdAt: now() };
  db.invitations.push(inv);
  res.status(201).json(inv);
});
app.get('/api/v1/invitations/:inviteCode', auth, (req, res) => {
  const inv = db.invitations.find((i) => i.code === req.params.inviteCode);
  if (!inv) return res.status(404).json({ code: 404, message: 'invitation not found' });
  res.json(inv);
});
app.post('/api/v1/invitations/:inviteCode/accept', auth, (req, res) => {
  const inv = db.invitations.find((i) => i.code === req.params.inviteCode);
  if (!inv || inv.status !== 'pending') return res.status(404).json({ code: 404, message: 'invitation not available' });
  const b = findBook(inv.bookId);
  if (!b) return res.status(404).json({ code: 404, message: 'book not found' });
  if (!b.members.some((m) => m.userId === req.userId)) b.members.push({ id: id(), userId: req.userId, role: 'member', status: 'active' });
  inv.status = 'accepted';
  res.json({ success: true, bookId: b.id });
});
app.post('/api/v1/invitations/:inviteCode/reject', auth, (req, res) => {
  const inv = db.invitations.find((i) => i.code === req.params.inviteCode);
  if (!inv || inv.status !== 'pending') return res.status(404).json({ code: 404, message: 'invitation not available' });
  inv.status = 'rejected';
  res.json({ success: true });
});

// categories
app.get('/api/v1/books/:bookId/categories', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  res.json(b.categories);
});
app.post('/api/v1/books/:bookId/categories', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  const c = { id: id(), name: req.body?.name || '未命名分类', type: req.body?.type || 'expense' };
  b.categories.push(c);
  res.status(201).json(c);
});
app.put('/api/v1/books/:bookId/categories/:categoryId', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  const c = b.categories.find((x) => x.id === req.params.categoryId);
  if (!c) return res.status(404).json({ code: 404, message: 'category not found' });
  c.name = req.body?.name || c.name;
  c.type = req.body?.type || c.type;
  res.json(c);
});
app.delete('/api/v1/books/:bookId/categories/:categoryId', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  b.categories = b.categories.filter((x) => x.id !== req.params.categoryId);
  res.json({ success: true });
});

// transactions
app.get('/api/v1/books/:bookId/transactions', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  res.json(b.transactions);
});
app.post('/api/v1/books/:bookId/transactions', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  const t = {
    id: id(),
    amount: Number(req.body?.amount || 0),
    type: req.body?.type || 'expense',
    categoryId: req.body?.categoryId || null,
    note: req.body?.note || '',
    recorderUserId: req.userId,
    transactionDate: req.body?.transactionDate || now(),
  };
  b.transactions.push(t);
  res.status(201).json(t);
});
app.get('/api/v1/books/:bookId/transactions/:transactionId', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  const t = b.transactions.find((x) => x.id === req.params.transactionId);
  if (!t) return res.status(404).json({ code: 404, message: 'transaction not found' });
  res.json(t);
});
app.put('/api/v1/books/:bookId/transactions/:transactionId', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  const t = b.transactions.find((x) => x.id === req.params.transactionId);
  if (!t) return res.status(404).json({ code: 404, message: 'transaction not found' });
  t.amount = req.body?.amount !== undefined ? Number(req.body.amount) : t.amount;
  t.note = req.body?.note ?? t.note;
  t.type = req.body?.type ?? t.type;
  t.categoryId = req.body?.categoryId ?? t.categoryId;
  res.json(t);
});
app.delete('/api/v1/books/:bookId/transactions/:transactionId', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  b.transactions = b.transactions.filter((x) => x.id !== req.params.transactionId);
  res.json({ success: true });
});

// statistics
app.get('/api/v1/books/:bookId/statistics/overview', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  const income = b.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = b.transactions.filter((t) => t.type !== 'income').reduce((s, t) => s + t.amount, 0);
  res.json({ income, expense, balance: income - expense, count: b.transactions.length });
});
app.get('/api/v1/books/:bookId/statistics/trend', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  const trend = {};
  b.transactions.forEach((t) => {
    const d = String(t.transactionDate).slice(0, 10);
    trend[d] = (trend[d] || 0) + t.amount * (t.type === 'income' ? 1 : -1);
  });
  res.json(trend);
});
app.get('/api/v1/books/:bookId/statistics/category', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  const stat = {};
  b.transactions.forEach((t) => {
    const k = t.categoryId || 'uncategorized';
    stat[k] = (stat[k] || 0) + t.amount;
  });
  res.json(stat);
});
app.get('/api/v1/books/:bookId/statistics/member', auth, (req, res) => {
  const b = findBook(req.params.bookId);
  if (!b || !canAccessBook(b, req.userId)) return res.status(404).json({ code: 404, message: 'book not found' });
  const stat = {};
  b.transactions.forEach((t) => {
    stat[t.recorderUserId] = (stat[t.recorderUserId] || 0) + t.amount;
  });
  res.json(stat);
});

// system
app.get('/api/v1/system/health', (_req, res) => res.json({ status: 'ok', service: 'account-book-server', timestamp: now() }));
app.get('/api/v1/system/version', (_req, res) => res.json({ name: 'account-book-server', version: '0.1.0', timestamp: now() }));
app.get('/', (_req, res) => res.json({ message: 'account-book-server is running' }));

app.listen(port, () => {
  console.log(`API listening on :${port}`);
});

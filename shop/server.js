/**
 * 购物网站后端
 * Express 提供 REST API + 托管静态前端；数据落盘到 data/db.json（无外部数据库）。
 *
 * 接口：
 *   GET  /api/products?q=&category=&sort=    商品列表（筛选 / 搜索 / 排序）
 *   GET  /api/products/:id                    商品详情
 *   GET  /api/products/:id/related            同品类推荐（用于详情页）
 *   POST /api/orders                          下单（校验库存、扣库存、累计销量）
 *   GET  /api/orders                          订单列表（新单在前）
 */
const path = require('node:path');
const fs = require('node:fs');
const express = require('express');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

/* ------------------------------ 种子商品数据 ------------------------------ */
const SEED_PRODUCTS = [
  // 数码
  { id: 'p01', name: '雾屿 X1 智能手机', category: '数码', price: 3999, stock: 42, emoji: '📱', gradient: ['#dfe9f3', '#e3f0ff'], rating: 4.8, reviews: 2316, desc: '6.7 英寸 120Hz 护眼屏，5000mAh 长续航，旗舰影像三摄，轻薄仅 187g。' },
  { id: 'p02', name: '极简主义机械键盘 87 键', category: '数码', price: 459, stock: 60, emoji: '⌨️', gradient: ['#e8e8ee', '#d4dbea'], rating: 4.6, reviews: 894, desc: 'Gasket 结构 + 全键热插拔，三模连接，办公游戏两相宜。' },
  { id: 'p03', name: '轻薄商务笔记本 Air14', category: '数码', price: 5299, stock: 18, emoji: '💻', gradient: ['#e4ecf7', '#d8e0f0'], rating: 4.7, reviews: 1204, desc: '1.29kg 铝合金机身，2.8K 广色域屏，56Wh 长续航，可翻转触控。' },
  { id: 'p04', name: '口袋云台相机 Mini', category: '数码', price: 1899, stock: 26, emoji: '📷', gradient: ['#e9f3ea', '#dcefe0'], rating: 4.5, reviews: 462, desc: '四轴防抖，4K/60fps 拍摄，AI 智能跟随，vlog 出片神器。' },
  { id: 'p05', name: '头戴式降噪耳机 Pro', category: '数码', price: 1299, stock: 35, emoji: '🎧', gradient: ['#e7ebf5', '#dfe6f2'], rating: 4.9, reviews: 3120, desc: '45dB 自适应主动降噪，40h 超长续航，Hi-Res 小金标认证。' },
  // 影音
  { id: 'p06', name: '桌面蓝牙音箱 S2', category: '影音', price: 369, stock: 80, emoji: '🔊', gradient: ['#f3ece4', '#eadfd3'], rating: 4.4, reviews: 786, desc: '双全频单元 + 被动低音辐射器，360° 环绕声场，支持 TWS 组队。' },
  { id: 'p07', name: '便携智能投影仪 P1', category: '影音', price: 2499, stock: 12, emoji: '🎬', gradient: ['#f0e8f5', '#e5d9ee'], rating: 4.3, reviews: 341, desc: '1080P 原生分辨率，自动对焦 + 梯形校正，卧室秒变影院。' },
  { id: 'p08', name: '高清平板电脑 Pad11', category: '影音', price: 2199, stock: 30, emoji: '📺', gradient: ['#e6eef6', '#dbe7f1'], rating: 4.6, reviews: 1520, desc: '11 英寸 2.5K 全面屏，八扬声器沉浸声场，支持手写笔与磁吸键盘。' },
  // 生活
  { id: 'p09', name: '复古意式半自动咖啡机', category: '生活', price: 1299, stock: 9, emoji: '☕', gradient: ['#f0ebe2', '#e7ddd0'], rating: 4.7, reviews: 233, desc: '15Bar 意大利水泵，萃取细腻油脂，蒸汽棒打奶泡，居家咖啡角必备。' },
  { id: 'p10', name: '日式简约陶瓷咖啡杯组', category: '生活', price: 89, stock: 200, emoji: '🍵', gradient: ['#f4f0ea', '#ece4da'], rating: 4.5, reviews: 987, desc: '哑光釉面手感温润，350ml 容量，附木质杯盖与杯垫，礼盒装。' },
  { id: 'p11', name: '懒人豆袋沙发', category: '生活', price: 399, stock: 64, emoji: '🛋️', gradient: ['#eef0f6', '#e4e8f2'], rating: 4.2, reviews: 428, desc: 'EPP 微粒填充，记忆棉外套可拆洗，阅读追剧幸福感来源。' },
  { id: 'p12', name: '香薰加湿器 小夜灯', category: '生活', price: 149, stock: 88, emoji: '🌙', gradient: ['#eee9f7', '#e3dcf2'], rating: 4.6, reviews: 1654, desc: '超声波静音加湿，七彩氛围灯 + 定时关闭，卧室助眠好物。' },
  // 服饰
  { id: 'p13', name: '纯棉基础款白 T 恤', category: '服饰', price: 79, stock: 150, emoji: '👕', gradient: ['#f2f5f9', '#e8eef6'], rating: 4.3, reviews: 2012, desc: '重磅新疆棉 240g，落肩宽松版型，不易变形不起球，男女同款。' },
  { id: 'p14', name: '轻量机能防风外套', category: '服饰', price: 329, stock: 56, emoji: '🧥', gradient: ['#e8ecf3', '#dde3ee'], rating: 4.4, reviews: 512, desc: '三防面料，抗撕裂 20D，可收纳进领口口袋，城市通勤轻户外。' },
  { id: 'p15', name: '牛皮简约双肩背包', category: '服饰', price: 259, stock: 47, emoji: '🎒', gradient: ['#efe9e3', '#e5dcd3'], rating: 4.5, reviews: 763, desc: '头层牛皮拼接帆布，16 英寸电脑隔层，独立充电口设计。' },
  { id: 'p16', name: '慢跑轻便运动鞋', category: '服饰', price: 299, stock: 72, emoji: '👟', gradient: ['#e4edf0', '#d8e5ea'], rating: 4.6, reviews: 1103, desc: '全掌回弹中底，透气飞织鞋面，单只仅 218g，通勤跑步都轻松。' },
];

/* ------------------------------ 数据存取 ------------------------------ */
let db = null;
let writeChain = Promise.resolve();

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } else {
    db = { products: SEED_PRODUCTS, orders: [], orderSeq: 1001 };
    saveDbSync();
  }
}

function saveDbSync() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
}

/** 串行化写盘，避免并发订单相互覆盖 */
function persist() {
  writeChain = writeChain.then(() => {
    try {
      saveDbSync();
      return true;
    } catch (err) {
      console.error('写入数据文件失败:', err);
      return false;
    }
  });
  return writeChain;
}

loadDb();

/* ------------------------------ 业务辅助 ------------------------------ */
const CATEGORIES = [...new Set(SEED_PRODUCTS.map((p) => p.category))];

function money(n) {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function filterProducts(query) {
  let list = db.products.slice();
  const { q = '', category = '', sort = 'default' } = query;

  if (category && category !== '全部') {
    list = list.filter((p) => p.category === category);
  }
  const kw = q.trim().toLowerCase();
  if (kw) {
    list = list.filter((p) =>
      (p.name + p.category + (p.desc || '')).toLowerCase().includes(kw)
    );
  }

  switch (sort) {
    case 'price_asc':  list.sort((a, b) => a.price - b.price); break;
    case 'price_desc': list.sort((a, b) => b.price - a.price); break;
    case 'rating':     list.sort((a, b) => b.rating - a.rating); break;
    case 'sales':      list.sort((a, b) => b.sales - a.sales); break;
    default: break; // 保持种子顺序
  }
  return list;
}

/* ------------------------------ 中间件 ------------------------------ */
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 简易请求日志
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

/* ------------------------------ 路由 ------------------------------ */
// 商品列表
app.get('/api/products', (req, res) => {
  const list = filterProducts(req.query).map((p) => ({
    ...p,
    // 列表不返回完整描述，减小 payload
    desc: undefined,
  }));
  res.json({ products: list, total: list.length, categories: CATEGORIES });
});

// 商品详情
app.get('/api/products/:id', (req, res) => {
  const p = db.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: '商品不存在' });
  res.json({ product: p });
});

// 同品类推荐（最多 4 个，排除自己）
app.get('/api/products/:id/related', (req, res) => {
  const p = db.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: '商品不存在' });
  const related = db.products
    .filter((x) => x.category === p.category && x.id !== p.id)
    .slice(0, 4);
  res.json({ products: related });
});

// 下单
app.post('/api/orders', (req, res) => {
  const { items = [], customer = {} } = req.body;
  const name = String(customer.name || '').trim();
  const phone = String(customer.phone || '').trim();
  const address = String(customer.address || '').trim();

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '购物车为空，无法下单' });
  }
  if (!name || !phone || !address) {
    return res.status(400).json({ error: '请完整填写收货人、电话与地址' });
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return res.status(400).json({ error: '手机号格式不正确' });
  }

  // 组装明细并校验库存
  const lines = [];
  for (const it of items) {
    const p = db.products.find((x) => x.id === it.id);
    const qty = Math.floor(Number(it.qty));
    if (!p) return res.status(400).json({ error: `商品不存在：${it.id}` });
    if (!qty || qty <= 0) return res.status(400).json({ error: `「${p.name}」购买数量无效` });
    if (qty > p.stock) {
      return res.status(409).json({ error: `「${p.name}」库存仅剩 ${p.stock} 件，请调整数量` });
    }
    lines.push({
      productId: p.id,
      name: p.name,
      emoji: p.emoji,
      price: p.price,
      qty,
      subtotal: money(p.price * qty),
    });
  }

  const total = money(lines.reduce((s, l) => s + l.price * l.qty, 0));
  const order = {
    id: String(db.orderSeq++),
    items: lines,
    total,
    customer: { name, phone, address },
    status: '待发货',
    createdAt: new Date().toISOString(),
  };

  // 扣库存、累计销量
  for (const it of items) {
    const p = db.products.find((x) => x.id === it.id);
    p.stock -= Math.floor(Number(it.qty));
    p.sales = (p.sales || 0) + Math.floor(Number(it.qty));
  }

  db.orders.unshift(order);
  persist().then((ok) => {
    if (!ok) return res.status(500).json({ error: '数据保存失败，请稍后重试' });
    res.status(201).json({ order });
  });
});

// 订单列表（详情接口的只读版，供前端展示）
app.get('/api/orders', (_req, res) => {
  res.json({ orders: db.orders });
});

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, products: db.products.length, orders: db.orders.length });
});

/* ------------------------------ 兜底 ------------------------------ */
app.use('/api', (_req, res) => res.status(404).json({ error: '接口不存在' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: '服务器开小差了，请稍后再试' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🛍️  购物网站已启动：http://localhost:${PORT}`);
  console.log(`   健康检查：http://localhost:${PORT}/api/health`);
});

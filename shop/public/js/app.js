/* ============================================================
 * 简集 · JIANJI — 前端逻辑
 * 商品浏览 / 详情 / 购物车（localStorage）/ 结算下单 / 订单列表
 * ============================================================ */
'use strict';

const $ = (sel) => document.querySelector(sel);
const productCache = new Map(); // id -> 商品（字段来自 /api/products）

/* ------------------------- 全局状态 ------------------------- */
const state = {
  categories: [],
  filters: { q: '', category: '全部', sort: 'default' },
  cart: loadCart(),        // { [productId]: qty }
  cartQtyOk: false,        // 结算前是否已按最新库存校准过数量
  view: 'home',            // home | detail | orders
  drawerStep: 'cart',      // cart | checkout
  checkoutLocked: false,
};

/* ------------------------- 工具函数 ------------------------- */
function money(n) {
  return '¥' + Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}
function stars(r) {
  const full = Math.round(r);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}
function gcss(colors) { // 商品渐变背景 CSS
  const [a, b] = colors || ['#eef0f4', '#e3e7ef'];
  return `background:linear-gradient(150deg,${a},${b})`;
}
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.add('is-hide');
    setTimeout(() => { t.hidden = true; t.classList.remove('is-hide'); }, 320);
  }, 2200);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`);
  return data;
}

/* ------------------------- 购物车（localStorage） ------------------------- */
function loadCart() {
  try { return JSON.parse(localStorage.getItem('jianji_cart')) || {}; }
  catch { return {}; }
}
function saveCart() {
  localStorage.setItem('jianji_cart', JSON.stringify(state.cart));
}
function cartCount() {
  return Object.values(state.cart).reduce((s, n) => s + n, 0);
}
function cartTotal() {
  let total = 0;
  for (const [id, qty] of Object.entries(state.cart)) {
    const p = productCache.get(id);
    if (p) total += p.price * qty;
  }
  return total;
}
function refreshCartUI() {
  const n = cartCount();
  const badge = $('#cart-count');
  badge.hidden = n === 0;
  badge.textContent = n > 99 ? '99+' : n;

  const listEl = $('#cart-list');
  const emptyEl = $('#cart-empty');
  const hasItems = n > 0;
  emptyEl.hidden = hasItems;
  listEl.innerHTML = Object.entries(state.cart).map(([id, qty]) => {
    const p = productCache.get(id);
    if (!p) return '';
    return `
      <div class="cart-item" data-id="${id}">
        <div class="ci-thumb" style="${gcss(p.gradient)}">${p.emoji}</div>
        <div class="ci-main">
          <div class="ci-name" title="${p.name}">${p.name}</div>
          <div class="ci-meta">
            <span class="ci-price">${money(p.price)}</span>
            <span class="ci-del" data-act="del" title="移除">移除</span>
          </div>
          <div class="ci-op">
            <button data-act="minus" aria-label="减少">−</button>
            <span class="qty">${qty}</span>
            <button data-act="plus" aria-label="增加">＋</button>
          </div>
        </div>
      </div>`;
  }).join('');

  $('#cart-total').textContent = money(cartTotal());
  $('#btn-to-checkout').disabled = !hasItems;
}
function addToCart(id, qty = 1) {
  const p = productCache.get(id);
  if (!p) return;
  const cur = state.cart[id] || 0;
  if (cur + qty > p.stock) { toast(`「${p.name}」库存仅剩 ${p.stock} 件`); return; }
  state.cart[id] = cur + qty;
  saveCart();
  refreshCartUI();
}

/* ------------------------- 视图切换 ------------------------- */
const VIEWS = ['home', 'detail', 'orders'];
function switchView(name) {
  state.view = name;
  for (const v of VIEWS) $(`#view-${v}`).hidden = v !== name;
  document.querySelectorAll('.nav-btn').forEach((b) =>
    b.classList.toggle('is-active', b.dataset.view === name && name !== 'detail'));
  if (name === 'home') $('#nav-home').classList.add('is-active');
  window.scrollTo({ top: 0 });
}
function switchNavActive(name) {
  document.querySelectorAll('.nav-btn').forEach((b) =>
    b.classList.toggle('is-active', b.dataset.view === name));
}

/* ------------------------- 首页：列表 ------------------------- */
async function loadProducts() {
  const grid = $('#product-grid');
  grid.innerHTML = '<div class="skeleton"></div>'.repeat(4);
  $('#empty-state').hidden = true;
  try {
    const params = new URLSearchParams(state.filters);
    if (state.filters.q === '') params.delete('q');
    const data = await api('/api/products?' + params);
    data.products.forEach((p) => productCache.set(p.id, p));
    // 首次加载时填充分类 Tab
    if (state.categories.length === 0 && data.categories) {
      state.categories = data.categories;
      $('#category-tabs').insertAdjacentHTML(
        'beforeend',
        data.categories.map((c) => `<button class="tab" data-cat="${c}">${c}</button>`).join(''));
    }
    $('#result-count').textContent = `共 ${data.total} 件商品`;
    renderGrid(grid, data.products);
    if (data.products.length === 0) $('#empty-state').hidden = false;
    refreshCartUI();
  } catch (err) {
    grid.innerHTML = '';
    $('#result-count').textContent = '';
    toast('加载商品失败：' + err.message);
  }
}
function renderGrid(grid, list) {
  grid.innerHTML = list.map((p) => {
    const hot = (p.sales || 0) >= 800 ? '<span class="card-tag hot">热卖</span>'
      : `<span class="card-tag">${p.category}</span>`;
    const out = p.stock <= 0;
    return `
      <article class="card" data-id="${p.id}" role="button" tabindex="0" aria-label="${p.name}">
        <div class="thumb" style="${gcss(p.gradient)}">
          ${hot}
          <span class="thumb-emoji">${p.emoji}</span>
        </div>
        <div class="card-body">
          <h3 class="card-name">${p.name}</h3>
          <div class="card-meta">
            <span class="stars" title="评分 ${p.rating}">${stars(p.rating)}</span>
            <span>${p.rating}</span>
            <span>已售 ${p.sales || 0}</span>
          </div>
          <div class="card-foot">
            <span class="price"><small>¥</small>${p.price}</span>
            <button class="card-add" data-act="add" ${out ? 'disabled' : ''}>
              ${out ? '已售罄' : '加入购物车'}
            </button>
          </div>
        </div>
      </article>`;
  }).join('');
}

/* ------------------------- 详情页 ------------------------- */
async function openDetail(id) {
  switchView('detail');
  const box = $('#detail-content');
  box.innerHTML = '<div class="skeleton" style="grid-column:1/-1;height:420px"></div>';
  try {
    const [{ product: p }, { products: related }] = await Promise.all([
      api('/api/products/' + id),
      api('/api/products/' + id + '/related'),
    ]);
    productCache.set(p.id, p);
    box.innerHTML = `
      <div class="detail-thumb" style="${gcss(p.gradient)}"><span class="thumb-emoji">${p.emoji}</span></div>
      <div class="detail-info">
        <span class="card-tag">${p.category}</span>
        <h1>${p.name}</h1>
        <div class="detail-meta">
          <span>★ ${p.rating}（${p.reviews} 条评价）</span>
          <span>已售 ${p.sales || 0}</span>
        </div>
        <div class="detail-price-row">
          <span class="price"><small>¥</small>${p.price}</span>
          <span class="stock-hint">${p.stock > 20 ? '现货充足' : p.stock > 0 ? `仅剩 ${p.stock} 件` : '暂时售罄'}</span>
        </div>
        <p class="detail-desc">${p.desc}</p>
        <div class="detail-buy">
          <div class="qty-stepper">
            <button data-act="d-minus" aria-label="减少" ${p.stock <= 0 ? 'disabled' : ''}>−</button>
            <span id="detail-qty">1</span>
            <button data-act="d-plus" aria-label="增加" ${p.stock <= 0 ? 'disabled' : ''}>＋</button>
          </div>
          <button class="btn btn-primary btn-buy" data-act="d-add" ${p.stock <= 0 ? 'disabled' : ''}>加入购物车</button>
          <button class="btn btn-buy" data-act="d-buy" ${p.stock <= 0 ? 'disabled' : ''}>立即购买</button>
        </div>
      </div>`;
    const qtyEl = $('#detail-qty');
    const qtyState = { n: 1 };
    box.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (qtyState.n <= 1 && btn.dataset.act === 'd-minus') return;
        if (btn.dataset.act === 'd-minus') qtyState.n--;
        if (btn.dataset.act === 'd-plus') {
          if (qtyState.n >= p.stock) { toast('已达库存上限'); return; }
          qtyState.n++;
        }
        qtyEl.textContent = qtyState.n;
        if (btn.dataset.act === 'd-add') addToCart(p.id, qtyState.n);
        if (btn.dataset.act === 'd-buy') { addToCart(p.id, qtyState.n); openDrawer('checkout'); }
      });
    });
    renderGrid($('#related-grid'), related.map((x) => { productCache.set(x.id, x); return x; }));
  } catch (err) {
    box.innerHTML = '';
    toast('加载详情失败：' + err.message);
    switchView('home');
  }
}

/* ------------------------- 购物车抽屉 / 结算 ------------------------- */
function openDrawer(step = 'cart') {
  state.drawerStep = step;
  setStep(step);
  const scrim = $('#scrim');
  scrim.hidden = false;                      // hidden 与 is-open 同时管理
  requestAnimationFrame(() => scrim.classList.add('is-open'));
  $('#cart-drawer').classList.add('is-open');
  document.body.style.overflow = 'hidden';
  if (step === 'checkout') setTimeout(() => $('#checkout-form input').focus(), 300);
}
function closeDrawer() {
  const scrim = $('#scrim');
  scrim.classList.remove('is-open');
  setTimeout(() => { scrim.hidden = true; }, 220); // 等淡出动画结束
  $('#cart-drawer').classList.remove('is-open');
  document.body.style.overflow = '';
}
function setStep(step) {
  state.drawerStep = step;
  const cartMode = step === 'cart';
  $('#drawer-title').textContent = cartMode ? '购物车' : '确认订单';
  $('#cart-body').hidden = !cartMode;
  $('#checkout-form').hidden = cartMode;
  $('#btn-to-checkout').hidden = !cartMode;
  $('#btn-submit-order').hidden = cartMode;
}
function goCheckout() {
  if (cartCount() === 0) return;
  if (!state.cartQtyOk) { // 数量修正入口：结算时先校准库存
    state.cartQtyOk = true;
    for (const [id, qty] of Object.entries(state.cart)) {
      const p = productCache.get(id);
      if (p && qty > p.stock) {
        state.cart[id] = Math.max(1, p.stock);
        if (p.stock <= 0) delete state.cart[id];
      }
    }
    saveCart();
    refreshCartUI();
  }
  openDrawer('checkout');
}

async function submitOrder(e) {
  e.preventDefault();
  if (state.checkoutLocked) return;
  const form = $('#checkout-form');
  const errEl = $('#checkout-error');
  const customer = Object.fromEntries(new FormData(form).entries());
  const items = Object.entries(state.cart)
    .map(([id, qty]) => ({ id, qty }))
    .filter((it) => productCache.get(it.id));
  if (items.length === 0) { showFormError('购物车是空的'); return; }

  state.checkoutLocked = true;
  $('#btn-submit-order').disabled = true;
  errEl.hidden = true;
  try {
    const { order } = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items, customer }),
    });
    state.cart = {};
    state.cartQtyOk = false;
    saveCart();
    refreshCartUI();
    closeDrawer();
    $('#modal-text').innerHTML =
      `订单号 <b>#${order.id}</b><br>合计 ${money(order.total)}，感谢在简集购物！`;
    openModal();
  } catch (err) {
    showFormError(err.message);
    // 库存可能已变，重新拉一次数据校准角标
    if (/库存|售罄/.test(err.message)) { state.cartQtyOk = false; loadProducts(); }
  } finally {
    state.checkoutLocked = false;
    $('#btn-submit-order').disabled = false;
  }
}
function showFormError(msg) {
  const errEl = $('#checkout-error');
  errEl.textContent = msg;
  errEl.hidden = false;
}

/* ------------------------- 订单列表 ------------------------- */
async function loadOrders() {
  const listEl = $('#orders-list');
  const emptyEl = $('#orders-empty');
  listEl.innerHTML = '<div class="skeleton" style="height:140px"></div>';
  emptyEl.hidden = true;
  try {
    const { orders } = await api('/api/orders');
    listEl.innerHTML = orders.map((o) => `
      <article class="order-card">
        <div class="order-head">
          <span class="order-id">订单 #${o.id}</span>
          <span class="order-status">${o.status}</span>
          <span>${fmtTime(o.createdAt)}</span>
        </div>
        <div class="order-lines">
          ${o.items.map((l) => `
            <div class="order-line">
              <span class="l-emoji">${l.emoji}</span>
              <span class="l-name">${l.name}</span>
              <span class="l-sub">×${l.qty}</span>
              <span class="ci-price">${money(l.subtotal)}</span>
            </div>`).join('')}
        </div>
        <div class="order-cust">📦 ${o.customer.name} · ${o.customer.phone}<br>📍 ${o.customer.address}</div>
        <div class="order-foot">
          <span>实付款</span>
          <span class="total">${money(o.total)}</span>
        </div>
      </article>`).join('') || '';
    if (orders.length === 0) emptyEl.hidden = false;
  } catch (err) {
    listEl.innerHTML = '';
    toast('加载订单失败：' + err.message);
  }
}

/* ------------------------- 事件绑定 ------------------------- */
// 顶部导航
$('#brand-home').addEventListener('click', (e) => {
  e.preventDefault();
  if (state.view === 'detail') { switchView('home'); return; }
  history.pushState({}, '', '#/'); showHome(true);
});
$('#nav-home').addEventListener('click', () => showHome(true));
$('#nav-orders').addEventListener('click', async () => {
  switchView('orders');
  switchNavActive('orders');
  history.pushState({}, '', '#/orders');
  await loadOrders();
});

function showHome(reset) {
  if (reset) {
    state.filters.q = '';
    $('#search-input').value = '';
    const tabs = [...$('#category-tabs').children];
    tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.cat === '全部'));
    state.filters.category = '全部';
    $('#sort-select').value = 'default';
    state.filters.sort = 'default';
  }
  switchView('home');
  switchNavActive('home');
  history.pushState({}, '', '#/' + encodeURIComponent(state.filters.q || ''));
  loadProducts();
}

// 搜索
$('#search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  state.filters.q = $('#search-input').value.trim();
  state.filters.category = '全部';
  document.querySelectorAll('#category-tabs .tab').forEach((t) =>
    t.classList.toggle('is-active', t.dataset.cat === '全部'));
  if (state.view !== 'home') switchView('home');
  switchNavActive('home');
  loadProducts();
});

// 分类 Tab 与排序（事件委托）
$('#category-tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('#category-tabs .tab').forEach((t) => t.classList.remove('is-active'));
  tab.classList.add('is-active');
  state.filters.category = tab.dataset.cat;
  loadProducts();
});
$('#sort-select').addEventListener('change', (e) => {
  state.filters.sort = e.target.value;
  loadProducts();
});

// 商品网格：打开详情 / 快捷加购（事件委托）
$('#product-grid').addEventListener('click', (e) => {
  const addBtn = e.target.closest('[data-act="add"]');
  if (addBtn) { e.stopPropagation(); addToCart(addBtn.closest('.card').dataset.id); return; }
  const card = e.target.closest('.card');
  if (card) openDetail(card.dataset.id);
});
$('#related-grid').addEventListener('click', (e) => {
  const addBtn = e.target.closest('[data-act="add"]');
  if (addBtn) { e.stopPropagation(); addToCart(addBtn.closest('.card').dataset.id); return; }
  const card = e.target.closest('.card');
  if (card) { openDetail(card.dataset.id); }
});
$('#empty-reset').addEventListener('click', () => showHome(true));

// 详情返回
$('#detail-back').addEventListener('click', () => showHome(false));

// 购物车抽屉
$('#cart-btn').addEventListener('click', () => openDrawer('cart'));
$('#cart-go-shop').addEventListener('click', closeDrawer);
$('#drawer-close').addEventListener('click', closeDrawer);
$('#scrim').addEventListener('click', closeDrawer);
$('#btn-to-checkout').addEventListener('click', goCheckout);
document.querySelector('.modal-scrim').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

// 购物车列表操作（委托）
$('#cart-list').addEventListener('click', (e) => {
  const item = e.target.closest('.cart-item');
  if (!item) return;
  const id = item.dataset.id;
  const act = e.target.dataset.act;
  const p = productCache.get(id);
  if (act === 'plus') addToCart(id, 1);
  if (act === 'minus') {
    if (state.cart[id] <= 1) { delete state.cart[id]; }
    else { state.cart[id]--; }
    saveCart(); refreshCartUI();
  }
  if (act === 'del') {
    delete state.cart[id];
    state.cartQtyOk = false;
    saveCart(); refreshCartUI();
  }
  if (p) toast(act === 'plus' ? `「${p.name}」已加入购物车` : act === 'minus' ? '已减少数量' : '已从购物车移除');
});

// 结算
$('#btn-submit-order').addEventListener('click', submitOrder);

// 成功弹层
function openModal() {
  const m = $('#modal-scrim');
  m.hidden = false;
  requestAnimationFrame(() => m.classList.add('is-open'));
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  const m = $('#modal-scrim');
  m.classList.remove('is-open');
  setTimeout(() => { m.hidden = true; }, 220);
  document.body.style.overflow = '';
}
$('#modal-continue').addEventListener('click', () => {
  closeModal();
  closeDrawer();
  showHome(false);
});
$('#modal-view-orders').addEventListener('click', () => {
  closeModal();
  closeDrawer();
  $('#nav-orders').click();
});

// 订单页
$('#orders-go-shop').addEventListener('click', () => showHome(true));

// 键盘关闭
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeDrawer();
    closeModal();
  }
});

// 浏览器前进 / 后退回到首页（hash 简化处理）
window.addEventListener('popstate', () => showHome(false));

/* ------------------------- 启动 ------------------------- */
(async function init() {
  switchView('home');
  await loadProducts();
  refreshCartUI();
  toast('欢迎来到简集 👋');
})();

/* 打车系统前端逻辑：所有数据都通过 /api/ 从 Java 后端取得 */

const PLACES = [
  ["大雁塔北广场", 34.2180, 108.9640],
  ["西安北站", 34.3760, 108.9390],
  ["钟楼", 34.2610, 108.9450],
  ["小寨", 34.2240, 108.9480],
  ["曲江池", 34.2030, 108.9860],
  ["大唐不夜城", 34.2210, 108.9660],
  ["西安咸阳机场", 34.4470, 108.7510],
  ["回民街", 34.2650, 108.9330],
  ["浐灞生态区", 34.2210, 109.0300],
  ["南门", 34.2520, 108.9460]
];

let me = null;        // {role, user}
let selected = {};    // 各表格当前选中行

/* ---------------- 基础工具 ---------------- */
async function api(path, method = "GET", body = null) {
  return mockApi(path, method, body);   // 静态演示版：用 mock.js 模拟后端
}

function notify(msg) {
  const tip = document.getElementById("tip");
  tip.textContent = msg;
  tip.style.background = "#eafaf1";
  tip.style.borderColor = "#a9dfbf";
  tip.style.color = "#1e8449";
  clearTimeout(notify._t);
  notify._t = setTimeout(() => {
    tip.textContent = "操作已完成。";
    tip.style.background = "#fff8e6";
    tip.style.borderColor = "#f0d9a8";
    tip.style.color = "#8a6d3b";
  }, 6000);
}

function fail(e) {
  const tip = document.getElementById("tip");
  tip.textContent = "操作失败：" + e.message;
  tip.style.background = "#fdecec";
  tip.style.borderColor = "#f5b7b1";
  tip.style.color = "#a93226";
}

function el(id) { return document.getElementById(id); }

function fillTable(tblId, columns, rows, render) {
  const t = el(tblId);
  const thead = t.querySelector("thead");
  const tbody = t.querySelector("tbody");
  thead.innerHTML = "<tr>" + columns.map(c => `<th${c.key === "actions" ? ` class="actions"` : ""}>${c.label}</th>`).join("") + "</tr>";
  tbody.innerHTML = "";
  rows.forEach(row => {
    const tr = document.createElement("tr");
    columns.forEach(c => {
      const td = document.createElement("td");
      const v = row[c.key];
      if (c.key === "actions") {
        td.className = "actions";
        td.innerHTML = render ? render(row) : "";
      } else {
        td.innerHTML = v === null || v === undefined ? ""
          : (c.key.endsWith("_time") || c.key === "stat_date" ? fmtTime(v) : v);
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}


/* 时间显示：把 2026-11-08T13:21:42 之类截成“2026-11-08 13:21” */
function fmtTime(v) {
  if (v === null || v === undefined) return "";
  return String(v).replace("T", " ").slice(0, 16);
}

function badge(text) {
  const cls = text === "已完成" ? "done" : (text === "已取消" ? "cancel" : "");
  return `<span class="badge ${cls}">${text}</span>`;
}


/* ================= 按钮动效与悬停气泡 ================= */
const tipEl = document.createElement("div");
tipEl.id = "tooltip";
document.body.appendChild(tipEl);
let tipTimer = null;

function showTip(target) {
  const text = target.getAttribute("data-tip");
  if (!text) return;
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => {
    tipEl.textContent = text;
    tipEl.classList.remove("below");
    tipEl.classList.add("show");
    const r = target.getBoundingClientRect();
    const w = tipEl.offsetWidth;
    const h = tipEl.offsetHeight;
    let x = r.left + r.width / 2 - w / 2;
    x = Math.max(8, Math.min(x, window.innerWidth - w - 8));
    let y = r.top - h - 10;
    let below = false;
    if (y < 8) {                       // 上方放不下就显示在下方
      y = r.bottom + 10;
      below = true;
    }
    tipEl.style.left = x + "px";
    tipEl.style.top = y + "px";
    tipEl.style.setProperty("--arrow-x", (r.left + r.width / 2 - x) + "px");
    tipEl.classList.toggle("below", below);
  }, 90);
}

function hideTip() {
  clearTimeout(tipTimer);
  tipEl.classList.remove("show");
}

function ripple(btn, ev) {
  const r = btn.getBoundingClientRect();
  const d = Math.max(r.width, r.height);
  const span = document.createElement("span");
  span.className = "ripple";
  span.style.width = span.style.height = d + "px";
  const x = (ev && ev.clientX ? ev.clientX - r.left : r.width / 2) - d / 2;
  const y = (ev && ev.clientY ? ev.clientY - r.top : r.height / 2) - d / 2;
  span.style.left = x + "px";
  span.style.top = y + "px";
  btn.appendChild(span);
  setTimeout(() => span.remove(), 520);
}

document.addEventListener("mouseover", e => {
  const t = e.target.closest("[data-tip]");
  if (t) showTip(t);
});
document.addEventListener("mouseout", e => {
  if (e.target.closest("[data-tip]")) hideTip();
});
document.addEventListener("focusin", e => {
  const t = e.target.closest("[data-tip]");
  if (t) showTip(t);
});
document.addEventListener("focusout", () => hideTip());
document.addEventListener("pointerdown", e => {
  const b = e.target.closest("button");
  if (b) ripple(b, e);
});
window.addEventListener("scroll", hideTip, true);

/* ---------------- 面板切换（教程 / 工作台） ---------------- */
const PANELS = ["guide", "passenger", "driver", "admin"];

function showPanel(name) {
  PANELS.forEach(p => {
    const el = document.getElementById("panel-" + p);
    if (el) el.style.display = (p === name ? "block" : "none");
  });
  if (name === "guide") loadGuide();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function backToWork() {
  if (!me) {
    notify("请先登录，再进入工作台");
    focusLogin();
    return;
  }
  showPanel(me.role);
}

function focusLogin() {
  showPanel("guide");
  const acc = document.getElementById("account");
  if (acc) {
    acc.focus();
    acc.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function jumpTo(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadGuide() {
  try {
    const o = await api("/api/overview");
    const v = o.overview || {};
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set("kpiPassengers", v.passengers ?? "–");
    set("kpiDrivers", v.drivers ?? "–");
    set("kpiOrders", v.orders ?? "–");
    set("kpiRevenue", Number(v.revenue || 0).toFixed(0));
    set("kpiOnline", v.online_drivers ?? "–");
    set("kpiDone", v.done_orders ?? "–");
  } catch (e) { /* 概览失败不影响教程页 */ }
  try {
    const r = await api("/api/rules");
    const tbody = document.querySelector("#fareTable tbody");
    if (tbody) {
      tbody.innerHTML = (r.rules || []).map(x => `<tr>
        <td>${x.rule_name}</td><td>${x.base_fare}</td><td>${x.included_km}</td>
        <td>${x.price_per_km}</td><td>${x.price_per_min}</td><td>${x.min_fare}</td></tr>`).join("");
    }
  } catch (e) { /* 忽略 */ }
}

/* ---------------- 登录 ---------------- */
async function login() {
  try {
    const data = await api("/api/login", "POST", {
      role: el("role").value, account: el("account").value.trim(), pwd: el("pwd").value
    });
    me = { role: data.role, user: data.user };
    el("loginbar").style.display = "none";
    el("who").style.display = "flex";
    el("whoText").textContent = (me.role === "admin" ? "管理员" : me.user.name) +
      (me.role === "passenger" ? "（乘客）" : me.role === "driver" ? "（司机）" : "");
    showPanel(me.role);
    if (me.role === "passenger") {
      initPlaces();
      loadPassengerOrders();
    } else if (me.role === "driver") {
      loadDriver();
    } else {
      loadAdminOrders();
      loadStats();
    }
    notify("登录成功");
  } catch (e) { fail(e); }
}

function logout() {
  me = null;
  el("loginbar").style.display = "flex";
  el("who").style.display = "none";
  showPanel("guide");
}

/* ---------------- 乘客端 ---------------- */
function initPlaces() {
  ["origin", "dest"].forEach((id, i) => {
    const sel = el(id);
    if (sel.options.length) return;
    PLACES.forEach(p => sel.add(new Option(p[0], p[0])));
    sel.selectedIndex = i;
  });
  el("pBalance").textContent = "账户余额：" + Number(me.user.balance).toFixed(2) + " 元";
}

async function loadPassengerOrders() {
  try {
    const d = await api(`/api/passenger/${me.user.passenger_id}/orders`);
    fillTable("pOrders", [
      { key: "order_no", label: "业务单号" },
      { key: "status_name", label: "状态" },
      { key: "driver_name", label: "司机" },
      { key: "plate_no", label: "车牌" },
      { key: "origin_addr", label: "上车地点" },
      { key: "dest_addr", label: "目的地" },
      { key: "total_fare", label: "金额(元)" },
      { key: "create_time", label: "下单时间" },
      { key: "actions", label: "操作", cls: "actions" }
    ], d.orders, row => {
      let html = "";
      if (["待派单", "已接单", "已到达"].includes(row.status_name)) {
        html += `<button data-tip="取消这笔还未开始的订单，取消后不可恢复" onclick="cancelOrder(${row.order_id})">取消</button>`;
      }
      if (row.status_name === "已完成") {
        html += `<button data-tip="给本次行程的司机打分（1~5 分）" onclick="evaluate(${row.order_id})">评价</button>`;
      }
      return html;
    });
  } catch (e) { fail(e); }
}

async function createOrder() {
  try {
    const o = PLACES.find(p => p[0] === el("origin").value);
    const d = PLACES.find(p => p[0] === el("dest").value);
    if (o[0] === d[0]) throw new Error("起点和终点不能相同");
    const r = await api(`/api/passenger/${me.user.passenger_id}/orders`, "POST", {
      origin: o[0], dest: d[0], olat: o[1], olng: o[2], dlat: d[1], dlng: d[2]
    });
    notify("下单成功，订单号 " + r.orderId + "，等待司机接单");
    loadPassengerOrders();
  } catch (e) { fail(e); }
}

async function cancelOrder(oid) {
  if (!confirm("确定取消订单 " + oid + " 吗？")) return;
  try {
    await api(`/api/order/${oid}/cancel`, "POST", { reason: "乘客主动取消" });
    notify("订单已取消");
    loadPassengerOrders();
  } catch (e) { fail(e); }
}

async function evaluate(oid) {
  const score = Number(prompt("请给司机打分（1-5）：", "5"));
  if (!score) return;
  try {
    await api(`/api/order/${oid}/evaluate`, "POST", { score });
    notify("评价已提交");
    loadPassengerOrders();
  } catch (e) { fail(e); }
}

/* ---------------- 司机端 ---------------- */
async function loadDriver() {
  try {
    const id = me.user.driver_id;
    const d = await api(`/api/driver/${id}/info`);
    const info = d.info;
    el("dInfo").textContent = `${info.name}（${info.phone}） · ` +
      (info.online ? "在线接单中" : "已收车") +
      ` · 评分 ${Number(info.rating).toFixed(2)} · 累计 ${info.total_orders} 单 / ` +
      `${Number(info.total_income).toFixed(2)} 元 · 车辆 ${info.plate_no || "无"}`;
    const w = await api("/api/orders/wait");
    fillTable("waitOrders", [
      { key: "order_id", label: "订单号" },
      { key: "origin_addr", label: "上车地点" },
      { key: "dest_addr", label: "目的地" },
      { key: "create_time", label: "下单时间" },
      { key: "actions", label: "操作", cls: "actions" }
    ], w.orders, row => `<button data-tip="接单后请前往乘客上车点，接单期间不能再接其他订单" onclick="accept(${row.order_id})">接单</button>
        <button data-tip="按司机当前位置到上车点的距离，列出候选司机" onclick="candidates(${row.order_id})">派单候选</button>`);
    const mine = await api(`/api/driver/${id}/orders`);
    fillTable("dOrders", [
      { key: "order_id", label: "订单号" },
      { key: "status_name", label: "状态" },
      { key: "origin_addr", label: "上车地点" },
      { key: "dest_addr", label: "目的地" },
      { key: "accept_time", label: "接单时间" },
      { key: "total_fare", label: "金额(元)" },
      { key: "actions", label: "操作", cls: "actions" }
    ], mine.orders, row => {
      if (row.status_name === "已接单") return `<button data-tip="到达上车点后点这里通知乘客" onclick="next('${row.order_id}','arrive')">已到达</button>`;
      if (row.status_name === "已到达") return `<button data-tip="乘客上车后开始计时计程，进入行程中状态" onclick="next('${row.order_id}','start')">开始行程</button>`;
      if (row.status_name === "行程中") return `<button data-tip="到达目的地后按里程与时长自动结算车费" onclick="finish(${row.order_id})">完成计费</button>`;
      return "";
    });
    fillTable("income", [
      { key: "stat_date", label: "日期" },
      { key: "orders", label: "完成单数" },
      { key: "income", label: "收入(元)" }
    ], d.income);
  } catch (e) { fail(e); }
}

async function setOnline(flag) {
  try {
    await api(`/api/driver/${me.user.driver_id}/online`, "POST", { online: flag });
    notify(flag ? "已上线接单" : "已收车下线");
    loadDriver();
  } catch (e) { fail(e); }
}

async function accept(oid) {
  try {
    await api(`/api/order/${oid}/accept`, "POST", { driverId: me.user.driver_id });
    notify("接单成功，请前往上车点");
    loadDriver();
  } catch (e) { fail(e); }
}

async function next(oid, action) {
  try {
    await api(`/api/order/${oid}/${action}`, "POST", {});
    notify(action === "arrive" ? "已到达上车点" : "行程开始");
    loadDriver();
  } catch (e) { fail(e); }
}

async function finish(oid) {
  try {
    const distance = Number(el("km").value);
    const minutes = Number(el("minutes").value);
    const r = await api(`/api/order/${oid}/finish`, "POST", { distance, minutes });
    notify(`行程结束，车费 ${r.fare.toFixed(2)} 元（起步价 + 里程费 + 时长费）`);
    loadDriver();
  } catch (e) { fail(e); }
}

async function candidates(oid) {
  try {
    const d = await api(`/api/order/${oid}/candidates`);
    if (!d.candidates.length) return notify("暂无在线司机");
    notify(d.candidates.map(c =>
      `${c.driver_name} ${c.plate_no} ${Number(c.distance_km).toFixed(2)} km`).join("；"));
  } catch (e) { fail(e); }
}

/* ---------------- 管理端 ---------------- */
function adminTab(name, btn) {
  document.querySelectorAll(".tabs .tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  ["orders", "stats", "drivers", "vehicles", "rules"].forEach(n => {
    el("admin-" + n).style.display = (n === name ? "block" : "none");
  });
  if (name === "orders") loadAdminOrders();
  if (name === "stats") loadStats();
  if (name === "drivers") loadDrivers();
  if (name === "vehicles") loadVehicles();
  if (name === "rules") loadRules();
}

async function loadAdminOrders() {
  try {
    const s = el("statusFilter").value;
    const d = await api("/api/admin/orders?status=" + encodeURIComponent(s));
    fillTable("adminOrders", [
      { key: "order_id", label: "订单号" },
      { key: "passenger_name", label: "乘客" },
      { key: "driver_name", label: "司机" },
      { key: "plate_no", label: "车牌" },
      { key: "status_name", label: "状态" },
      { key: "origin_addr", label: "上车地点" },
      { key: "dest_addr", label: "目的地" },
      { key: "total_fare", label: "营收(元)" },
      { key: "create_time", label: "下单时间" },
      { key: "actions", label: "操作", cls: "actions" }
    ], d.orders, row => {
      if (["待派单", "已接单", "已到达"].includes(row.status_name)) {
        return `<button data-tip="平台干预取消（仅待派单/已接单/已到达可取消）" onclick="adminCancel(${row.order_id})">平台取消</button>`;
      }
      return "";
    });
  } catch (e) { fail(e); }
}

async function adminCancel(oid) {
  if (!confirm("确定由平台取消订单 " + oid + " 吗？")) return;
  try {
    await api(`/api/order/${oid}/cancel`, "POST", { reason: "平台干预取消" });
    notify("订单已取消");
    loadAdminOrders();
  } catch (e) { fail(e); }
}

async function loadStats() {
  try {
    const d = await api("/api/admin/stats");
    fillTable("daily", [
      { key: "stat_date", label: "日期" },
      { key: "order_count", label: "订单数" },
      { key: "done_count", label: "完成数" },
      { key: "cancel_count", label: "取消数" },
      { key: "revenue", label: "营业额" },
      { key: "avg_fare", label: "平均客单价" },
      { key: "avg_distance", label: "平均里程" }
    ], d.daily);
    fillTable("rank", [
      { key: "driver_id", label: "司机ID" },
      { key: "name", label: "姓名" },
      { key: "rating", label: "评分" },
      { key: "finished_orders", label: "完成单数" },
      { key: "total_fare", label: "营收(元)" },
      { key: "online", label: "在线" }
    ], d.rank);
  } catch (e) { fail(e); }
}

async function loadDrivers() {
  try {
    const d = await api("/api/admin/drivers");
    fillTable("drivers", [
      { key: "driver_id", label: "司机ID" },
      { key: "name", label: "姓名" },
      { key: "phone", label: "手机号" },
      { key: "online", label: "在线" },
      { key: "status", label: "状态" },
      { key: "rating", label: "评分" },
      { key: "total_orders", label: "累计单数" },
      { key: "total_income", label: "累计收入" },
      { key: "actions", label: "操作", cls: "actions" }
    ], d.drivers, row =>
      `<button data-tip="停用后该司机不能再登录接单" onclick="toggleDriver(${row.driver_id},${row.status})">${row.status === 1 ? "停用" : "启用"}</button>`);
  } catch (e) { fail(e); }
}

async function toggleDriver(id, status) {
  try {
    await api(`/api/admin/drivers/${id}/toggle`, "POST", { status: status === 1 ? 0 : 1 });
    notify("司机状态已更新");
    loadDrivers();
  } catch (e) { fail(e); }
}

async function addDriver() {
  try {
    await api("/api/admin/drivers", "POST", {
      name: el("ndName").value, phone: el("ndPhone").value, license: el("ndLicense").value
    });
    notify("司机已新增");
    loadDrivers();
  } catch (e) { fail(e); }
}

async function loadVehicles() {
  try {
    const d = await api("/api/admin/vehicles");
    fillTable("vehicles", [
      { key: "vehicle_id", label: "车辆ID" },
      { key: "plate_no", label: "车牌" },
      { key: "model", label: "车型" },
      { key: "vehicle_type", label: "类型" },
      { key: "seats", label: "座位" },
      { key: "owner_driver_id", label: "所属司机" },
      { key: "status", label: "运营状态" },
      { key: "actions", label: "操作", cls: "actions" }
    ], d.vehicles, row =>
      `<button data-tip="车辆停运后该司机不能接单" onclick="toggleVehicle(${row.vehicle_id},${row.status})">${row.status === 1 ? "停运" : "恢复"}</button>`);
  } catch (e) { fail(e); }
}

async function toggleVehicle(id, status) {
  try {
    await api(`/api/admin/vehicles/${id}/toggle`, "POST", { status: status === 1 ? 0 : 1 });
    notify("车辆状态已更新");
    loadVehicles();
  } catch (e) { fail(e); }
}

async function addVehicle() {
  try {
    await api("/api/admin/vehicles", "POST", {
      plate: el("nvPlate").value, model: el("nvModel").value,
      driverId: Number(el("nvDriver").value)
    });
    notify("车辆已新增");
    loadVehicles();
  } catch (e) { fail(e); }
}

async function loadRules() {
  try {
    const d = await api("/api/admin/rules");
    fillTable("rules", [
      { key: "rule_id", label: "规则ID" },
      { key: "rule_name", label: "名称" },
      { key: "base_fare", label: "起步价" },
      { key: "included_km", label: "含公里" },
      { key: "price_per_km", label: "元/公里" },
      { key: "price_per_min", label: "元/分钟" },
      { key: "min_fare", label: "最低消费" },
      { key: "effective_from", label: "生效时间" }
    ], d.rules);
  } catch (e) { fail(e); }
}

async function addRule() {
  try {
    await api("/api/admin/rules", "POST", {
      name: el("nrName").value, base: Number(el("nrBase").value),
      km: Number(el("nrKm").value), perKm: Number(el("nrPerKm").value),
      perMin: Number(el("nrPerMin").value), minFare: Number(el("nrMin").value)
    });
    notify("计价规则已新增");
    loadRules();
  } catch (e) { fail(e); }
}

/* ---------------- 演示用：URL 参数自动登录（?role=乘客&account=...&tab=stats） ---------------- */
window.addEventListener("load", async () => {
  const q = new URLSearchParams(location.search);
  if (!q.get("role")) return;
  el("role").value = q.get("role");
  el("account").value = q.get("account") || "13800000001";
  el("pwd").value = q.get("pwd") || "123456";
  await login();
  if (q.get("demoTip")) {
    setTimeout(() => {
      const cands = Array.from(document.querySelectorAll("[data-tip]")).filter(el =>
        el.offsetParent !== null && el.getBoundingClientRect().width > 0 &&
        el.getBoundingClientRect().top > 60);
      if (cands[0]) cands[0].dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    }, 900);
  }
  const tab = q.get("tab");
  if (tab && me && me.role === "admin") {
    const idx = ["orders", "stats", "drivers", "vehicles", "rules"].indexOf(tab);
    const btns = document.querySelectorAll(".tabs .tab");
    if (idx >= 0 && btns[idx]) adminTab(tab, btns[idx]);
  }
});




/* 首屏：教程页一进来就加载概览与计价规则 */
window.addEventListener("load", () => {
  const g = document.getElementById("panel-guide");
  if (g && g.style.display !== "none") loadGuide();
});

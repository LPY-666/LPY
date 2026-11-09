/* 静态演示版数据层：用 localStorage 模拟后端 REST 接口，业务规则与真实系统一致 */

const STORE_KEY = "taxi_demo_v2";

const DEMO_PLACES = [
  ["大雁塔北广场", 34.2180, 108.9640], ["西安北站", 34.3760, 108.9390],
  ["钟楼", 34.2610, 108.9450], ["小寨", 34.2240, 108.9480],
  ["曲江池", 34.2030, 108.9860], ["大唐不夜城", 34.2210, 108.9660],
  ["西安咸阳机场", 34.4470, 108.7510], ["回民街", 34.2650, 108.9330],
  ["浐灞生态区", 34.2210, 109.0300], ["南门", 34.2520, 108.9460]
];

function pad(n) { return String(n).padStart(2, "0"); }
function nowStr(offsetMinutes = 0) {
  const d = new Date(Date.now() + offsetMinutes * 60000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function today(offsetDays = 0) {
  const d = new Date(Date.now() - offsetDays * 86400000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const STATUS_NAME = {
  WAIT: "待派单", ACCEPT: "已接单", ARRIVE: "已到达",
  ONTRIP: "行程中", DONE: "已完成", CANCEL: "已取消"
};

function seed() {
  const passengers = [
    [1, "张晓明", "13800000001", 200], [2, "李雨桐", "13800000002", 150],
    [3, "王浩然", "13800000003", 300], [4, "陈思琪", "13800000004", 80],
    [5, "刘子涵", "13800000005", 500], [6, "赵一鸣", "13800000006", 120],
    [7, "孙可欣", "13800000007", 60], [8, "周天宇", "13800000008", 400]
  ].map(r => ({ passenger_id: r[0], name: r[1], phone: r[2], balance: r[3] }));

  const drivers = [
    [1, "马师傅", "13900000001", 1, 5.00, "陕A10001", "比亚迪 秦PLUS", "经济型", 1],
    [2, "高师傅", "13900000002", 1, 4.70, "陕A10002", "大众 朗逸", "经济型", 1],
    [3, "冯师傅", "13900000003", 1, 4.80, "陕A10003", "丰田 凯美瑞", "舒适型", 1],
    [4, "曹师傅", "13900000004", 1, 4.60, "陕A10004", "别克 GL8", "商务型", 1],
    [5, "邓师傅", "13900000005", 0, 4.95, "陕A10005", "吉利 帝豪", "经济型", 1],
    [6, "韩师傅", "13900000006", 0, 4.50, "陕A10006", "本田 雅阁", "舒适型", 0]
  ].map(r => ({
    driver_id: r[0], name: r[1], phone: r[2], online: r[3], rating: r[4],
    plate_no: r[5], model: r[6], vehicle_type: r[7], vehicle_status: r[8],
    total_orders: 0, total_income: 0, status: 1
  }));

  const rules = [
    { rule_id: 1, rule_name: "经济型计价2026", base_fare: 10.0, included_km: 3.0,
      price_per_km: 2.5, price_per_min: 0.5, min_fare: 10.0 },
    { rule_id: 2, rule_name: "舒适型计价2026", base_fare: 14.0, included_km: 3.0,
      price_per_km: 3.2, price_per_min: 0.6, min_fare: 14.0 }
  ];

  const fares = [54.00, 25.50, 20.75, 37.75, 130.25, 14.50];
  const specs = [
    [1, 1, 1, "大雁塔北广场", "西安北站", 14.20, 32, 54.00, 1],
    [2, 2, 2, "钟楼", "小寨", 5.60, 18, 25.50, 1],
    [3, 3, 3, "大雁塔", "曲江池", 4.30, 15, 20.75, 1],
    [4, 4, 4, "西安站", "大唐不夜城", 8.90, 26, 37.75, 1],
    [5, 5, 1, "高新路", "西安咸阳机场", 39.50, 58, 130.25, 1],
    [6, 6, 2, "北大街", "回民街", 2.10, 9, 14.50, 1]
  ];
  const orders = specs.map(s => {
    const [oid, pid, did, origin, dest, km, minutes, fare, daysAgo] = s;
    const drv = drivers.find(d => d.driver_id === did);
    const time = today(daysAgo) + " 13:21:42";
    return {
      order_id: oid, order_no: "2026" + pad(oid) + "0000" + oid,
      passenger_id: pid, passenger_name: passengers.find(p => p.passenger_id === pid).name,
      driver_id: did, driver_name: drv.name, plate_no: drv.plate_no,
      origin_addr: origin, dest_addr: dest, status: "DONE",
      create_time: time, accept_time: time, start_time: time, finish_time: time,
      distance_km: km, duration_min: minutes, total_fare: fare, cancel_reason: ""
    };
  });
  // 一单取消
  orders.push({
    order_id: 7, order_no: "2026070007", passenger_id: 7, passenger_name: "孙可欣",
    driver_id: null, driver_name: "", plate_no: "", origin_addr: "纺织城", dest_addr: "浐灞生态区",
    status: "CANCEL", create_time: today(0) + " 13:21:42", accept_time: "", start_time: "",
    finish_time: "", distance_km: null, duration_min: null, total_fare: null,
    cancel_reason: "等待时间过长"
  });
  // 可派单的两单 + 一单已接单（演示各角色都有事可做）
  orders.push({
    order_id: 8, order_no: "2026080008", passenger_id: 1, passenger_name: "张晓明",
    driver_id: 1, driver_name: "马师傅", plate_no: "陕A10001", origin_addr: "南门",
    dest_addr: "大唐芙蓉园", status: "ACCEPT", create_time: today(0) + " 13:21:42",
    accept_time: today(0) + " 13:22:10", start_time: "", finish_time: "",
    distance_km: null, duration_min: null, total_fare: null, cancel_reason: ""
  });
  orders.push({
    order_id: 9, order_no: "2026090009", passenger_id: 2, passenger_name: "李雨桐",
    driver_id: null, driver_name: "", plate_no: "", origin_addr: "地铁二号线会展中心站",
    dest_addr: "大雁塔南广场", status: "WAIT", create_time: today(0) + " 13:21:42",
    accept_time: "", start_time: "", finish_time: "", distance_km: null,
    duration_min: null, total_fare: null, cancel_reason: ""
  });

  drivers.forEach(d => {
    const done = orders.filter(o => o.driver_id === d.driver_id && o.status === "DONE");
    d.total_orders = done.length;
    d.total_income = done.reduce((s, o) => s + Number(o.total_fare), 0);
  });

  return {
    passengers, drivers, rules, orders,
    evaluations: [{ order_id: 1, driver_id: 1, score: 5 }, { order_id: 2, driver_id: 2, score: 4 }],
    nextOrderId: 10, nextRuleId: 3
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  const data = seed();
  save(data);
  return data;
}
function save(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
}
function findOrder(data, id) {
  const o = data.orders.find(x => x.order_id === Number(id));
  if (!o) throw new Error("订单不存在");
  return o;
}
function driverOf(data, id) { return data.drivers.find(d => d.driver_id === Number(id)); }
function ruleOf(data, id) { return data.rules.find(r => r.rule_id === Number(id)) || data.rules[0]; }
function activeRule(data) { return data.rules[data.rules.length - 1]; }
function orderView(o) {
  return {
    order_id: o.order_id, order_no: o.order_no, passenger_id: o.passenger_id,
    passenger_name: o.passenger_name, driver_name: o.driver_name || "",
    plate_no: o.plate_no || "", origin_addr: o.origin_addr, dest_addr: o.dest_addr,
    status: o.status, status_name: STATUS_NAME[o.status] || o.status,
    create_time: o.create_time, accept_time: o.accept_time || "",
    start_time: o.start_time || "", finish_time: o.finish_time || "",
    total_fare: o.total_fare === null ? "" : Number(o.total_fare).toFixed(2),
    distance_km: o.distance_km === null ? "" : o.distance_km
  };
}
function calcFare(rule, km, minutes) {
  const d = Math.max(0, Number(km) - Number(rule.included_km));
  const total = Number(rule.base_fare) + d * Number(rule.price_per_km)
              + Number(minutes) * Number(rule.price_per_min);
  return Math.round(Math.max(total, Number(rule.min_fare)) * 100) / 100;
}
function activeOrderOf(data, driverId) {
  return data.orders.find(o => o.driver_id === driverId
    && ["ACCEPT", "ARRIVE", "ONTRIP"].includes(o.status));
}

/* ------------------------------------------------------------------ */
/* 模拟 REST 接口：路径、方法与真实后端保持一致                          */
/* ------------------------------------------------------------------ */
async function mockApi(path, method = "GET", body = null) {
  await new Promise(r => setTimeout(r, 120));      // 模拟网络延迟
  const data = load();
  const bodyObj = body || {};
  const seg = path.split("/").filter(Boolean);      // ["api", ...]
  const m = (method || "GET").toUpperCase();

  // POST /api/login
  if (path === "/api/login" && m === "POST") {
    const { role, account, pwd } = bodyObj;
    if (role === "乘客") {
      const p = data.passengers.find(x => x.phone === account);
      if (!p || pwd !== "123456") throw new Error("乘客账号或口令不正确");
      return { role: "passenger", user: p };
    }
    if (role === "司机") {
      const d = driverOf(data, data.drivers.find(x => x.phone === account)?.driver_id);
      if (!d || pwd !== "123456") throw new Error("司机账号或口令不正确");
      return { role: "driver", user: d };
    }
    if (account !== "admin" || pwd !== "admin123") throw new Error("管理员账号或口令不正确");
    return { role: "admin", user: { name: "平台管理员" } };
  }

  // 教程页数据
  if (path === "/api/overview" && m === "GET") {
    const done = data.orders.filter(o => o.status === "DONE");
    return {
      overview: {
        passengers: data.passengers.length, drivers: data.drivers.length,
        vehicles: data.drivers.length, orders: data.orders.length,
        done_orders: done.length,
        online_drivers: data.drivers.filter(d => d.online && d.status).length,
        revenue: done.reduce((s, o) => s + Number(o.total_fare), 0)
      }
    };
  }
  if (path === "/api/rules" && m === "GET") return { rules: data.rules };

  // 乘客
  let match = path.match(/^\/api\/passenger\/(\d+)\/orders$/);
  if (match && m === "GET") {
    const pid = Number(match[1]);
    return { orders: data.orders.filter(o => o.passenger_id === pid)
      .sort((a, b) => b.order_id - a.order_id).map(orderView) };
  }
  if (match && m === "POST") {
    const pid = Number(match[1]);
    if (!data.passengers.find(p => p.passenger_id === pid)) throw new Error("乘客不存在");
    if (bodyObj.origin === bodyObj.dest) throw new Error("起点和终点不能相同");
    const oid = data.nextOrderId++;
    data.orders.push({
      order_id: oid, order_no: "2026" + String(oid).padStart(8, "0"), passenger_id: pid,
      passenger_name: data.passengers.find(p => p.passenger_id === pid).name,
      driver_id: null, driver_name: "", plate_no: "", origin_addr: bodyObj.origin,
      dest_addr: bodyObj.dest, status: "WAIT", create_time: nowStr(),
      accept_time: "", start_time: "", finish_time: "", distance_km: null,
      duration_min: null, total_fare: null, cancel_reason: ""
    });
    save(data);
    return { orderId: oid };
  }

  match = path.match(/^\/api\/order\/(\d+)\/(cancel|evaluate|accept|arrive|start|finish|candidates)$/);
  if (match) {
    const oid = Number(match[1]);
    const action = match[2];
    const o = findOrder(data, oid);

    if (action === "cancel" && m === "POST") {
      if (!["WAIT", "ACCEPT", "ARRIVE"].includes(o.status)) throw new Error("该订单当前状态不能取消");
      o.status = "CANCEL";
      o.cancel_reason = bodyObj.reason || "取消";
      o.finish_time = nowStr();
      save(data);
      return {};
    }
    if (action === "evaluate" && m === "POST") {
      if (o.status !== "DONE") throw new Error("只能评价已完成的订单");
      if (data.evaluations.some(e => e.order_id === oid)) throw new Error("该订单已经评价过了");
      data.evaluations.push({ order_id: oid, driver_id: o.driver_id, score: Number(bodyObj.score || 5) });
      const d = driverOf(data, o.driver_id);
      if (d) {
        const scores = data.evaluations.filter(e => e.driver_id === d.driver_id).map(e => e.score);
        d.rating = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) / 100;
      }
      save(data);
      return {};
    }
    if (action === "accept" && m === "POST") {
      const d = driverOf(data, bodyObj.driverId);
      if (!d) throw new Error("司机不存在");
      if (o.status !== "WAIT") throw new Error("订单已被接单或已取消");
      if (!d.online || !d.status) throw new Error("司机离线、停用或车辆不满足运营条件，不能接单");
      if (!d.vehicle_status) throw new Error("该司机没有可运营的车辆");
      if (activeOrderOf(data, d.driver_id)) throw new Error("该司机还有进行中的订单，不能同时接单");
      o.status = "ACCEPT"; o.driver_id = d.driver_id; o.driver_name = d.name;
      o.plate_no = d.plate_no; o.accept_time = nowStr();
      save(data);
      return {};
    }
    if (action === "arrive" && m === "POST") {
      if (o.status !== "ACCEPT") throw new Error("非法的订单状态流转");
      o.status = "ARRIVE"; save(data); return {};
    }
    if (action === "start" && m === "POST") {
      if (o.status !== "ARRIVE") throw new Error("非法的订单状态流转");
      o.status = "ONTRIP"; o.start_time = nowStr(); save(data); return {};
    }
    if (action === "finish" && m === "POST") {
      if (o.status !== "ONTRIP") throw new Error("非法的订单状态流转");
      const km = Number(bodyObj.distance), minutes = Number(bodyObj.minutes);
      if (!(km >= 0) || !(minutes >= 0)) throw new Error("完成行程必须给出里程与时长");
      const rule = activeRule(data);
      o.distance_km = km; o.duration_min = minutes; o.status = "DONE";
      o.finish_time = nowStr();
      o.total_fare = calcFare(rule, km, minutes);
      const d = driverOf(data, o.driver_id);
      if (d) { d.total_orders += 1; d.total_income = Math.round((d.total_income + o.total_fare) * 100) / 100; }
      save(data);
      return { fare: o.total_fare };
    }
    if (action === "candidates" && m === "GET") {
      const avail = data.drivers.filter(d => d.online && d.status && d.vehicle_status
        && !activeOrderOf(data, d.driver_id));
      return {
        candidates: avail.map((d, i) => ({
          driver_id: d.driver_id, driver_name: d.name, plate_no: d.plate_no,
          vehicle_type: d.vehicle_type, distance_km: (0.8 + i * 1.4).toFixed(2)
        }))
      };
    }
  }

  // 司机
  match = path.match(/^\/api\/driver\/(\d+)\/(info|online|orders)$/);
  if (match) {
    const did = Number(match[1]);
    const what = match[2];
    const d = driverOf(data, did);
    if (!d) throw new Error("司机不存在");
    if (what === "info" && m === "GET") {
      const income = {};
      data.orders.filter(o => o.driver_id === did && o.status === "DONE").forEach(o => {
        const day = (o.finish_time || o.create_time).slice(0, 10);
        income[day] = income[day] || { stat_date: day, orders: 0, income: 0 };
        income[day].orders += 1;
        income[day].income = Math.round((income[day].income + Number(o.total_fare)) * 100) / 100;
      });
      return { info: d, income: Object.values(income).sort((a, b) => b.stat_date.localeCompare(a.stat_date)) };
    }
    if (what === "online" && m === "POST") {
      d.online = Number(bodyObj.online) ? 1 : 0; save(data); return {};
    }
    if (what === "orders" && m === "GET") {
      return { orders: data.orders.filter(o => o.driver_id === did
        && ["ACCEPT", "ARRIVE", "ONTRIP", "DONE"].includes(o.status))
        .sort((a, b) => b.order_id - a.order_id).map(orderView) };
    }
  }

  if (path === "/api/orders/wait" && m === "GET") {
    return { orders: data.orders.filter(o => o.status === "WAIT")
      .sort((a, b) => a.order_id - b.order_id).map(orderView) };
  }

  // 管理端
  if (path.startsWith("/api/admin/orders") && m === "GET") {
    const q = path.split("?")[1] || "";
    const status = decodeURIComponent((q.match(/status=([^&]*)/) || [, ""])[1]);
    let list = data.orders.slice();
    if (status && status !== "全部") list = list.filter(o => STATUS_NAME[o.status] === status);
    return { orders: list.sort((a, b) => b.order_id - a.order_id).map(orderView) };
  }
  if (path === "/api/admin/stats" && m === "GET") {
    const daily = {};
    data.orders.forEach(o => {
      const day = (o.create_time || "").slice(0, 10);
      if (!day) return;
      daily[day] = daily[day] || { stat_date: day, order_count: 0, done_count: 0, cancel_count: 0,
        revenue: 0, avg_fare: 0, avg_distance: 0, _fares: [], _kms: [] };
      const row = daily[day];
      row.order_count += 1;
      if (o.status === "DONE") {
        row.done_count += 1;
        row.revenue = Math.round((row.revenue + Number(o.total_fare)) * 100) / 100;
        row._fares.push(Number(o.total_fare));
        row._kms.push(Number(o.distance_km));
      }
      if (o.status === "CANCEL") row.cancel_count += 1;
    });
    const dailyRows = Object.values(daily).map(r => {
      const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100 : 0;
      return { stat_date: r.stat_date, order_count: r.order_count, done_count: r.done_count,
               cancel_count: r.cancel_count, revenue: r.revenue,
               avg_fare: avg(r._fares), avg_distance: avg(r._kms) };
    }).sort((a, b) => b.stat_date.localeCompare(a.stat_date));
    const rank = data.drivers.map(d => ({
      driver_id: d.driver_id, name: d.name, rating: d.rating,
      finished_orders: d.total_orders, total_fare: d.total_income, online: d.online
    })).sort((a, b) => b.total_fare - a.total_fare);
    return { daily: dailyRows, rank };
  }
  if (path === "/api/admin/drivers") {
    if (m === "GET") {
      return { drivers: data.drivers.map(d => ({
        driver_id: d.driver_id, name: d.name, phone: d.phone, online: d.online,
        status: d.status, rating: d.rating, total_orders: d.total_orders, total_income: d.total_income
      })) };
    }
    if (!bodyObj.name || !bodyObj.phone) throw new Error("姓名与手机号不能为空");
    data.drivers.push({
      driver_id: Math.max(...data.drivers.map(d => d.driver_id)) + 1, name: bodyObj.name,
      phone: bodyObj.phone, online: 0, rating: 5, total_orders: 0, total_income: 0,
      status: 1, plate_no: "", model: "", vehicle_type: "", vehicle_status: 0
    });
    save(data); return {};
  }
  match = path.match(/^\/api\/admin\/drivers\/(\d+)\/toggle$/);
  if (match && m === "POST") {
    const d = driverOf(data, Number(match[1]));
    if (!d) throw new Error("司机不存在");
    d.status = Number(bodyObj.status); save(data); return {};
  }
  if (path === "/api/admin/vehicles") {
    if (m === "GET") {
      return { vehicles: data.drivers.map((d, i) => ({
        vehicle_id: i + 1, plate_no: d.plate_no || "—", model: d.model || "—",
        vehicle_type: d.vehicle_type || "经济型", seats: 4, owner_driver_id: d.driver_id,
        status: d.vehicle_status })) };
    }
    const d = driverOf(data, bodyObj.driverId);
    if (!d) throw new Error("所属司机不存在");
    d.plate_no = bodyObj.plate; d.model = bodyObj.model; d.vehicle_status = 1;
    save(data); return {};
  }
  match = path.match(/^\/api\/admin\/vehicles\/(\d+)\/toggle$/);
  if (match && m === "POST") {
    const d = data.drivers[Number(match[1]) - 1];
    if (!d) throw new Error("车辆不存在");
    d.vehicle_status = Number(bodyObj.status); save(data); return {};
  }
  if (path === "/api/admin/rules") {
    if (m === "GET") return { rules: data.rules };
    data.rules.push({
      rule_id: data.nextRuleId++, rule_name: bodyObj.name, base_fare: Number(bodyObj.base),
      included_km: Number(bodyObj.km), price_per_km: Number(bodyObj.perKm),
      price_per_min: Number(bodyObj.perMin), min_fare: Number(bodyObj.minFare)
    });
    save(data); return {};
  }

  throw new Error("接口不存在：" + path);
}

function resetDemo() {
  localStorage.removeItem(STORE_KEY);
  location.reload();
}


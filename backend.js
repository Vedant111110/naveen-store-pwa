// Accounts (phone OTP), orders, tracking, delivery OTP, owner screen. Uses Firebase project "nbd-store".
const firebaseConfig = {
  apiKey: "AIzaSyByPQLfrSu_L06oTMgyYuNdSuEnvNUTRpo",
  authDomain: "nbd-store.firebaseapp.com",
  projectId: "nbd-store",
  storageBucket: "nbd-store.firebasestorage.app",
  messagingSenderId: "22718693183",
  appId: "1:22718693183:web:12532cd0c29778f9ce9d8a"
};
const OWNERS = ["+917007343105", "+916394698473"];   // must match firestore.rules
const V = "10.12.2", CDN = `https://www.gstatic.com/firebasejs/${V}/`;

const TXT = {
  hi: { acct:"👤 खाता", orders:"📦 मेरे ऑर्डर", owner:"🛠 सभी ऑर्डर", login:"मोबाइल नंबर से लॉगिन", phone:"10 अंकों का मोबाइल नंबर", sendOtp:"OTP भेजें", code:"SMS में आया 6 अंकों का कोड", verify:"लॉगिन करें", logout:"लॉगआउट", close:"बंद करें", need:"ऑर्डर देने के लिए पहले लॉगिन करें।", fail:"कुछ गड़बड़ हुई। फिर कोशिश करें।", none:"अभी कोई ऑर्डर नहीं है।", total:"कुल", otpLbl:"डिलीवरी OTP (डिलीवरी करने वाले को बताएँ)", placed:"ऑर्डर मिला", confirmed:"पक्का हुआ", packed:"पैक हो गया", out:"डिलीवरी के लिए निकला", delivered:"पहुँच गया", cancelled:"रद्द", next:"अगला चरण", askOtp:"ग्राहक का डिलीवरी OTP डालें", wrongOtp:"OTP सही नहीं है।", done:"ऑर्डर हो गया! ऑर्डर नंबर", cod:"डिलीवरी पर भुगतान", store:"दुकान पर भुगतान", pickup:"दुकान से पिकअप", delivery:"घर पर डिलीवरी", sending:"भेज रहे हैं…", loggedAs:"लॉगिन:", prod:"🛍 सामान बदलें", add:"+ नया सामान", save:"सेव करें", del:"हटाएँ", nameHi:"हिंदी नाम", nameEn:"English नाम", unit:"साइज़ / यूनिट (जैसे 1 kg)", price:"कीमत ₹", stock:"स्टॉक संख्या (खाली = गिनती नहीं)", cat:"श्रेणी", emoji:"चिह्न (emoji)", avail:"बिक्री के लिए उपलब्ध", seed:"नमूना सामान डेटाबेस में डालें", confirmDel:"यह सामान हटाएँ?", saved:"सेव हो गया", inStock:"स्टॉक में है", outStock:"स्टॉक खत्म", needName:"नाम और सही कीमत डालें।" },
  en: { acct:"👤 Account", orders:"📦 My Orders", owner:"🛠 All Orders", login:"Log in with mobile number", phone:"10-digit mobile number", sendOtp:"Send OTP", code:"6-digit code from SMS", verify:"Log in", logout:"Log out", close:"Close", need:"Please log in before placing an order.", fail:"Something went wrong. Please try again.", none:"No orders yet.", total:"Total", otpLbl:"Delivery OTP (tell it to the delivery person)", placed:"Order placed", confirmed:"Confirmed", packed:"Packed", out:"Out for delivery", delivered:"Delivered", cancelled:"Cancelled", next:"Next step", askOtp:"Enter the customer's delivery OTP", wrongOtp:"Wrong OTP.", done:"Order placed! Order number", cod:"Cash on delivery", store:"Pay at store", pickup:"Store pickup", delivery:"Home delivery", sending:"Sending…", loggedAs:"Logged in:", prod:"🛍 Edit Products", add:"+ Add product", save:"Save", del:"Delete", nameHi:"Hindi name", nameEn:"English name", unit:"Size / unit (e.g. 1 kg)", price:"Price ₹", stock:"Stock quantity (blank = not tracked)", cat:"Category", emoji:"Icon (emoji)", avail:"Available to buy", seed:"Load sample products into database", confirmDel:"Delete this product?", saved:"Saved", inStock:"In stock", outStock:"Out of stock", needName:"Enter a name and a valid price." }
};
const L = () => TXT[document.documentElement.lang === "en" ? "en" : "hi"];
const FLOW = ["placed", "confirmed", "packed", "out", "delivered"];
let fb = null, user = null, isOwner = false, confirmation = null, unsub = null;

const css = document.createElement("style");
css.textContent = `
#nbdBar{position:fixed;left:10px;bottom:10px;z-index:9998;display:flex;gap:6px;flex-wrap:wrap;max-width:70vw}
#nbdBar button,.nbd-btn{background:#14532d;color:#fff;border:0;border-radius:20px;padding:9px 14px;font-size:14px;cursor:pointer}
#nbdPanel{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:none;align-items:flex-end;justify-content:center}
#nbdPanel .box{background:#fff;color:#111;width:min(560px,100%);max-height:88vh;overflow:auto;border-radius:16px 16px 0 0;padding:16px}
#nbdPanel input{width:100%;padding:10px;margin:6px 0;font-size:16px;border:1px solid #999;border-radius:8px;box-sizing:border-box}
.nbd-order{border:1px solid #cfd8cf;border-radius:10px;padding:10px;margin:10px 0}
.nbd-steps{display:flex;gap:4px;margin:8px 0;font-size:11px}.nbd-steps span{flex:1;text-align:center;padding:4px 2px;border-radius:6px;background:#eee}.nbd-steps .on{background:#14532d;color:#fff}`;
document.head.appendChild(css);
document.getElementById("ownerOpen")?.closest(".owner-tools")?.remove();   // old local owner login removed
document.getElementById("ownerModal")?.remove();

const bar = Object.assign(document.createElement("div"), { id: "nbdBar" });
const panel = Object.assign(document.createElement("div"), { id: "nbdPanel" });
panel.innerHTML = '<div class="box"><div id="nbdBody"></div></div><div id="nbdCaptcha"></div>';
document.body.append(bar, panel);
panel.addEventListener("click", e => { if (e.target === panel) closePanel(); });
const body = () => document.getElementById("nbdBody");
const closePanel = () => { panel.style.display = "none"; unsub?.(); unsub = null; };
const openPanel = () => { panel.style.display = "flex"; panel.dataset.view = ""; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const money = n => "₹" + Number(n).toLocaleString("en-IN");

function drawBar() {
  const t = L();
  bar.innerHTML = "";
  const add = (label, fn) => { const b = document.createElement("button"); b.textContent = label; b.onclick = fn; bar.appendChild(b); };
  add(user ? t.acct : t.login, showAccount);
  if (user) add(t.orders, () => showOrders(false));
  if (isOwner) { add(t.owner, () => showOrders(true)); add(t.prod, showProducts); }
}
new MutationObserver(drawBar).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

function showAccount() {
  const t = L(); openPanel();
  if (user) {
    body().innerHTML = `<h3>${t.acct}</h3><p>${t.loggedAs} ${esc(user.phoneNumber)}</p><button class="nbd-btn" id="nbdOut">${t.logout}</button> <button class="nbd-btn" id="nbdX">${t.close}</button>`;
    document.getElementById("nbdOut").onclick = async () => { await fb.signOut(fb.auth); closePanel(); };
  } else {
    body().innerHTML = `<h3>${t.login}</h3><input id="nbdPh" inputmode="numeric" maxlength="10" placeholder="${t.phone}"><button class="nbd-btn" id="nbdSend">${t.sendOtp}</button> <button class="nbd-btn" id="nbdX">${t.close}</button><div id="nbdStep2"></div>`;
    document.getElementById("nbdSend").onclick = sendCode;
  }
  document.getElementById("nbdX").onclick = closePanel;
}
async function sendCode() {
  const t = L(), digits = document.getElementById("nbdPh").value.replace(/\D/g, "");
  if (digits.length !== 10) return alert(t.phone);
  const btn = document.getElementById("nbdSend"); btn.disabled = true; btn.textContent = t.sending;
  try {
    if (!fb.verifier) fb.verifier = new fb.RecaptchaVerifier(fb.auth, "nbdCaptcha", { size: "invisible" });
    confirmation = await fb.signInWithPhoneNumber(fb.auth, "+91" + digits, fb.verifier);
    document.getElementById("nbdStep2").innerHTML = `<input id="nbdCode" inputmode="numeric" maxlength="6" placeholder="${t.code}"><button class="nbd-btn" id="nbdVerify">${t.verify}</button>`;
    document.getElementById("nbdVerify").onclick = async () => {
      try { await confirmation.confirm(document.getElementById("nbdCode").value.trim()); closePanel(); } catch (e) { alert(t.fail); }
    };
  } catch (e) { console.warn(e); alert(t.fail); fb.verifier?.clear?.(); fb.verifier = null; }
  btn.disabled = false; btn.textContent = t.sendOtp;
}

function showOrders(all) {
  const t = L(); openPanel();
  body().innerHTML = `<h3>${all ? t.owner : t.orders}</h3><div id="nbdList"></div><button class="nbd-btn" id="nbdX">${t.close}</button>`;
  document.getElementById("nbdX").onclick = closePanel;
  const q = all ? fb.query(fb.collection(fb.db, "orders")) : fb.query(fb.collection(fb.db, "orders"), fb.where("uid", "==", user.uid));
  unsub?.();
  unsub = fb.onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const list = document.getElementById("nbdList"); if (!list) return;
    list.innerHTML = docs.length ? "" : `<p>${t.none}</p>`;
    docs.forEach(o => list.appendChild(orderCard(o, all)));
  }, e => { console.warn(e); alert(t.fail); });
}
function orderCard(o, all) {
  const t = L(), el = document.createElement("div"); el.className = "nbd-order";
  const hi = document.documentElement.lang !== "en";
  const idx = FLOW.indexOf(o.status);
  const steps = o.status === "cancelled" ? `<b>${t.cancelled}</b>` : `<div class="nbd-steps">${FLOW.map((s, i) => `<span class="${i <= idx ? "on" : ""}">${t[s]}</span>`).join("")}</div>`;
  const items = (o.items || []).map(i => `${esc(hi ? i.name : (i.en || i.name))} × ${i.qty} (${esc(i.unit)}) = ${money(i.price * i.qty)}`).join("<br>");
  el.innerHTML = `<b>#${esc(o.id.slice(0, 6).toUpperCase())}</b> · ${o.createdAt ? new Date(o.createdAt.seconds * 1000).toLocaleString(hi ? "hi-IN" : "en-IN") : ""}
    ${steps}<div>${items}</div><div><b>${t.total}: ${money(o.total)}</b> · ${t[o.payment] || ""} · ${t[o.fulfilment] || ""}</div>
    ${all ? `<div>${esc(o.name)} · ${esc(o.contactPhone)}<br>${esc(o.address)}<br>${esc(o.notes || "")}</div>` : ""}
    ${!all && o.status === "out" ? `<p><b>${t.otpLbl}: ${esc(o.deliveryOtp)}</b></p>` : ""}`;
  if (all && idx >= 0 && idx < FLOW.length - 1) {
    const b = document.createElement("button"); b.className = "nbd-btn"; b.textContent = `${t.next}: ${t[FLOW[idx + 1]]}`;
    b.onclick = () => advance(o, FLOW[idx + 1]);
    el.appendChild(b);
  }
  return el;
}
async function advance(o, next) {
  const t = L(), data = { status: next, updatedAt: fb.serverTimestamp() };
  if (next === "delivered") { const code = prompt(t.askOtp); if (code === null) return; data.otpCheck = code.trim(); }
  try { await fb.updateDoc(fb.doc(fb.db, "orders", o.id), data); } catch (e) { alert(next === "delivered" ? t.wrongOtp : t.fail); }
}


// ---------- Products (stored in Firestore; owners edit, everyone reads) ----------
let productDocs = [];
const toCSV = rows => rows.map(r => r.map(v => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(",")).join("\n");
function startProducts() {
  fb.onSnapshot(fb.collection(fb.db, "products"), snap => {
    productDocs = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
    if (productDocs.length && typeof applySheetProducts === "function") {
      const rows = [["name_hindi", "name_english", "unit", "price", "category", "emoji", "available"]];
      productDocs.forEach(p => rows.push([p.nameHi, p.nameEn, p.unit, p.price, p.category, p.emoji,
        (p.available !== false && !(p.stock != null && p.stock <= 0)) ? "yes" : "no"]));
      applySheetProducts(toCSV(rows));
    }
    if (panel.style.display === "flex" && panel.dataset.view === "products" && !body().contains(document.activeElement)) renderProducts();
  }, e => console.warn(e));
}
function showProducts() { openPanel(); panel.dataset.view = "products"; renderProducts(); }
function productForm(p) {
  const t = L(), f = (k, label, v, extra = "") => `<label style="font-size:12px">${label}</label><input data-f="${k}" value="${esc(v)}" ${extra}>`;
  const inStock = p.available !== false && !(p.stock != null && p.stock <= 0);
  const head = p.id ? `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px">
      <b>${esc(p.emoji || "🛒")} ${esc(document.documentElement.lang === "en" ? (p.nameEn || p.nameHi) : (p.nameHi || p.nameEn))} · ${money(p.price)}</b>
      <button class="nbd-btn" data-act="toggle" style="background:${inStock ? "#14532d" : "#9b2c2c"};white-space:nowrap">${inStock ? t.inStock : t.outStock}</button></div>` : "";
  return `<div class="nbd-order" data-id="${esc(p.id || "new")}">${head}
    ${f("nameHi", t.nameHi, p.nameHi)}${f("nameEn", t.nameEn, p.nameEn)}${f("unit", t.unit, p.unit)}
    ${f("price", t.price, p.price, 'inputmode="decimal"')}${f("stock", t.stock, p.stock ?? "", 'inputmode="numeric"')}
    ${f("category", t.cat, p.category)}${f("emoji", t.emoji, p.emoji)}
    <label style="font-size:13px"><input type="checkbox" data-f="available" style="width:auto" ${p.available !== false ? "checked" : ""}> ${t.avail}</label><br>
    <button class="nbd-btn" data-act="save">${t.save}</button> ${p.id ? `<button class="nbd-btn" style="background:#9b2c2c" data-act="del">${t.del}</button>` : ""}</div>`;
}
function renderProducts() {
  const t = L();
  body().innerHTML = `<h3>${t.prod}</h3><button class="nbd-btn" id="pNew">${t.add}</button> ${productDocs.length ? "" : `<button class="nbd-btn" id="pSeed">${t.seed}</button>`} <button class="nbd-btn" id="nbdX">${t.close}</button><div id="pList"></div>`;
  document.getElementById("nbdX").onclick = closePanel;
  const list = document.getElementById("pList");
  list.innerHTML = productDocs.map(productForm).join("");
  document.getElementById("pNew").onclick = () => { list.insertAdjacentHTML("afterbegin", productForm({})); list.firstElementChild.scrollIntoView(); };
  const seed = document.getElementById("pSeed");
  if (seed) seed.onclick = async () => {
    seed.disabled = true;
    for (const [i, p] of SHOP_PRODUCTS.entries())
      await fb.addDoc(fb.collection(fb.db, "products"), { nameHi: p.name, nameEn: p.en, unit: p.unit, price: p.price, category: SHOP_TEXT.en.cats[p.cat] || p.cat, emoji: p.emoji, available: true, stock: null, order: i });
  };
  list.onclick = async e => {
    const act = e.target.dataset.act; if (!act) return;
    const card = e.target.closest("[data-id]"), id = card.dataset.id, val = k => card.querySelector(`[data-f="${k}"]`);
    try {
      if (act === "toggle") {
        const cur = productDocs.find(x => x.id === id) || {};
        const nowIn = cur.available !== false && !(cur.stock != null && cur.stock <= 0);
        const upd = nowIn ? { available: false } : { available: true, ...(cur.stock != null && cur.stock <= 0 ? { stock: null } : {}) };
        await fb.updateDoc(fb.doc(fb.db, "products", id), upd);
        e.target.textContent = nowIn ? t.outStock : t.inStock;
        e.target.style.background = nowIn ? "#9b2c2c" : "#14532d";
        const cb = card.querySelector('[data-f="available"]'); if (cb) cb.checked = !nowIn;
        if (!nowIn && upd.stock === null) card.querySelector('[data-f="stock"]').value = "";
        return;
      }
      if (act === "del") { if (confirm(t.confirmDel)) await fb.deleteDoc(fb.doc(fb.db, "products", id)); return; }
      const price = parseFloat(val("price").value), nameHi = val("nameHi").value.trim(), nameEn = val("nameEn").value.trim();
      if ((!nameHi && !nameEn) || isNaN(price) || price < 0) return alert(t.needName);
      const stockRaw = val("stock").value.trim();
      const data = { nameHi: nameHi || nameEn, nameEn: nameEn || nameHi, unit: val("unit").value.trim(), price, category: val("category").value.trim() || "Other",
        emoji: val("emoji").value.trim() || "🛒", available: val("available").checked, stock: stockRaw === "" ? null : Math.max(0, parseInt(stockRaw, 10) || 0) };
      if (id === "new") await fb.addDoc(fb.collection(fb.db, "products"), { ...data, order: Date.now() });
      else await fb.updateDoc(fb.doc(fb.db, "products", id), data);
      e.target.textContent = t.saved; setTimeout(() => { e.target.textContent = t.save; }, 1500);
    } catch (err) { console.warn(err); alert(t.fail); }
  };
}

// Take over checkout once Firebase is ready; until then the old demo checkout keeps working.
document.addEventListener("submit", async e => {
  if (e.target.id !== "checkoutForm" || !fb) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const t = L();
  if (!user) { alert(t.need); showAccount(); return; }
  const items = SHOP_PRODUCTS.filter(p => Number(shopCart[p.id]) > 0).map(p => ({ id: p.id, name: p.name, en: p.en, unit: p.unit, price: p.price, qty: Number(shopCart[p.id]) }));
  if (!items.length) return alert(typeof shopText === "function" ? shopText().needItems : "");
  const pickup = document.getElementById("orderFulfilment").value === "pickup";
  const otp = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, "0");
  const order = {
    uid: user.uid, phone: user.phoneNumber, name: document.getElementById("orderCustomerName").value.trim(),
    contactPhone: document.getElementById("orderCustomerPhone").value.trim(),
    address: pickup ? "Store pickup" : document.getElementById("orderAddress").value.trim(),
    fulfilment: pickup ? "pickup" : "delivery", payment: document.getElementById("orderPayment").value,
    notes: document.getElementById("orderNotes").value.trim(), items, total: items.reduce((s, i) => s + i.price * i.qty, 0),
    status: "placed", deliveryOtp: otp, createdAt: fb.serverTimestamp()
  };
  try {
    const ref = await fb.addDoc(fb.collection(fb.db, "orders"), order);
    Object.keys(shopCart).forEach(k => delete shopCart[k]); saveShopState(); renderShop(); e.target.reset();
    alert(`${t.done}: #${ref.id.slice(0, 6).toUpperCase()}`);
    showOrders(false);
  } catch (err) { console.warn(err); alert(t.fail); }
}, true);

(async () => {
  try {
    const [app, auth, fs] = await Promise.all([import(CDN + "firebase-app.js"), import(CDN + "firebase-auth.js"), import(CDN + "firebase-firestore.js")]);
    const a = app.initializeApp(firebaseConfig);
    fb = { ...auth, ...fs, auth: auth.getAuth(a), db: fs.getFirestore(a), verifier: null };
    auth.getAuth(a).languageCode = document.documentElement.lang === "en" ? "en" : "hi";
    startProducts();
    auth.onAuthStateChanged(fb.auth, u => { user = u; isOwner = !!u && OWNERS.includes(u.phoneNumber); drawBar(); });
  } catch (e) { console.warn("Backend not available; demo checkout stays active.", e); }
})();
drawBar();

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const status = document.getElementById("status");
const list = document.getElementById("list");
const form = document.getElementById("form");
const input = document.getElementById("text");
const bar = document.getElementById("bar");

const ICON_EDIT = '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>';
const ICON_DEL  = '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14"/></svg>';

function setStatus(msg, isErr) {
  status.textContent = msg;
  status.className = "status" + (isErr ? " err" : "");
}

if (firebaseConfig.apiKey === "YOUR_API_KEY") {
  setStatus("Pehle firebase-config.js mein apna Firebase config paste karo.", true);
  throw new Error("Firebase config missing");
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const todosRef = collection(db, "todos");
const ref = (id) => doc(db, "todos", id);

const seen = new Set();   // jo tasks pehle dikh chuke (animation sirf naye par)
let popId = null;         // jis task ko abhi tick kiya

// READ (real-time)
const q = query(todosRef, orderBy("createdAt", "desc"));
onSnapshot(q, (snap) => {
  const items = snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
  render(items);
  const done = items.filter(t => t.done).length;
  bar.style.width = items.length ? (done / items.length * 100) + "%" : "0";
  setStatus(items.length ? (items.length - done) + " of " + items.length + " left" : "");
}, (err) => setStatus("Error: " + err.message, true));

// CREATE
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  try { await addDoc(todosRef, { text, done: false, createdAt: serverTimestamp() }); }
  catch (err) { setStatus("Add failed: " + err.message, true); }
});

function confetti(el) {
  const r = el.getBoundingClientRect();
  const cols = ["#16a34a", "#84cc16", "#facc15", "#34d399", "#22c55e"];
  for (let i = 0; i < 14; i++) {
    const c = document.createElement("div");
    c.className = "conf";
    c.style.left = (r.left + 13) + "px";
    c.style.top = (r.top + 13) + "px";
    c.style.background = cols[i % cols.length];
    c.style.setProperty("--x", (Math.random() * 160 - 80) + "px");
    c.style.setProperty("--y", (Math.random() * 120 - 90) + "px");
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 1000);
  }
}

function render(items) {
  list.innerHTML = "";
  if (!items.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "🎉 Koi task nahi. Upar se naya add karo.";
    list.appendChild(p);
    return;
  }
  items.forEach((t, i) => {
    const li = document.createElement("li");
    if (t.done) li.classList.add("done");
    if (!seen.has(t.id)) { li.classList.add("new"); li.style.animationDelay = (i * 60) + "ms"; }

    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.className = "chk"; cb.checked = !!t.done;
    cb.setAttribute("aria-label", "Mark done");
    if (popId === t.id) { cb.classList.add("pop"); popId = null; }
    // UPDATE (done)
    cb.onchange = () => {
      if (cb.checked) { confetti(cb); popId = t.id; }
      updateDoc(ref(t.id), { done: cb.checked });
    };

    const s = document.createElement("span");
    s.textContent = t.text;

    const edit = document.createElement("button");
    edit.className = "ib edit"; edit.type = "button"; edit.innerHTML = ICON_EDIT;
    edit.setAttribute("aria-label", "Edit task");
    // UPDATE (text)
    edit.onclick = () => {
      const inp = document.createElement("input");
      inp.type = "text"; inp.value = t.text; inp.maxLength = 200;
      let fin = false;
      const commit = async () => {
        if (fin) return; fin = true;
        const v = inp.value.trim();
        if (v && v !== t.text) await updateDoc(ref(t.id), { text: v });
        else render(items);
      };
      inp.onkeydown = (ev) => {
        if (ev.key === "Enter") commit();
        if (ev.key === "Escape") { fin = true; render(items); }
      };
      inp.onblur = commit;
      li.replaceChild(inp, s);
      inp.focus(); inp.select();
    };

    const del = document.createElement("button");
    del.className = "ib del"; del.type = "button"; del.innerHTML = ICON_DEL;
    del.setAttribute("aria-label", "Delete task");
    // DELETE (pehle slide-out animation, phir delete)
    del.onclick = () => {
      li.classList.add("out");
      setTimeout(() => deleteDoc(ref(t.id)), 340);
    };

    li.append(cb, s, edit, del);
    list.appendChild(li);
  });
  items.forEach(t => seen.add(t.id));
}

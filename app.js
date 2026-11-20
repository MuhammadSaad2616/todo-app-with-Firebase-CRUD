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

// READ (real-time)
const q = query(todosRef, orderBy("createdAt", "desc"));
onSnapshot(q, (snap) => {
  const items = snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
  render(items);
  const open = items.filter(t => !t.done).length;
  setStatus(items.length ? open + " of " + items.length + " left" : "");
}, (err) => setStatus("Error: " + err.message, true));

// CREATE
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  try {
    await addDoc(todosRef, { text, done: false, createdAt: serverTimestamp() });
  } catch (err) {
    setStatus("Add failed: " + err.message, true);
  }
});

function render(items) {
  list.innerHTML = "";
  if (!items.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "No tasks yet. Add your first one above.";
    list.appendChild(p);
    return;
  }
  items.forEach(t => {
    const li = document.createElement("li");
    if (t.done) li.className = "done";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!t.done;
    cb.setAttribute("aria-label", "Mark done");
    // UPDATE (done)
    cb.onchange = () => updateDoc(doc(db, "todos", t.id), { done: cb.checked });

    const s = document.createElement("span");
    s.textContent = t.text;

    const edit = document.createElement("button");
    edit.className = "btn edit"; edit.type = "button"; edit.textContent = "Edit";
    // UPDATE (text)
    edit.onclick = () => {
      const inp = document.createElement("input");
      inp.type = "text"; inp.value = t.text; inp.maxLength = 200;
      let fin = false;
      const commit = async () => {
        if (fin) return; fin = true;
        const v = inp.value.trim();
        if (v && v !== t.text) await updateDoc(doc(db, "todos", t.id), { text: v });
        else render(items);
      };
      inp.onkeydown = (ev) => {
        if (ev.key === "Enter") commit();
        if (ev.key === "Escape") { fin = true; render(items); }
      };
      inp.onblur = commit;
      li.replaceChild(inp, s);
      edit.textContent = "Save"; edit.onclick = commit;
      inp.focus(); inp.select();
    };

    const del = document.createElement("button");
    del.className = "btn del"; del.type = "button"; del.textContent = "Delete";
    // DELETE
    del.onclick = () => deleteDoc(doc(db, "todos", t.id));

    li.append(cb, s, edit, del);
    list.appendChild(li);
  });
}

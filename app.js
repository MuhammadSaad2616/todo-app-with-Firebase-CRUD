import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const authSec = $("auth"), appSec = $("app");
const authForm = $("authForm"), emailEl = $("email"), passEl = $("password"), authMsg = $("authMsg");
const status = $("status"), list = $("list"), form = $("form"), input = $("text");

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

let unsubscribe = null;

function setStatus(msg, isErr) {
  status.textContent = msg;
  status.className = "status" + (isErr ? " err" : "");
}

function friendly(code) {
  const map = {
    "auth/invalid-email": "Email sahi nahi hai.",
    "auth/missing-password": "Password likho.",
    "auth/weak-password": "Password kam az kam 6 characters ka rakho.",
    "auth/email-already-in-use": "Ye email pehle se registered hai. Login karo.",
    "auth/invalid-credential": "Email ya password galat hai.",
    "auth/user-not-found": "Ye account nahi mila. Pehle Sign up karo.",
    "auth/wrong-password": "Password galat hai.",
    "auth/too-many-requests": "Bohat koshishen ho gayi, thodi der baad try karo.",
    "auth/network-request-failed": "Internet check karo."
  };
  return map[code] || "Kuch masla aa gaya (" + code + ")";
}

// ---------- AUTH ----------
authForm.addEventListener("submit", async (e) => {      // Login
  e.preventDefault();
  authMsg.textContent = "";
  try { await signInWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value); }
  catch (err) { authMsg.textContent = friendly(err.code); }
});

$("signupBtn").addEventListener("click", async () => {  // Sign up
  authMsg.textContent = "";
  if (!authForm.reportValidity()) return;
  try { await createUserWithEmailAndPassword(auth, emailEl.value.trim(), passEl.value); }
  catch (err) { authMsg.textContent = friendly(err.code); }
});

$("logoutBtn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, (user) => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (!user) {
    appSec.hidden = true; authSec.hidden = false;
    list.innerHTML = ""; passEl.value = "";
    return;
  }
  authSec.hidden = true; appSec.hidden = false;
  $("who").textContent = "Logged in: " + user.email;
  startTodos(user);
});

// ---------- TODOS (har user ka apna: users/{uid}/todos) ----------
function startTodos(user) {
  const todosRef = collection(db, "users", user.uid, "todos");
  const q = query(todosRef, orderBy("createdAt", "desc"));

  // READ (real-time)
  unsubscribe = onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
    render(items, user);
    const open = items.filter(t => !t.done).length;
    setStatus(items.length ? open + " of " + items.length + " left" : "");
  }, (err) => setStatus("Error: " + err.message, true));

  // CREATE
  form.onsubmit = async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    try { await addDoc(todosRef, { text, done: false, createdAt: serverTimestamp() }); }
    catch (err) { setStatus("Add failed: " + err.message, true); }
  };
}

function render(items, user) {
  list.innerHTML = "";
  if (!items.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "No tasks yet. Add your first one above.";
    list.appendChild(p);
    return;
  }
  const ref = (id) => doc(db, "users", user.uid, "todos", id);

  items.forEach(t => {
    const li = document.createElement("li");
    if (t.done) li.className = "done";

    const cb = document.createElement("input");
    cb.type = "checkbox"; cb.checked = !!t.done;
    cb.setAttribute("aria-label", "Mark done");
    cb.onchange = () => updateDoc(ref(t.id), { done: cb.checked });      // UPDATE (done)

    const s = document.createElement("span");
    s.textContent = t.text;

    const edit = document.createElement("button");
    edit.className = "btn edit"; edit.type = "button"; edit.textContent = "Edit";
    edit.onclick = () => {                                               // UPDATE (text)
      const inp = document.createElement("input");
      inp.type = "text"; inp.value = t.text; inp.maxLength = 200;
      let fin = false;
      const commit = async () => {
        if (fin) return; fin = true;
        const v = inp.value.trim();
        if (v && v !== t.text) await updateDoc(ref(t.id), { text: v });
        else render(items, user);
      };
      inp.onkeydown = (ev) => {
        if (ev.key === "Enter") commit();
        if (ev.key === "Escape") { fin = true; render(items, user); }
      };
      inp.onblur = commit;
      li.replaceChild(inp, s);
      edit.textContent = "Save"; edit.onclick = commit;
      inp.focus(); inp.select();
    };

    const del = document.createElement("button");
    del.className = "btn del"; del.type = "button"; del.textContent = "Delete";
    del.onclick = () => deleteDoc(ref(t.id));                            // DELETE

    li.append(cb, s, edit, del);
    list.appendChild(li);
  });
}

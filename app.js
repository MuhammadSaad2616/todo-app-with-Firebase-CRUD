import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// firebase connect
let app = initializeApp(firebaseConfig);
let db = getFirestore(app);

let todos = [];
let todoListElm = document.querySelector(".todo-lists");
let bar = document.querySelector("#bar");
let countElm = document.querySelector("#count");
let newId = null; // naya todo jisko slide-in animation chahiye
let popId = null; // jis todo ko abhi tick kiya (pop animation ke liye)

// buttons ke icons
let ICON_EDIT = '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>';
let ICON_DEL = '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14"/></svg>';


// READ - firebase se saare todos lao
let getTodosFromFirebase = async () => {
    try {
        let querySnapshot = await getDocs(collection(db, "todos"));

        todos = [];
        querySnapshot.forEach((docItem) => {
            // docItem.id firebase ki apni id hai, docItem.data() andar ka data
            todos.push({ id: docItem.id, ...docItem.data() });
        });

        // purane todo pehle, naye baad mein
        todos.sort((a, b) => a.createdAt - b.createdAt);

        renderTodos();
    } catch (error) {
        console.error(error);
    }
}


// CREATE
let addTodo = async () => {
    let todoInput = document.querySelector("#todo-inp");

    if (todoInput.value.trim() === "") {
        alert("Pehle todo likho");
        return;
    }

    try {
        let docRef = await addDoc(collection(db, "todos"), {
            text: todoInput.value,
            isCompleted: false,
            createdAt: new Date().getTime(),
        });
        newId = docRef.id;
        todoInput.value = '';
        getTodosFromFirebase();
    } catch (error) {
        console.error(error);
    }
}


// DELETE
let deleteTodo = async (todo_id) => {
    try {
        // pehle slide-out animation, phir firebase se delete
        let card = document.querySelector(`[data-id="${todo_id}"]`);
        if (card) card.classList.add('out');
        await new Promise((resolve) => setTimeout(resolve, 340));

        await deleteDoc(doc(db, "todos", todo_id));
        getTodosFromFirebase();
    } catch (error) {
        console.error(error);
    }
}


// DELETE ALL
let deleteAllTodos = async () => {
    try {
        // har todo ko ek ek karke delete karo
        await Promise.all(todos.map((todo) => deleteDoc(doc(db, "todos", todo.id))));
        getTodosFromFirebase();
    } catch (error) {
        console.error(error);
    }
}


// UPDATE - step 1: edit dabane par text input mein aa jaye
let editTodo = (todo_id) => {
    let delBtns = document.querySelectorAll('.del-btn');
    let editBtns = document.querySelectorAll('.edit-btn');
    let checkBoxes = document.querySelectorAll('.chk');
    document.querySelector('#delAllBtn').disabled = true;
    delBtns.forEach((btn) => btn.disabled = true);
    editBtns.forEach((btn) => btn.disabled = true);
    checkBoxes.forEach((box) => box.disabled = true);

    let findTodo = todos.find((todo) => todo.id == todo_id);
    document.querySelector("#todo-inp").value = findTodo.text;

    // add button ko update button bana do
    let addBtn = document.querySelector("#addBtn");
    addBtn.innerText = 'update';
    addBtn.removeAttribute('onClick');
    addBtn.setAttribute('onClick', `updateTodo('${todo_id}')`);
}


// UPDATE - step 2: update dabane par firebase mein naya text save
let updateTodo = async (todo_id) => {
    let todoInput = document.querySelector("#todo-inp");

    try {
        await updateDoc(doc(db, "todos", todo_id), {
            text: todoInput.value,
        });
    } catch (error) {
        console.error(error);
    }

    // sab kuch pehle jaisa kar do
    document.querySelector('#delAllBtn').disabled = false;
    todoInput.value = '';

    let addBtn = document.querySelector("#addBtn");
    addBtn.innerText = 'add';
    addBtn.removeAttribute('onClick');
    addBtn.setAttribute('onClick', `addTodo()`);

    getTodosFromFirebase();
}


// DONE - tick karo to done, dobara karo to undo
let doneTodo = async (todo_id) => {
    try {
        let findTodo = todos.find((todo) => todo.id == todo_id);
        let newValue = !findTodo.isCompleted;

        if (newValue) popId = todo_id; // tick par pop animation

        await updateDoc(doc(db, "todos", todo_id), {
            isCompleted: newValue,
        });
        getTodosFromFirebase();
    } catch (error) {
        console.error(error);
    }
}


// screen par todos dikhao
let renderTodos = () => {
    todoListElm.innerHTML = '';

    todos.map((item) => {
        let todoList = document.createElement('div');
        todoList.className = 'todo';
        todoList.setAttribute('data-id', item.id);

        // sirf naye todo par slide-in animation
        if (item.id == newId) {
            todoList.className += ' new';
        }

        let popClass = (item.id == popId) ? ' pop' : '';

        if (item.isCompleted) {
            todoList.className += ' done';
            todoList.innerHTML = `
        <div>
        <input type='checkbox' class='chk${popClass}' checked aria-label='undo' onChange="doneTodo('${item.id}')">
        <span>${item.text}</span>
        <button class='ib del-btn' aria-label='delete' onClick="deleteTodo('${item.id}')">${ICON_DEL}</button>
        </div>
        `;
        } else {
            todoList.innerHTML = `
        <div>
        <input type='checkbox' class='chk' aria-label='done' onChange="doneTodo('${item.id}')">
        <span>${item.text}</span>
        <button class='ib edit-btn' aria-label='edit' onClick="editTodo('${item.id}')">${ICON_EDIT}</button>
        <button class='ib del-btn' aria-label='delete' onClick="deleteTodo('${item.id}')">${ICON_DEL}</button>
        </div>
        `;
        }
        todoListElm.appendChild(todoList);
    });
    newId = null;
    popId = null;

    // progress bar aur count
    let doneCount = todos.filter((todo) => todo.isCompleted).length;
    bar.style.width = todos.length ? (doneCount / todos.length * 100) + "%" : "0";
    countElm.innerText = todos.length ? (todos.length - doneCount) + " of " + todos.length + " left" : "Koi todo nahi";
}


// type="module" mein functions private hote hain,
// isliye onClick ke liye unko window par lagana padta hai
window.addTodo = addTodo;
window.deleteTodo = deleteTodo;
window.deleteAllTodos = deleteAllTodos;
window.editTodo = editTodo;
window.updateTodo = updateTodo;
window.doneTodo = doneTodo;

// page khulte hi todos lao
getTodosFromFirebase();

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBgvOgmGFZvMdUZ4FG972C-v-SXi84zyvs",
  authDomain: "pagepalette-bd60c.firebaseapp.com",
  projectId: "pagepalette-bd60c",
  storageBucket: "pagepalette-bd60c.appspot.com",
  messagingSenderId: "386096006369",
  appId: "1:386096006369:web:d7f0f966af3e30f74b23a0",
  measurementId: "G-NNVNMHPX0E"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  document.getElementById("admin-user-email").textContent = user.email;
  if (user.email !== 'ashleyparuli11@gmail.com') {
    window.location.href = "index.html";
    return;
  }
  document.getElementById("logout-link").classList.remove("hide");
  showSection('books');
});

document.getElementById("logout-link").addEventListener("click", (e) => {
  e.preventDefault();
  signOut(auth).then(() => window.location.href = "login.html");
});

const booksTabBtn = document.getElementById('books-tab-btn');
const ordersTabBtn = document.getElementById('orders-tab-btn');
const feedbacksTabBtn = document.getElementById('feedbacks-tab-btn');
const booksSection = document.getElementById('books-section');
const ordersSection = document.getElementById('orders-section');
const feedbacksSection = document.getElementById('feedbacks-section');

booksTabBtn.addEventListener('click', () => showSection('books'));
ordersTabBtn.addEventListener('click', () => showSection('orders'));
feedbacksTabBtn.addEventListener('click', () => showSection('feedbacks'));

function showSection(section) {
  booksTabBtn.classList.remove('active');
  ordersTabBtn.classList.remove('active');
  feedbacksTabBtn.classList.remove('active');
  booksSection.classList.remove('active');
  ordersSection.classList.remove('active');
  feedbacksSection.classList.remove('active');
  booksSection.style.display = "none";
  ordersSection.style.display = "none";
  feedbacksSection.style.display = "none";

  if (section === 'books') {
    booksTabBtn.classList.add('active');
    booksSection.classList.add('active');
    booksSection.style.display = "";
    loadBooks();
  } else if (section === 'orders') {
    ordersTabBtn.classList.add('active');
    ordersSection.classList.add('active');
    ordersSection.style.display = "";
    loadOrders();
  } else if (section === 'feedbacks') {
    feedbacksTabBtn.classList.add('active');
    feedbacksSection.classList.add('active');
    feedbacksSection.style.display = "";
    loadFeedbacks();
  }
}

const bookForm = document.getElementById("book-form");
const bookIdInput = document.getElementById("book-id");
const bookTitleInput = document.getElementById("book-title");
const bookAuthorInput = document.getElementById("book-author");
const bookCategoryInput = document.getElementById("book-category");
const bookStockInput = document.getElementById("book-stock");
const bookPriceInput = document.getElementById("book-price");
const bookImageInput = document.getElementById("book-image");
const bookDescInput = document.getElementById("book-description");
const bookFormError = document.getElementById("book-form-error");
const bookCancelBtn = document.getElementById("book-cancel-btn");
const bookSaveBtn = document.getElementById("book-save-btn");
const booksTbody = document.getElementById("books-tbody");

let editingBookId = null;

bookForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  bookFormError.textContent = "";
  const name = bookTitleInput.value.trim();
  const author = bookAuthorInput.value.trim();
  const category = bookCategoryInput.value.trim();
  const stock = parseInt(bookStockInput.value, 10);
  const price = parseFloat(bookPriceInput.value);
  const imageUrl = bookImageInput.value.trim();
  const description = bookDescInput.value.trim();

  if (!name || !author || !category || isNaN(stock) || isNaN(price) || !imageUrl || !description) {
    bookFormError.textContent = "All fields are required.";
    return;
  }
  try {
    if (editingBookId) {
      await updateDoc(doc(db, "products", editingBookId), {
        name, author, category, stock, price, imageUrl, description
      });
      editingBookId = null;
      bookSaveBtn.textContent = "Add Book";
      bookCancelBtn.style.display = "none";
    } else {
      await addDoc(collection(db, "products"), {
        name, author, category, stock, price, imageUrl, description, created: serverTimestamp()
      });
    }
    bookForm.reset();
    loadBooks();
  } catch (err) {
    bookFormError.textContent = "Error saving book.";
  }
});

bookCancelBtn.addEventListener("click", () => {
  editingBookId = null;
  bookForm.reset();
  bookSaveBtn.textContent = "Add Book";
  bookCancelBtn.style.display = "none";
  bookFormError.textContent = "";
});

window.editBook = (id, data) => {
  editingBookId = id;
  bookIdInput.value = id;
  bookTitleInput.value = data.name;
  bookAuthorInput.value = data.author || "";
  bookCategoryInput.value = data.category;
  bookStockInput.value = data.stock;
  bookPriceInput.value = data.price;
  bookImageInput.value = data.imageUrl;
  bookDescInput.value = data.description;
  bookSaveBtn.textContent = "Update Book";
  bookCancelBtn.style.display = "";
  bookFormError.textContent = "";
};

window.deleteBook = async (id) => {
  if (!confirm("Delete this book?")) return;
  try {
    await deleteDoc(doc(db, "products", id));
    loadBooks();
  } catch (err) {
    alert("Error deleting book.");
  }
};

async function loadBooks() {
  booksTbody.innerHTML = "<tr><td colspan='8'>Loading...</td></tr>";
  const snapshot = await getDocs(collection(db, "products"));
  if (snapshot.empty) {
    booksTbody.innerHTML = "<tr><td colspan='8'>No books found.</td></tr>";
    return;
  }
  booksTbody.innerHTML = "";
  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    const id = docSnap.id;
    booksTbody.innerHTML += `
      <tr>
        <td>${d.name}</td>
        <td>${d.author || ""}</td>
        <td>${d.category}</td>
        <td>${d.stock}</td>
        <td>₱${d.price ? d.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits:2}) : "0.00"}</td>
        <td><img src="${d.imageUrl}" alt="${d.name}" style="max-width:60px;"></td>
        <td>${d.description}</td>
        <td>
          <span class="admin-action-btns">
            <button class="admin-edit-btn" title="Edit" onclick='editBook("${id}", ${JSON.stringify(d)})'>&#9998;</button>
            <button class="admin-delete-btn" title="Delete" onclick='deleteBook("${id}")'>&#128465;</button>
          </span>
        </td>
      </tr>
    `;
  });
}

const ordersTbody = document.getElementById("orders-tbody");
async function loadOrders() {
  ordersTbody.innerHTML = "<tr><td colspan='12'>Loading...</td></tr>";
  const snapshot = await getDocs(collection(db, "orders"));
  if (snapshot.empty) {
    ordersTbody.innerHTML = "<tr><td colspan='12'>No orders found.</td></tr>";
    return;
  }
  ordersTbody.innerHTML = "";
  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    const id = docSnap.id;

    let name = d.name || d.customerName || "";
    if (!name && Array.isArray(d.items) && d.items[0] && d.items[0].name) {
      name = d.items[0].name;
    }

    const contact = d.contact || "";
    const address = d.address || "";
    const createdAt = d.createdAt && typeof d.createdAt.toDate === "function"
      ? d.createdAt.toDate().toLocaleString()
      : (d.createdAt || (d.created && typeof d.created.toDate === "function" ? d.created.toDate().toLocaleString() : d.created || ""));
    let books = "";
    let shipping = 0;
    let subtotal = 0;
    let status = "";
    let total = 0;
    if (Array.isArray(d.items)) {
      books = d.items.map(item =>
        `${item.name || ""} x${item.quantity || 1}`
      ).join("<hr style='margin:3px 0'>");
      shipping = d.items[0]?.shipping || d.shipping || 0;
      subtotal = d.items[0]?.subtotal || d.subtotal || 0;
      status = d.items[0]?.status || d.status || '';
      total = d.items[0]?.total || d.total || 0;
    }
    ordersTbody.innerHTML += `
      <tr>
        <td>${id}</td>
        <td>${name}</td>
        <td>${contact}</td>
        <td>${address}</td>
        <td>${createdAt}</td>
        <td>${books}</td>
        <td>₱${Number(shipping).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
        <td>₱${Number(subtotal).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
        <td>₱${Number(total).toLocaleString(undefined,{minimumFractionDigits:2})}</td>
        <td>
          <select class="admin-status-dropdown" onchange="updateOrderStatus('${id}', this.value)">
            <option value="pending" ${status === "pending" ? "selected" : ""}>Pending</option>
            <option value="processing" ${status === "processing" ? "selected" : ""}>Processing</option>
            <option value="shipped" ${status === "shipped" ? "selected" : ""}>Shipped</option>
            <option value="delivered" ${status === "delivered" ? "selected" : ""}>Delivered</option>
            <option value="cancelled" ${status === "cancelled" ? "selected" : ""}>Cancelled</option>
          </select>
        </td>
        <td>
          <button class="admin-delete-btn" title="Delete" onclick="deleteOrder('${id}')">&#128465;</button>
        </td>
      </tr>
    `;
  });
}

window.updateOrderStatus = async (id, newStatus) => {
  try {
    await updateDoc(doc(db, "orders", id), { status: newStatus });
    loadOrders();
  } catch (err) {
    alert("Error updating order status.");
  }
};

window.deleteOrder = async (id) => {
  if (!confirm("Delete this order?")) return;
  try {
    await deleteDoc(doc(db, "orders", id));
    loadOrders();
  } catch (err) {
    alert("Error deleting order.");
  }
};

const feedbacksTbody = document.getElementById("feedbacks-tbody");
async function loadFeedbacks() {
  feedbacksTbody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";
  const snapshot = await getDocs(collection(db, "feedback"));
  if (snapshot.empty) {
    feedbacksTbody.innerHTML = "<tr><td colspan='4'>No feedbacks found.</td></tr>";
    return;
  }
  feedbacksTbody.innerHTML = "";
  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    let date = "—";
    if (d.created && typeof d.created.toDate === "function") {
      date = d.created.toDate().toLocaleString();
    }
    feedbacksTbody.innerHTML += `
      <tr>
        <td>${d.name || ""}</td>
        <td>${d.email || ""}</td>
        <td>${d.message || ""}</td>
        <td>${date}</td>
      </tr>
    `;
  });
}
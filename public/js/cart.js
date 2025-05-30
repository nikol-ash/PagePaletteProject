import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

const { jsPDF } = window.jspdf;

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
const db = getFirestore(app);
const auth = getAuth(app);

function setupHamburgerMenu() {
  const hamburger = document.querySelector('.hamburger-menu');
  const navLinks = document.querySelector('.hero-nav-links');
  if (!hamburger || !navLinks) return;
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('nav-open');
    hamburger.classList.toggle('open');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('nav-open');
      hamburger.classList.remove('open');
    });
  });
}
const loginLink = document.getElementById('login-link');
const logoutLink = document.getElementById('logout-link');
const userDisplay = document.getElementById('user-display');
const userInfoLi = document.getElementById('user-info-li');
function updateNavbar(user) {
  if (user) {
    loginLink.classList.add('hide');
    logoutLink.classList.remove('hide');
    userInfoLi.classList.remove('hide');
    let username = user.displayName || user.email || user.uid;
    if (username.length > 40) {
      username = username.slice(0,18) + '...' + username.slice(-10);
    }
    userDisplay.textContent = username;
    userDisplay.title = user.displayName || user.email || user.uid;
  } else {
    loginLink.classList.remove('hide');
    logoutLink.classList.add('hide');
    userInfoLi.classList.add('hide');
    userDisplay.textContent = '';
    userDisplay.title = '';
  }
}

const cartItemsContainer = document.getElementById('cart-items-container');
const cartTotalElem = document.getElementById('cart-total');
const cartCountElem = document.getElementById('cart-count');
const checkoutBtn = document.getElementById('checkout-btn');
const orderHistoryContainer = document.getElementById('order-history-container');
const checkoutForm = document.getElementById('checkout-form');
const checkoutName = document.getElementById('checkout-name');
const checkoutAddress = document.getElementById('checkout-address');
const checkoutContact = document.getElementById('checkout-contact');
const checkoutMessage = document.getElementById('checkout-message');

let currentUserId = null;
let currentCartDocId = null;
let currentCartData = null;
let cartTotalAmount = 0;

// --- CART COUNT LOGIC ---
async function updateCartCount(user) {
  if (!cartCountElem) return;
  if (!user) {
    let guestCart = [];
    try {
      guestCart = JSON.parse(localStorage.getItem("cart") || "[]");
    } catch (e) {}
    cartCountElem.textContent = guestCart.length || 0;
    return;
  }
  try {
    const cartsRef = collection(db, 'carts');
    const q = query(cartsRef, where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      cartCountElem.textContent = "0";
      return;
    }
    const cartData = snapshot.docs[0].data();
    if (Array.isArray(cartData.items)) {
      const totalQty = cartData.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      cartCountElem.textContent = totalQty;
    } else {
      cartCountElem.textContent = "0";
    }
  } catch (e) {
    cartCountElem.textContent = "0";
  }
}

logoutLink.addEventListener('click', (e) => {
  e.preventDefault();
  signOut(auth)
    .then(() => {
      window.location.reload();
    });
});

setupHamburgerMenu();

onAuthStateChanged(auth, async user => {
  updateNavbar(user);
  updateCartCount(user);
  if (user) {
    currentUserId = user.uid;
    await loadCart();
    await loadOrderHistory();
  } else {
    currentUserId = null;
    cartItemsContainer.innerHTML = `
      <div style="text-align:center;padding:2em;">
        <p style="font-size:1.2em;color:var(--accent-dark);font-weight:600;">
          You must login to see your cart.
        </p>
        <a href="login.html" class="shop-btn" style="margin-top:1.2em;display:inline-block;">Login/Register</a>
      </div>
    `;
    cartTotalElem.textContent = '';
    cartCountElem.textContent = '0';
    checkoutBtn.style.display = 'none';
    orderHistoryContainer.innerHTML = '<p style="text-align:center;">You must login to view your orders.</p>';
    checkoutForm.style.display = 'none';
  }
});

checkoutBtn.addEventListener('click', () => {
  checkoutForm.style.display = 'flex';
  checkoutMessage.textContent = '';
});

checkoutForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (
    !checkoutName.value.trim() ||
    !checkoutAddress.value.trim() ||
    !checkoutContact.value.trim()
  ) {
    checkoutMessage.textContent = "Please fill in all shipping information fields.";
    return;
  }
  const contactValue = checkoutContact.value.trim();
  if (!/^(\+?\d{7,15})$/.test(contactValue)) {
    checkoutMessage.textContent = "Please enter a valid contact number (7-15 digits, numbers only).";
    return;
  }
  try {
    const orderId = await saveOrderWithInfo(
      checkoutName.value.trim(),
      checkoutAddress.value.trim(),
      checkoutContact.value.trim()
    );
    await reduceStocks();
    await clearCart();
    await loadCart();
    await loadOrderHistory();
    checkoutForm.style.display = 'none';
    checkoutMessage.textContent = '';
    alert("Order placed successfully! Downloading your receipt PDF...");
    printReceiptPdf(orderId);
  } catch (error) {
    checkoutMessage.textContent = "Checkout failed: " + error.message;
    console.error(error);
  }
});

async function loadCart() {
  cartItemsContainer.innerHTML = 'Loading your cart...';
  cartTotalElem.textContent = '';
  cartCountElem.textContent = '0';
  checkoutBtn.style.display = 'none';
  checkoutForm.style.display = 'none';

  try {
    const cartsRef = collection(db, 'carts');
    const q = query(cartsRef, where('userId', '==', currentUserId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      cartItemsContainer.innerHTML = `
        <div style="text-align:center;padding:2em;">
          <p style="font-size:1.15em;color:var(--primary);font-weight:500;">
            No items in your cart yet.
          </p>
          <a href="shop.html" class="shop-btn" style="margin-top:1.2em;display:inline-block;">Browse Shop</a>
        </div>
      `;
      currentCartDocId = null;
      currentCartData = null;
      return;
    }

    const cartDoc = querySnapshot.docs[0];
    currentCartDocId = cartDoc.id;
    currentCartData = cartDoc.data();

    if (!currentCartData.items || currentCartData.items.length === 0) {
      cartItemsContainer.innerHTML = `
        <div style="text-align:center;padding:2em;">
          <p style="font-size:1.15em;color:var(--primary);font-weight:500;">
            No items in your cart yet.
          </p>
          <a href="shop.html" class="shop-btn" style="margin-top:1.2em;display:inline-block;">Browse Shop</a>
        </div>
      `;
      return;
    }

    const productIds = currentCartData.items.map(i => i.productId);
    const productsRef = collection(db, 'products');

    let products = [];
    const batchSize = 10;
    for (let i = 0; i < productIds.length; i += batchSize) {
      const batchIds = productIds.slice(i, i + batchSize);
      const prodQuery = query(productsRef, where('__name__', 'in', batchIds));
      const prodSnapshot = await getDocs(prodQuery);
      prodSnapshot.forEach(docSnap => products.push({ id: docSnap.id, ...docSnap.data() }));
    }

    const productMap = {};
    products.forEach(p => productMap[p.id] = p);

    cartItemsContainer.innerHTML = '';
    let totalAmount = 0;
    let totalQuantity = 0;

    currentCartData.items.forEach((item, index) => {
      const product = productMap[item.productId];
      if (!product) return;

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;
      totalQuantity += item.quantity;

      const div = document.createElement('div');
      div.className = 'cart-item';

      div.innerHTML = `
        <img src="${product.imageUrl}" alt="${product.name}" />
        <div class="cart-details">
          <h3>${product.name}</h3>
          <p>${product.description || ""}</p>
          <p>Price: ₱${product.price.toFixed(2)}</p>
          <div class="cart-quantity">
            <button class="quantity-btn minus-btn" data-index="${index}">−</button>
            <span>Quantity: <strong>${item.quantity}</strong></span>
            <button class="quantity-btn plus-btn" data-index="${index}">+</button>
            <button class="remove-btn" data-index="${index}">Remove</button>
          </div>
          <p>Item Total: ₱${itemTotal.toFixed(2)}</p>
        </div>
      `;

      cartItemsContainer.appendChild(div);
    });

    let shippingFee = 0;
    if (totalAmount < 500 && totalAmount > 0) shippingFee = 65;

    cartTotalElem.innerHTML = `
      <div>Total Items: ${totalQuantity}</div>
      <div>Subtotal: ₱${totalAmount.toFixed(2)}</div>
      <div>Shipping: <b>₱${shippingFee.toFixed(2)}</b> ${shippingFee === 0 ? "(FREE for orders ₱500+)" : ""}</div>
      <div style="font-size:1.18em;font-weight:bold;margin-top:7px;">
        Total: ₱${(totalAmount+shippingFee).toFixed(2)}
      </div>
    `;
    cartCountElem.textContent = totalQuantity;
    checkoutBtn.style.display = 'block';
    cartTotalAmount = totalAmount;

    cartItemsContainer.querySelectorAll('.plus-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +e.target.dataset.index;
        updateQuantity(idx, 1);
      });
    });
    cartItemsContainer.querySelectorAll('.minus-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +e.target.dataset.index;
        updateQuantity(idx, -1);
      });
    });
    cartItemsContainer.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = +e.target.dataset.index;
        removeItem(idx);
      });
    });

  } catch (err) {
    console.error('Error loading cart:', err);
    cartItemsContainer.innerHTML = '<p>Error loading cart. Please try again later.</p>';
  }
}

async function updateQuantity(index, delta) {
  if (!currentCartData || !currentCartDocId) return;
  let items = [...currentCartData.items];
  let item = items[index];
  if (!item) return;

  let newQty = item.quantity + delta;
  if (newQty < 1) return;

  const prodSnap = await getDoc(doc(db, 'products', item.productId));
  if (!prodSnap.exists()) return;
  const stock = prodSnap.data().stock || 0;
  if (newQty > stock) {
    alert("Quantity exceeds available stock.");
    return;
  }

  items[index].quantity = newQty;
  await updateDoc(doc(db, 'carts', currentCartDocId), { items });
  currentCartData.items = items;
  await loadCart();
}

async function removeItem(index) {
  if (!currentCartData || !currentCartDocId) return;
  let items = [...currentCartData.items];
  items.splice(index, 1);
  await updateDoc(doc(db, 'carts', currentCartDocId), { items });
  currentCartData.items = items;
  await loadCart();
}

async function saveOrderWithInfo(name, address, contact) {
  if (!currentCartData) throw new Error("No cart data.");
  let shippingFee = cartTotalAmount < 500 && cartTotalAmount > 0 ? 65 : 0;
  const orderData = {
    userId: currentUserId,
    items: currentCartData.items,
    createdAt: serverTimestamp(),
    name,
    address,
    contact,
    subtotal: cartTotalAmount,
    shipping: shippingFee,
    total: cartTotalAmount + shippingFee
  };
  const ordersCol = collection(db, 'orders');
  const orderRef = await addDoc(ordersCol, orderData);
  return orderRef.id;
}

async function reduceStocks() {
  if (!currentCartData) return;
  for (const item of currentCartData.items) {
    const productRef = doc(db, 'products', item.productId);
    const prodSnap = await getDoc(productRef);
    if (!prodSnap.exists()) continue;
    const currentStock = prodSnap.data().stock || 0;
    const newStock = Math.max(0, currentStock - item.quantity);
    await updateDoc(productRef, { stock: newStock });
  }
}

async function clearCart() {
  if (!currentCartDocId) return;
  await updateDoc(doc(db, 'carts', currentCartDocId), { items: [] });
  currentCartData.items = [];
}

async function loadOrderHistory() {
  orderHistoryContainer.innerHTML = 'Loading order history...';

  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('userId', '==', currentUserId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      orderHistoryContainer.innerHTML = '<p>You have no past orders.</p>';
      return;
    }

    let html = '<ul class="order-history-list">';
    for (const orderDoc of querySnapshot.docs) {
      const order = orderDoc.data();
      const ts = order.createdAt 
        ? (typeof order.createdAt.toDate === 'function' 
            ? order.createdAt.toDate().toLocaleString() 
            : new Date(order.createdAt).toLocaleString())
        : "Unknown date";
      let statusText = "Pending";
      if (order.status) {
        statusText = String(order.status).charAt(0).toUpperCase() + String(order.status).slice(1);
      }
      let orderHtml = `<li>
        <strong>Order ID:</strong> ${orderDoc.id}<br />
        <strong>Date:</strong> ${ts}<br />
        <strong>Status:</strong> <span class="order-status">${statusText}</span><br />
        <strong>Name:</strong> ${order.name || ""}<br />
        <strong>Address:</strong> ${order.address || ""}<br />
        <strong>Contact:</strong> ${order.contact || ""}<br />
        <strong>Subtotal:</strong> ₱${(order.subtotal||0).toFixed(2)}<br />
        <strong>Shipping:</strong> ₱${(order.shipping||0).toFixed(2)}<br />
        <strong>Total:</strong> ₱${(order.total||0).toFixed(2)}<br />
        <strong>Items:</strong>
        <ul>`;
      if (order.items && order.items.length) {
        for (const item of order.items) {
          const prodSnap = await getDoc(doc(db, 'products', item.productId));
          const prodName = prodSnap.exists() ? prodSnap.data().name : "Unknown Product";
          orderHtml += `<li>${prodName} — Quantity: ${item.quantity}</li>`;
        }
      }
      orderHtml += `</ul></li>`;
      html += orderHtml;
    }
    html += '</ul>';
    orderHistoryContainer.innerHTML = html;

  } catch (err) {
    console.error('Error loading order history:', err);
    orderHistoryContainer.innerHTML = '<p>Error loading order history. Please try again later.</p>';
  }
}

async function printReceiptPdf(orderId) {
  try {
    if (!orderId) throw new Error("No order ID provided.");
    const orderSnap = await getDoc(doc(db, 'orders', orderId));
    if (!orderSnap.exists()) throw new Error("Order not found.");
    const order = orderSnap.data();
    const docPdf = new jsPDF();

    const accent = "#d47fa6";
    const accentDark = "#ad5c8f";
    const brown = "#6d4c41";
    const secondary = "#fff5f8";

    
    docPdf.setFillColor(accent); 
    docPdf.rect(0, 0, 210, 28, "F");
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(20);
    docPdf.setTextColor(255, 255, 255); 
    docPdf.text("Page Palette Receipt", 14, 20);

    docPdf.setFontSize(12);
    docPdf.setTextColor(brown);
    docPdf.setFillColor(secondary);
    docPdf.roundedRect(10, 32, 190, 30, 3, 3, "F");
    docPdf.setFont("helvetica", "normal");
    docPdf.text(`Order ID: ${orderId}`, 14, 41);
    docPdf.text(`Date: ${(new Date()).toLocaleString()}`, 14, 48);
    docPdf.text(`Name: ${order.name || ""}`, 80, 41);
    docPdf.text(`Contact: ${order.contact || ""}`, 80, 48);
    docPdf.text(`Address: ${order.address || ""}`, 14, 55);

    let yPos = 68;

    docPdf.setFillColor(accentDark);
    docPdf.setTextColor(255,255,255);
    docPdf.setFont("helvetica", "bold");
    docPdf.rect(10, yPos, 190, 10, "F");
    docPdf.text("Product", 14, yPos + 7);
    docPdf.text("Qty", 110, yPos + 7);
    docPdf.text("Price", 130, yPos + 7);
    docPdf.text("Total", 160, yPos + 7);
    yPos += 13;
    docPdf.setFont("helvetica", "normal");
    docPdf.setTextColor(brown);

    for (const item of order.items) {
      if (yPos > 260) {
        docPdf.addPage();
        yPos = 20;
      }
      const prodSnap = await getDoc(doc(db, 'products', item.productId));
      const product = prodSnap.exists() ? prodSnap.data() : { name: "Unknown Product", price: 0 };
      const price = product.price || 0;
      const total = price * item.quantity;
      docPdf.setFillColor(secondary);
      docPdf.rect(10, yPos - 6, 190, 9, "F");
      docPdf.text(product.name, 14, yPos);
      docPdf.text(item.quantity.toString(), 110, yPos);
      docPdf.text(`₱${price.toFixed(2)}`, 130, yPos);
      docPdf.text(`₱${total.toFixed(2)}`, 160, yPos);
      yPos += 10;
    }

    yPos += 4;
    docPdf.setDrawColor(accentDark);
    docPdf.line(10, yPos, 200, yPos);
    yPos += 6;

    docPdf.setFont("helvetica", "bold");
    docPdf.setTextColor(accentDark);
    docPdf.text(`Subtotal: ₱${(order.subtotal||0).toFixed(2)}`, 140, yPos);
    yPos += 7;
    docPdf.text(`Shipping: ₱${(order.shipping||0).toFixed(2)}`, 140, yPos);
    yPos += 7;
    docPdf.setFontSize(15);
    docPdf.text(`Total: ₱${(order.total||0).toFixed(2)}`, 140, yPos + 5);

    docPdf.setFontSize(10);
    docPdf.setFont("helvetica", "italic");
    docPdf.setTextColor(accentDark);
    docPdf.text("Thank you for your purchase at Page Palette!", 14, 285);

    docPdf.save(`PagePalette_Receipt_${orderId}.pdf`);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("Failed to generate PDF receipt.");
  }
}
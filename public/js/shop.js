import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, addDoc, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

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

let currentUserId = null;

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

function setupNavbarAuth() {
  const loginLink = document.getElementById('login-link');
  const logoutLink = document.getElementById('logout-link');
  const userDisplay = document.getElementById('user-display');
  const userInfoLi = document.getElementById('user-info-li');
  onAuthStateChanged(auth, (user) => {
    if (loginLink && logoutLink && userInfoLi && userDisplay) {
      if (user) {
        currentUserId = user.uid;
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
        currentUserId = null;
        loginLink.classList.remove('hide');
        logoutLink.classList.add('hide');
        userInfoLi.classList.add('hide');
        userDisplay.textContent = '';
        userDisplay.title = '';
      }
    }
    updateCartCount();
  });

  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      signOut(auth)
        .then(() => {
          window.location.reload();
        });
    });
  }
}

async function updateCartCount() {
  const cartCountSpan = document.getElementById('cart-count');
  if (!cartCountSpan) return;
  if (!currentUserId) {
    let guestCart = [];
    try {
      guestCart = JSON.parse(localStorage.getItem("cart") || "[]");
    } catch (e) {}
    cartCountSpan.textContent = guestCart.length || 0;
    return;
  }
  try {
    const cartsRef = collection(db, 'carts');
    const q = query(cartsRef, where('userId', '==', currentUserId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      cartCountSpan.textContent = "0";
      return;
    }
    const cartData = snapshot.docs[0].data();
    if (Array.isArray(cartData.items)) {
      const totalQty = cartData.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      cartCountSpan.textContent = totalQty;
    } else {
      cartCountSpan.textContent = "0";
    }
  } catch (e) {
    cartCountSpan.textContent = "0";
  }
}

let allCategories = [];
const categorySelect = document.getElementById('category-select');
const searchForm = document.querySelector('.shop-search-form');
const searchInput = document.getElementById('shop-search-input');
const noProducts = document.getElementById('no-products');

async function loadCategories() {
  const productsRef = collection(db, 'products');
  const snapshot = await getDocs(productsRef);

  const categoriesSet = new Set();
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.category) categoriesSet.add(data.category);
  });

  allCategories = Array.from(categoriesSet);

  while (categorySelect.options.length > 1) {
    categorySelect.remove(1);
  }
  allCategories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    categorySelect.appendChild(option);
  });
}

function groupBooksByCategory(docs) {
  const categoryMap = {};
  docs.forEach(docSnap => {
    const data = docSnap.data();
    if (!categoryMap[data.category]) categoryMap[data.category] = [];
    categoryMap[data.category].push(docSnap);
  });
  return categoryMap;
}

function removeDuplicateBooks(docs) {
  const seen = new Set();
  return docs.filter(docSnap => {
    const data = docSnap.data();
    const key = (data.name ? data.name.trim().toLowerCase() : "") + "|" + (data.author ? data.author.trim().toLowerCase() : "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function loadProducts(category = 'all', search = "") {
  const productsGrid = document.querySelector('.products-grid');
  productsGrid.innerHTML = '';
  noProducts.style.display = "none";

  const productsRef = collection(db, 'products');
  const snapshot = await getDocs(productsRef);

  let filteredDocs = snapshot.docs;

  if (search && search.trim()) {
    const lowered = search.trim().toLowerCase();
    filteredDocs = filteredDocs.filter(docSnap => {
      const data = docSnap.data();
      return (
        (data.name && data.name.toLowerCase().includes(lowered)) ||
        (data.author && data.author.toLowerCase().includes(lowered)) ||
        (data.description && data.description.toLowerCase().includes(lowered)) ||
        (data.category && data.category.toLowerCase().includes(lowered))
      );
    });
  }

  if (category !== 'all') {
    filteredDocs = filteredDocs.filter(docSnap => {
      const data = docSnap.data();
      return data.category && data.category.toLowerCase() === category.toLowerCase();
    });
  }

  filteredDocs = removeDuplicateBooks(filteredDocs);

  if (!filteredDocs.length) {
    noProducts.style.display = "block";
    return;
  }

  if (category === 'all') {
    const grouped = groupBooksByCategory(filteredDocs);
    allCategories.forEach(cat => {
      const books = grouped[cat];
      if (books && books.length) {
        const catHeader = document.createElement('div');
        catHeader.className = 'category-label-separator';
        catHeader.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        productsGrid.appendChild(catHeader);

        const catBooksRow = document.createElement('div');
        catBooksRow.className = 'category-books-row';
        books.forEach(docSnap => {
          catBooksRow.appendChild(createProductCard(docSnap));
        });
        productsGrid.appendChild(catBooksRow);
      }
    });
  } else {
    const catBooksRow = document.createElement('div');
    catBooksRow.className = 'category-books-row';
    filteredDocs.forEach(docSnap => {
      catBooksRow.appendChild(createProductCard(docSnap));
    });
    productsGrid.appendChild(catBooksRow);
  }

  setupButtons();
}

function createProductCard(docSnap) {
  const data = docSnap.data();
  const productId = docSnap.id;
  const stock = data.stock ?? 0;

  const productCard = document.createElement('div');
  productCard.className = 'product-card';
  productCard.setAttribute('data-id', productId);
  productCard.setAttribute('data-stock', stock);

  productCard.innerHTML = `
    <img src="${data.imageUrl}" alt="${data.name}" class="product-image" />
    <div class="product-info-always">
      <div class="product-title-always" title="${data.name}">${data.name}</div>
      <div class="product-author-always" title="${data.author || ""}">${data.author ? 'by ' + data.author : ''}</div>
    </div>
    <div class="product-hover-info">
      <div class="product-title">${data.name}</div>
      <div class="product-author">${data.author ? 'by ' + data.author : ''}</div>
      <div class="product-description">
        ${data.description ? data.description : ""}
      </div>
      <div class="product-price">₱${parseFloat(data.price).toFixed(2)}</div>
      <div class="product-stock">In stock: <span class="stock-number">${stock}</span></div>
      <div class="product-actions">
        <button class="add-to-cart-btn">Add to Cart</button>
        <button class="buy-now-btn">Buy Now</button>
      </div>
    </div>
  `;

  return productCard;
}

function setupButtons() {
  document.querySelectorAll('.product-card').forEach(card => {
    const addToCartBtn = card.querySelector('.add-to-cart-btn');
    const buyNowBtn = card.querySelector('.buy-now-btn');
    const stock = parseInt(card.getAttribute('data-stock'));
    const productId = card.getAttribute('data-id');

    addToCartBtn.onclick = async () => {
      if (!currentUserId) {
        alert('Please log in to add to cart.');
        return;
      }
      if (stock <= 0) {
        alert('Sorry, this product is out of stock.');
        return;
      }

      try {
        const cartsRef = collection(db, 'carts');
        const q = query(cartsRef, where('userId', '==', currentUserId));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          await addDoc(cartsRef, {
            userId: currentUserId,
            items: [{ productId, quantity: 1 }]
          });
        } else {
          const cartDoc = querySnapshot.docs[0];
          const cartData = cartDoc.data();

          const existingIndex = cartData.items.findIndex(item => item.productId === productId);
          if (existingIndex >= 0) {
            cartData.items[existingIndex].quantity += 1;
          } else {
            cartData.items.push({ productId, quantity: 1 });
          }

          await updateDoc(doc(db, 'carts', cartDoc.id), { items: cartData.items });
        }

        alert('Added to cart!');
        await updateCartCount();
      } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Failed to add to cart.');
      }
    };

    buyNowBtn.onclick = async () => {
      if (!currentUserId) {
        alert('Please log in to buy now.');
        return;
      }
      await addToCartBtn.onclick();
      setTimeout(() => {
        window.location.href = 'cart.html';
      }, 300);
    };
  });
}

function getSearchParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('search') || '';
}

function getCategoryParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get('category') || 'all';
}

categorySelect.addEventListener('change', async () => {
  const selectedCategory = categorySelect.value;
  await loadProducts(selectedCategory, searchInput.value);
});

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await loadProducts(categorySelect.value, searchInput.value);
});

searchInput.addEventListener('input', async () => {
  await loadProducts(categorySelect.value, searchInput.value);
});

document.addEventListener('DOMContentLoaded', async () => {
  setupHamburgerMenu();
  setupNavbarAuth();
  await loadCategories();


  const bookTitle = getSearchParam();
  const urlCategory = getCategoryParam();

  searchInput.value = bookTitle;
  categorySelect.value = urlCategory;

  if (bookTitle || (urlCategory && urlCategory !== "all")) {
    await loadProducts(urlCategory, bookTitle);
  } else {
    await loadProducts();
  }
});
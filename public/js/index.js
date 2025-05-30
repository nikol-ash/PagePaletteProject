import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

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

async function updateCartCount(user) {
  const cartCountSpan = document.getElementById('cart-count');
  if (!cartCountSpan) return;
  if (!user) {
    let guestCart = [];
    try {
      guestCart = JSON.parse(localStorage.getItem("cart") || "[]");
    } catch (e) {}
    cartCountSpan.textContent = guestCart.length || 0;
    return;
  }
  try {
    const cartsRef = collection(db, 'carts');
    const q = query(cartsRef, where('userId', '==', user.uid));
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

async function fetchBooks() {
  const productsCol = collection(db, "products");
  const productSnapshot = await getDocs(productsCol);
  const books = [];
  productSnapshot.forEach((doc) => {
    const data = doc.data();
    books.push({
      id: doc.id,
      name: data.name,
      author: data.author,
      imageUrl: data.imageUrl
    });
  });
  return books;
}

function createBookCard(book, active = false) {
  const card = document.createElement('div');
  card.className = 'book-card' + (active ? ' active' : '');
  card.tabIndex = 0;
  const img = document.createElement('img');
  img.src = book.imageUrl;
  img.alt = `${book.name} Book Cover`;
  const info = document.createElement('div');
  info.className = 'book-info';
  const title = document.createElement('h2');
  title.textContent = book.name;
  const author = document.createElement('span');
  author.className = 'author';
  author.textContent = book.author ? book.author.replace(/"/g, "") : "";
  info.appendChild(title);
  info.appendChild(author);
  card.appendChild(img);
  card.appendChild(info);
  return card;
}

async function renderBookStack() {
  const bookStack = document.getElementById('book-stack');
  if (!bookStack) return;
  bookStack.innerHTML = '';
  const books = await fetchBooks();

  const cards = books.map((book, idx) => createBookCard(book, idx === 0));
  cards.forEach(card => bookStack.appendChild(card));

  let current = 0;

  function showNextBook() {
    cards[current].classList.remove('active');
    cards[current].classList.add('animate-out');
    cards[current].removeEventListener('click', showNextBook);

    const next = (current + 1) % cards.length;

    setTimeout(() => {
      bookStack.appendChild(cards[current]);
      cards[current].classList.remove('animate-out');
      current = next;
      cards[current].classList.add('active');
      cards.forEach((c, i) => {
        if (i === current) {
          c.style.pointerEvents = 'auto';
          c.tabIndex = 0;
          c.addEventListener('click', showNextBook);
        } else {
          c.style.pointerEvents = 'none';
          c.tabIndex = -1;
          c.removeEventListener('click', showNextBook);
        }
      });
    }, 650);
  }

  cards.forEach((card, i) => {
    if (i === 0) {
      card.classList.add('active');
      card.addEventListener('click', showNextBook);
      card.style.pointerEvents = 'auto';
      card.tabIndex = 0;
    } else {
      card.style.pointerEvents = 'none';
      card.tabIndex = -1;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderBookStack();
  setupHamburgerMenu();

  const searchForm = document.querySelector('.isbn-search');
  const searchInput = document.getElementById('isbn-input');
  if (searchForm && searchInput) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const keyword = searchInput.value.trim();
      if (keyword) {
        window.location.href = `shop.html?search=${encodeURIComponent(keyword)}`;
      }
    });
    document.getElementById('isbn-search-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      const keyword = searchInput.value.trim();
      if (keyword) {
        window.location.href = `shop.html?search=${encodeURIComponent(keyword)}`;
      }
    });
  }

  document.querySelectorAll('.category-btn[data-category]').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const cat = this.getAttribute('data-category');
      if (cat) {
        window.location.href = `shop.html?category=${encodeURIComponent(cat)}`;
      }
    });
  });

  document.querySelectorAll('.category-label').forEach(label => {
    label.addEventListener('click', function(e) {
      const cat = this.textContent.trim();
      if (cat) {
        window.location.href = `shop.html?category=${encodeURIComponent(cat)}`;
      }
    });
    label.style.cursor = "pointer";
    label.setAttribute("tabindex", "0");
    label.setAttribute("role", "button");
    label.setAttribute("aria-pressed", "false");
    label.addEventListener("keydown", function(e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const cat = this.textContent.trim();
        if (cat) {
          window.location.href = `shop.html?category=${encodeURIComponent(cat)}`;
        }
      }
    });
  });

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

  onAuthStateChanged(auth, (user) => {
    updateNavbar(user);
    updateCartCount(user);
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

  setTimeout(() => {
    document.querySelectorAll('.category-btn[data-category]').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const cat = this.getAttribute('data-category');
        if (cat) {
          window.location.href = `shop.html?category=${encodeURIComponent(cat)}`;
        }
      });
    });
    document.querySelectorAll('.category-label').forEach(label => {
      label.style.cursor = "pointer";
      label.setAttribute("tabindex", "0");
      label.setAttribute("role", "button");
      label.setAttribute("aria-pressed", "false");
      label.addEventListener('click', function(e) {
        const cat = this.textContent.trim();
        if (cat) {
          window.location.href = `shop.html?category=${encodeURIComponent(cat)}`;
        }
      });
      label.addEventListener("keydown", function(e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const cat = this.textContent.trim();
          if (cat) {
            window.location.href = `shop.html?category=${encodeURIComponent(cat)}`;
          }
        }
      });
    });
  }, 0);
});
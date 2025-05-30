import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
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

document.addEventListener('DOMContentLoaded', () => {
  setupHamburgerMenu();

  const loginLink = document.getElementById('login-link');
  const logoutLink = document.getElementById('logout-link');
  const userDisplay = document.getElementById('user-display');
  const userInfoLi = document.getElementById('user-info-li');

  function updateNavbar(user) {
    if (loginLink && logoutLink && userInfoLi && userDisplay) {
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
});

const feedbackForm = document.querySelector('.feedback-form');
if (feedbackForm) {
  feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = feedbackForm['feedback-name'].value.trim();
    const email = feedbackForm['feedback-email'].value.trim();
    const message = feedbackForm['feedback-message'].value.trim();

    if (!name || !email || !message) {
      alert('Please fill in all fields.');
      return;
    }

    try {
      await addDoc(collection(db, "feedback"), {
        name,
        email,
        message
      });
      feedbackForm.reset();
      alert('Thank you for your feedback!');
    } catch (error) {
      console.error("Error submitting feedback: ", error);
      alert('Sorry, there was an error submitting your feedback. Please try again.');
    }
  });
}
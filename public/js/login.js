import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail
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
const auth = getAuth(app);


onAuthStateChanged(auth, (user) => {
  if (user && user.email === "ashleyparuli11@gmail.com") {
    window.location.href = "admin.html";
  }
});


function tryAdminRedirect(user) {
  if (user && user.email === "ashleyparuli11@gmail.com") {
    window.location.href = "admin.html";
    return true;
  }
  return false;
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
setupHamburgerMenu();


const header = document.querySelector("header .hero-navbar");
const showUserBanner = (user) => {
  let userBanner = document.getElementById("login-user-banner");
  if (user) {
    if (!userBanner) {
      userBanner = document.createElement("div");
      userBanner.id = "login-user-banner";
      userBanner.style.textAlign = "center";
      userBanner.style.margin = "0.8em 0";
      userBanner.style.fontWeight = "600";
      userBanner.style.color = "var(--accent-dark)";
      header.parentNode.insertBefore(userBanner, header.nextSibling);
    }
    let username = user.displayName || user.email || user.uid;
    if (username.length > 40) username = username.slice(0,18) + '...' + username.slice(-10);
    userBanner.innerHTML = `Logged in as <span style="color:var(--accent);">${username}</span>`;
  } else if (userBanner) {
    userBanner.parentNode.removeChild(userBanner);
  }
};
onAuthStateChanged(auth, (user) => {
  showUserBanner(user);
});


const loginTabBtn = document.getElementById('login-tab-btn');
const registerTabBtn = document.getElementById('register-tab-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const forgotForm = document.getElementById('forgot-form');
const loginCard = document.querySelector('.login-card-pop');

loginTabBtn.addEventListener('click', () => {
  loginTabBtn.classList.add('active');
  registerTabBtn.classList.remove('active');
  loginForm.classList.add('active');
  loginForm.style.display = '';
  registerForm.classList.remove('active');
  registerForm.style.display = 'none';
  forgotForm.classList.remove('active');
  forgotForm.style.display = 'none';
});

registerTabBtn.addEventListener('click', () => {
  loginTabBtn.classList.remove('active');
  registerTabBtn.classList.add('active');
  loginForm.classList.remove('active');
  loginForm.style.display = 'none';
  registerForm.classList.add('active');
  registerForm.style.display = '';
  forgotForm.classList.remove('active');
  forgotForm.style.display = 'none';
});


document.getElementById('forgot-password-link').addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.style.display = 'none';
  loginForm.classList.remove('active');
  registerForm.style.display = 'none';
  registerForm.classList.remove('active');
  forgotForm.style.display = '';
  forgotForm.classList.add('active');
  document.getElementById('forgot-error').textContent = '';
  document.getElementById('forgot-email').value = '';
});

forgotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const forgotEmail = document.getElementById('forgot-email').value.trim();
  const forgotError = document.getElementById('forgot-error');
  forgotError.textContent = '';
  if (!forgotEmail) {
    forgotError.textContent = "Please enter your email.";
    return;
  }
  try {
    await sendPasswordResetEmail(auth, forgotEmail);
    forgotError.style.color = "var(--accent-dark)";
    forgotError.textContent = "Reset email sent! Please check your inbox.";
  } catch (error) {
    forgotError.style.color = "#c94e5e";
    forgotError.textContent = error.code === "auth/user-not-found"
      ? "No user found with that email."
      : "Failed to send reset email. Please try again.";
  }
});


loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById('login-error').textContent = '';
  const loginInput = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  if (!loginInput) {
    document.getElementById('login-error').textContent = "Please enter your username or email.";
    return;
  }
  let email = loginInput;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (userCredential.user.email === "ashleyparuli11@gmail.com") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "index.html";
    }
  } catch (error) {
    document.getElementById('login-error').textContent =
      (error.code === "auth/user-not-found" || error.code === "auth/invalid-email")
        ? "No user found with that email."
        : error.code === "auth/wrong-password"
        ? "Incorrect password."
        : "Failed to log in. Please check your credentials.";
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  document.getElementById('register-error').textContent = '';
  const username = document.getElementById('register-username').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;

  if (!username || !email || !password) {
    document.getElementById('register-error').textContent = "All fields are required.";
    return;
  }
  if (password.length < 6) {
    document.getElementById('register-error').textContent = "Password must be at least 6 characters.";
    return;
  }
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: username });
    await signOut(auth);

    loginTabBtn.classList.add('active');
    registerTabBtn.classList.remove('active');
    loginForm.classList.add('active');
    loginForm.style.display = '';
    registerForm.classList.remove('active');
    registerForm.style.display = 'none';
    forgotForm.classList.remove('active');
    forgotForm.style.display = 'none';
    document.getElementById('register-error').textContent = "";
    
    const msg = document.createElement('div');
    msg.style.textAlign = "center";
    msg.style.color = "var(--accent-dark)";
    msg.style.fontWeight = "600";
    msg.style.margin = "1em 0";
    msg.textContent = "Registration successful! Please log in.";
    loginForm.parentNode.insertBefore(msg, loginForm);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    document.getElementById('register-error').textContent =
      error.code === "auth/email-already-in-use"
        ? "Email is already in use."
        : "Failed to register. Please check your details.";
  }
});


document.getElementById('google-login-btn').addEventListener('click', async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    if (tryAdminRedirect(result.user)) return;
    window.location.href = "index.html";
  } catch (error) {
    alert("Google login failed.");
  }
});

const loginPwInput = document.getElementById('login-password');
const showLoginPwBtn = document.getElementById('show-login-password');
showLoginPwBtn.addEventListener('click', function () {
  if (loginPwInput.type === 'password') {
    loginPwInput.type = 'text';
    showLoginPwBtn.classList.add('showing');
  } else {
    loginPwInput.type = 'password';
    showLoginPwBtn.classList.remove('showing');
  }
});


const registerPwInput = document.getElementById('register-password');
const showRegisterPwBtn = document.getElementById('show-register-password');
showRegisterPwBtn.addEventListener('click', function () {
  if (registerPwInput.type === 'password') {
    registerPwInput.type = 'text';
    showRegisterPwBtn.classList.add('showing');
  } else {
    registerPwInput.type = 'password';
    showRegisterPwBtn.classList.remove('showing');
  }
});
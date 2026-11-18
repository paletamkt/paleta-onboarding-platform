// js/auth.js
import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (user) await redirecionarPorPerfil(user);
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim();
  const senha = document.getElementById("senha").value;
  const btn = document.getElementById("btnLogin");
  const errEl = document.getElementById("loginError");

  btn.disabled = true;
  btn.textContent = "Entrando...";
  errEl.classList.add("hidden");

  try {
    const cred = await signInWithEmailAndPassword(auth, email, senha);
    await redirecionarPorPerfil(cred.user);
  } catch {
    errEl.textContent = "E-mail ou senha incorretos.";
    errEl.classList.remove("hidden");
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
});

async function redirecionarPorPerfil(user) {
  // 1. Editor?
  const editorDoc = await getDoc(doc(db, "editores", user.uid));
  if (editorDoc.exists()) { window.location.href = "/editor.html"; return; }

  // 2. CS?
  const csDoc = await getDoc(doc(db, "cs", user.uid));
  if (csDoc.exists()) { window.location.href = "/cs.html"; return; }

  // 3. Cliente?
  const clienteDoc = await getDoc(doc(db, "clientes", user.uid));
  if (clienteDoc.exists()) { window.location.href = "/cliente.html"; return; }

  // Perfil não encontrado
  await auth.signOut();
  const errEl = document.getElementById("loginError");
  if (errEl) {
    errEl.textContent = "Perfil não encontrado. Contate a Paleta.";
    errEl.classList.remove("hidden");
  }
}

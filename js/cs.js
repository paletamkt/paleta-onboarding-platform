// js/cs.js — visão da CS (Júlia)

import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, getDoc, addDoc, updateDoc,
  collection, getDocs, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const STATUS_LABEL = {
  nao_iniciado: "Não iniciado", em_andamento: "Em andamento",
  aguardando_cliente: "Aguardando cliente", em_revisao: "Em revisão",
  concluido: "Concluído", atrasado: "Atrasado"
};

let csUID = null;
let csNome = "CS";
let clienteAtualUID = null;

// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "/index.html"; return; }

  const csDoc = await getDoc(doc(db, "cs", user.uid));
  if (!csDoc.exists()) { window.location.href = "/index.html"; return; }

  csUID = user.uid;
  csNome = csDoc.data()?.nome || "CS";
  document.getElementById("nomeCS").textContent = csNome;

  carregarClientes();
});

document.getElementById("btnSair").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/index.html";
});

// ============================================================
// VIEWS
// ============================================================

function mostrarView(id) {
  document.querySelectorAll(".view").forEach(v => { v.classList.add("hidden"); v.classList.remove("fade-in"); });
  const el = document.getElementById(id);
  el.classList.remove("hidden");
  requestAnimationFrame(() => el.classList.add("fade-in"));
}

// ============================================================
// LISTA DE CLIENTES
// ============================================================

async function carregarClientes() {
  window.history.replaceState({}, "", "/cs/lista");
  mostrarView("viewLista");
  const grid = document.getElementById("clientesGrid");
  const loading = document.getElementById("loadingLista");
  const empty = document.getElementById("emptyLista");

  grid.innerHTML = "";
  loading.classList.remove("hidden");
  empty.classList.add("hidden");

  try {
    const snap = await getDocs(query(collection(db, "clientes"), orderBy("criadoEm")));
    loading.classList.add("hidden");

    const docs = snap.docs.filter(d => !d.data().clientePrincipalUID);
    if (docs.length === 0) { empty.classList.remove("hidden"); return; }

    docs.forEach(async (docSnap, i) => {
      const data = docSnap.data();
      const pct = await calcularProgresso(docSnap.id);
      const card = criarClienteCard(docSnap.id, data, pct);
      card.style.opacity = "0";
      card.style.transform = "translateY(12px)";
      grid.appendChild(card);
      setTimeout(() => {
        card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, i * 60);
    });
  } catch (err) {
    console.error("Erro:", err);
    loading.classList.add("hidden");
  }
}

function criarClienteCard(uid, data, pct) {
  const div = document.createElement("div");
  div.className = "cliente-card";
  div.innerHTML = `
    <div class="cliente-card-tipo">${data.tipo === "food" ? "🍽 Paleta Food" : "📣 Paleta Mkt"}</div>
    <div class="cliente-card-nome">${data.nome}</div>
    <div class="cliente-card-status">
      ${data.status ? `<span class="status-badge status-${data.status}">${STATUS_LABEL[data.status] || data.status}</span>` : ""}
    </div>
    <div class="cliente-card-prog">
      <div class="progresso-bar-wrap"><div class="progresso-bar-fill" style="width:${pct}%"></div></div>
      <span class="cliente-card-pct">${pct}%</span>
    </div>
  `;
  div.addEventListener("click", () => abrirDetalhe(uid, data));
  return div;
}

async function calcularProgresso(uid) {
  let total = 0, conc = 0;
  const etapasSnap = await getDocs(collection(db, "clientes", uid, "etapas"));
  for (const etapaDoc of etapasSnap.docs) {
    const tarefasSnap = await getDocs(collection(db, "clientes", uid, "etapas", etapaDoc.id, "tarefas"));
    tarefasSnap.forEach(t => { total++; if (t.data().concluida) conc++; });
  }
  return total > 0 ? Math.round((conc / total) * 100) : 0;
}

// ============================================================
// DETALHE
// ============================================================

async function abrirDetalhe(uid, data) {
  clienteAtualUID = uid;

  const slug = data.nome.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
  window.history.replaceState({}, "", "/cs/" + slug);

  mostrarView("viewDetalhe");
  document.getElementById("detalheTipo").textContent = data.tipo === "food" ? "🍽 Paleta Food" : "📣 Paleta Mkt";
  document.getElementById("detalheNome").textContent = data.nome;

  await renderizarEtapas(uid);
}

document.getElementById("btnVoltar").addEventListener("click", () => {
  clienteAtualUID = null;
  carregarClientes();
});

// ============================================================
// ETAPAS — CS pode dar check, mas não edita
// ============================================================

async function renderizarEtapas(uid) {
  const wrap = document.getElementById("etapasCSWrap");
  wrap.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';

  const etapasSnap = await getDocs(
    query(collection(db, "clientes", uid, "etapas"), orderBy("ordem"))
  );

  wrap.innerHTML = "";
  let totalT = 0, totalC = 0;
  const todasTarefas = [];

  for (const etapaDoc of etapasSnap.docs) {
    const etapa = { id: etapaDoc.id, ...etapaDoc.data() };
    const tarefasSnap = await getDocs(
      query(collection(db, "clientes", uid, "etapas", etapaDoc.id, "tarefas"), orderBy("ordem"))
    );

    // CS não vê tarefas ocultas
    const tarefas = tarefasSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(t => t.visivel !== false);

    if (tarefas.length === 0) continue;

    const concluidas = tarefas.filter(t => t.concluida).length;
    totalT += tarefas.length;
    totalC += concluidas;
    todasTarefas.push(...tarefas);

    const el = criarEtapaCS(uid, etapa, tarefas, concluidas);
    el.style.opacity = "0";
    el.style.transform = "translateY(10px)";
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, todasTarefas.length * 20);
  }

  const pct = totalT > 0 ? Math.round((totalC / totalT) * 100) : 0;
  document.getElementById("detalheProgresso").textContent = pct + "%";
  document.getElementById("detalheProgressoBar").style.width = pct + "%";

  renderizarResumo(todasTarefas);
}

function criarEtapaCS(uid, etapa, tarefas, concluidas) {
  const div = document.createElement("div");
  div.className = "etapa-card aberta";

  div.innerHTML = `
    <div class="etapa-header">
      <div class="etapa-header-left">
        <div class="etapa-numero">${concluidas === tarefas.length ? "✓" : etapa.ordem}</div>
        <div>
          <span class="etapa-titulo">${etapa.nome}</span>
          ${etapa.descricao ? `<p class="etapa-descricao">${etapa.descricao}</p>` : ""}
        </div>
      </div>
      <div class="etapa-header-right">
        <span class="etapa-mini-prog">${concluidas}/${tarefas.length}</span>
        <span class="etapa-chevron">▾</span>
      </div>
    </div>
    <div class="etapa-body">
      ${tarefas.map(t => renderTarefaCS(t)).join("")}
    </div>
  `;

  div.querySelector(".etapa-header").addEventListener("click", (e) => {
    if (e.target.closest(".tarefa-check")) return;
    div.classList.toggle("aberta");
  });

  div.querySelectorAll(".tarefa-item").forEach(el => {
    const tid = el.dataset.tarefaId;
    const tarefa = tarefas.find(t => t.id === tid);

    el.querySelector(".tarefa-check").addEventListener("click", async () => {
      const novo = !tarefa.concluida;
      tarefa.concluida = novo;

      // Atualiza visual sem recriar DOM
      el.classList.toggle("concluida", novo);

      // Atualiza contador da etapa
      const etapaCard = el.closest(".etapa-card");
      if (etapaCard) {
        const itens = etapaCard.querySelectorAll(".tarefa-item");
        const conc = Array.from(itens).filter(i => i.classList.contains("concluida")).length;
        const mini = etapaCard.querySelector(".etapa-mini-prog");
        if (mini) mini.textContent = `${conc}/${itens.length}`;
        if (conc === itens.length) {
          etapaCard.classList.add("concluida");
          const num = etapaCard.querySelector(".etapa-numero");
          if (num) num.textContent = "✓";
        } else {
          etapaCard.classList.remove("concluida");
          const num = etapaCard.querySelector(".etapa-numero");
          if (num) num.textContent = etapa.ordem;
        }
      }

      // Atualiza resumo e % sem recriar DOM
      atualizarResumoDireto();

      // Persiste no Firestore
      await updateDoc(doc(db, "clientes", uid, "etapas", etapa.id, "tarefas", tid), {
        concluida: novo,
        dataConclusao: novo ? serverTimestamp() : null
      });
      await registrarLog(uid, novo ? "concluiu a tarefa" : "reabriu a tarefa", tid, tarefa.nome);
    });
  });

  return div;
}

function renderTarefaCS(t) {
  return `
    <div class="tarefa-item${t.concluida ? " concluida" : ""}" data-tarefa-id="${t.id}">
      <div class="tarefa-item-top">
        <div class="tarefa-check"></div>
        <div class="tarefa-info">
          <span class="tarefa-nome">${t.nome}</span>
          ${t.descricao ? `<p class="tarefa-descricao">${renderMarkdown(t.descricao)}</p>` : ""}
        </div>
        <span class="tarefa-resp ${t.responsavel}">${labelResp(t.responsavel)}</span>
      </div>
    </div>
  `;
}

// ============================================================
// RESUMO POR RESPONSÁVEL
// ============================================================

function renderizarResumo(tarefasTodas) {
  const wrap = document.getElementById("resumoResponsavel");
  if (!wrap) return;

  let paleta = { total: 0, conc: 0 };
  let cliente = { total: 0, conc: 0 };
  let ambos = { total: 0, conc: 0 };
  let totalGeral = 0, concGeral = 0;

  tarefasTodas.forEach(t => {
    totalGeral++;
    if (t.concluida) concGeral++;
    if (t.responsavel === "paleta") { paleta.total++; if (t.concluida) paleta.conc++; }
    else if (t.responsavel === "cliente") { cliente.total++; if (t.concluida) cliente.conc++; }
    else { ambos.total++; if (t.concluida) ambos.conc++; }
  });

  const pct = totalGeral > 0 ? Math.round((concGeral / totalGeral) * 100) : 0;

  wrap.innerHTML = `
    <div class="resumo-cards">
      <div class="resumo-card laranja">
        <div class="resumo-card-icon">🎯</div>
        <div class="resumo-card-body">
          <div class="resumo-card-label">Paleta</div>
          <div class="resumo-card-nums">
            <span class="resumo-total">${paleta.conc}/${paleta.total}</span>
            <span class="resumo-pct">${paleta.total > 0 ? Math.round((paleta.conc/paleta.total)*100) : 0}%</span>
          </div>
          <div class="resumo-bar-wrap"><div class="resumo-bar-fill laranja" style="width:${paleta.total > 0 ? Math.round((paleta.conc/paleta.total)*100) : 0}%"></div></div>
        </div>
      </div>
      <div class="resumo-card azul">
        <div class="resumo-card-icon">📋</div>
        <div class="resumo-card-body">
          <div class="resumo-card-label">Cliente</div>
          <div class="resumo-card-nums">
            <span class="resumo-total">${cliente.conc}/${cliente.total}</span>
            <span class="resumo-pct">${cliente.total > 0 ? Math.round((cliente.conc/cliente.total)*100) : 0}%</span>
          </div>
          <div class="resumo-bar-wrap"><div class="resumo-bar-fill azul" style="width:${cliente.total > 0 ? Math.round((cliente.conc/cliente.total)*100) : 0}%"></div></div>
        </div>
      </div>
      <div class="resumo-card verde">
        <div class="resumo-card-icon">🤝</div>
        <div class="resumo-card-body">
          <div class="resumo-card-label">Ambos</div>
          <div class="resumo-card-nums">
            <span class="resumo-total">${ambos.conc}/${ambos.total}</span>
            <span class="resumo-pct">${ambos.total > 0 ? Math.round((ambos.conc/ambos.total)*100) : 0}%</span>
          </div>
          <div class="resumo-bar-wrap"><div class="resumo-bar-fill verde" style="width:${ambos.total > 0 ? Math.round((ambos.conc/ambos.total)*100) : 0}%"></div></div>
        </div>
      </div>
      <div class="resumo-card geral">
        <div class="resumo-card-icon">📊</div>
        <div class="resumo-card-body">
          <div class="resumo-card-label">Geral</div>
          <div class="resumo-card-nums">
            <span class="resumo-total">${concGeral}/${totalGeral}</span>
            <span class="resumo-pct resumo-pct-destaque">${pct}%</span>
          </div>
          <div class="resumo-bar-wrap"><div class="resumo-bar-fill laranja" style="width:${pct}%"></div></div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// ATUALIZAR RESUMO SEM RECRIAR DOM
// ============================================================

function atualizarResumoDireto() {
  const todasTarefas = [];
  document.querySelectorAll("#etapasCSWrap .tarefa-item").forEach(el => {
    const concluida = el.classList.contains("concluida");
    const resp = el.querySelector(".tarefa-resp")?.className.replace("tarefa-resp ", "").trim() || "paleta";
    todasTarefas.push({ concluida, responsavel: resp });
  });
  if (todasTarefas.length > 0) renderizarResumo(todasTarefas);

  // Atualiza % no topo
  const total = todasTarefas.length;
  const conc = todasTarefas.filter(t => t.concluida).length;
  const pct = total > 0 ? Math.round((conc / total) * 100) : 0;
  const progEl = document.getElementById("detalheProgresso");
  const barEl = document.getElementById("detalheProgressoBar");
  if (progEl) progEl.textContent = pct + "%";
  if (barEl) barEl.style.width = pct + "%";
}

// ============================================================
// LOGS
// ============================================================

async function registrarLog(clienteUID, acao, tarefaId, tarefaNome) {
  try {
    await addDoc(collection(db, "clientes", clienteUID, "logs"), {
      data: serverTimestamp(),
      usuario: csNome,
      responsavel: "CS",
      acao,
      tarefaId: tarefaId || null,
      tarefaNome: tarefaNome || null
    });
  } catch (e) {
    console.warn("Log não registrado:", e.message);
  }
}

// ============================================================
// HELPERS
// ============================================================

function labelResp(resp) {
  if (resp === "paleta") return "Paleta";
  if (resp === "cliente") return "Cliente";
  return "Ambos";
}

function renderMarkdown(texto) {
  if (!texto) return "";
  return texto
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" class="md-link-btn">$1 →</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

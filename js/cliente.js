// js/cliente.js v2
import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, getDoc, collection, getDocs, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const LOGO = { food: "/assets/logo-food.png", mkt: "/assets/logo-mkt.png" };

const STATUS_LABEL = {
  nao_iniciado: "Não iniciado", em_andamento: "Em andamento",
  aguardando_cliente: "Aguardando você", em_revisao: "Em revisão",
  concluido: "Concluído", atrasado: "Atrasado",
  pendente: "Pendente", concluida: "Concluída", atrasada: "Atrasada"
};

// Tabs
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".detalhe-tab-content").forEach(t => t.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.remove("hidden");
    if (btn.dataset.tab === "tabLogs" && window._clienteUID) carregarLogs(window._clienteUID);
  });
});

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "/index.html"; return; }

  const editorDoc = await getDoc(doc(db, "editores", user.uid));
  if (editorDoc.exists()) { window.location.href = "/editor.html"; return; }

  const clienteDoc = await getDoc(doc(db, "clientes", user.uid));
  if (!clienteDoc.exists()) { await signOut(auth); window.location.href = "/index.html"; return; }

  const data = clienteDoc.data();

  // Suporte a usuário adicional vinculado
  const uid = data.clientePrincipalUID || user.uid;
  window._clienteUID = uid;

  const clienteReal = data.clientePrincipalUID
    ? (await getDoc(doc(db, "clientes", uid))).data()
    : data;

  await prepararPrincipal(clienteReal, uid);
  mostrarSplash(clienteReal);
  setTimeout(() => fazerTransicao(), 2200);
});

document.getElementById("btnSair").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/index.html";
});

// ============================================================
// SPLASH
// ============================================================

function mostrarSplash(data) {
  document.getElementById("splashNome").textContent = `Olá, ${data.nome}!`;
  requestAnimationFrame(() => document.getElementById("splashScreen").classList.add("visible"));
}

function fazerTransicao() {
  const splash = document.getElementById("splashScreen");
  const main = document.getElementById("mainContent");
  splash.classList.add("saindo");
  main.classList.add("entrando");
  setTimeout(() => {
    splash.classList.add("hidden");
    main.classList.remove("hidden");
    main.classList.add("visible");
  }, 500);
}

// ============================================================
// PRINCIPAL
// ============================================================

async function prepararPrincipal(data, uid) {
  document.getElementById("topLogo").src = LOGO[data.tipo] || LOGO.mkt;
  document.getElementById("nomeCliente").textContent = data.nome;
  document.getElementById("tituloCliente").textContent = data.nome;
  document.title = `${data.nome} — Onboarding Paleta`;

  // URL amigável
  const slug = data.nome.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
  window.history.replaceState({}, "", "/cliente/" + slug);

  // Status badge
  if (data.status) {
    const badge = document.getElementById("statusBadge");
    badge.innerHTML = `<span class="status-badge status-${data.status}">${STATUS_LABEL[data.status] || data.status}</span>`;
  }

  // Dashboard cards
  preencherCards(data);

  await carregarOnboarding(uid);
}

function preencherCards(data) {
  const fmt = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  document.getElementById("cardInicio").textContent = fmt(data.dataInicio);
  document.getElementById("cardPrevisao").textContent = fmt(data.dataPrevistaConclusao);

  if (data.dataInicio) {
    const inicio = data.dataInicio.toDate ? data.dataInicio.toDate() : new Date(data.dataInicio);
    const hoje = new Date();
    const decorridos = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24));
    document.getElementById("cardDias").textContent = decorridos;

    if (data.dataPrevistaConclusao) {
      const prev = data.dataPrevistaConclusao.toDate ? data.dataPrevistaConclusao.toDate() : new Date(data.dataPrevistaConclusao);
      const restantes = Math.ceil((prev - hoje) / (1000 * 60 * 60 * 24));
      document.getElementById("cardDiasSub").textContent = restantes >= 0
        ? `${restantes} restantes` : `${Math.abs(restantes)} em atraso`;
    }
  }
}

// ============================================================
// ONBOARDING
// ============================================================

async function carregarOnboarding(uid) {
  document.getElementById("loadingState").classList.add("hidden");

  const etapasSnap = await getDocs(
    query(collection(db, "clientes", uid, "etapas"), orderBy("ordem"))
  );

  let totalT = 0, totalC = 0;
  let paletaTotal = 0, paletaConc = 0;
  let clienteTotal = 0, clienteConc = 0;
  let proximaEtapa = null;

  const etapasWrap = document.getElementById("etapasWrap");
  const etapaEls = [];

  for (const etapaDoc of etapasSnap.docs) {
    const etapa = { id: etapaDoc.id, ...etapaDoc.data() };
    const tarefasSnap = await getDocs(
      query(collection(db, "clientes", uid, "etapas", etapaDoc.id, "tarefas"), orderBy("ordem"))
    );

    const tarefasVisiveis = tarefasSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(t => t.visivel !== false);

    if (tarefasVisiveis.length === 0) continue;

    const conc = tarefasVisiveis.filter(t => t.concluida || t.status === "concluida").length;
    totalT += tarefasVisiveis.length;
    totalC += conc;

    // Responsabilidade
    tarefasVisiveis.forEach(t => {
      if (t.responsavel === "paleta" || t.responsavel === "ambos") {
        paletaTotal++;
        if (t.concluida || t.status === "concluida") paletaConc++;
      }
      if (t.responsavel === "cliente" || t.responsavel === "ambos") {
        clienteTotal++;
        if (t.concluida || t.status === "concluida") clienteConc++;
      }
    });

    // Próxima etapa pendente
    if (!proximaEtapa && conc < tarefasVisiveis.length) {
      proximaEtapa = etapa.nome;
    }

    const el = criarEtapaCliente(etapa, tarefasVisiveis, conc);
    el.style.opacity = "0";
    el.style.transform = "translateY(14px)";
    etapasWrap.appendChild(el);
    etapaEls.push(el);
  }

  // Animações sequenciais
  etapaEls.forEach((el, i) => {
    setTimeout(() => {
      el.style.transition = "opacity 0.35s ease, transform 0.35s ease";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, 600 + i * 80);
  });

  // Progresso
  const pct = totalT > 0 ? Math.round((totalC / totalT) * 100) : 0;
  document.getElementById("progressoNumero").textContent = pct + "%";
  setTimeout(() => {
    document.getElementById("progressoBar").style.width = pct + "%";
  }, 600 + etapaEls.length * 80);

  // Tarefas card
  document.getElementById("cardTarefas").textContent = `${totalC}/${totalT}`;
  document.getElementById("cardTarefasSub").textContent = `${totalT - totalC} pendentes`;

  // Responsabilidade
  document.getElementById("respPaletaTotal").textContent = paletaTotal;
  document.getElementById("respPaletaDet").innerHTML = `${paletaConc} concluídas<br>${paletaTotal - paletaConc} pendentes`;
  document.getElementById("respClienteTotal").textContent = clienteTotal;
  document.getElementById("respClienteDet").innerHTML = `${clienteConc} concluídas<br>${clienteTotal - clienteConc} pendentes`;

  // Próxima etapa
  if (proximaEtapa) {
    document.getElementById("proximaEtapaNome").textContent = proximaEtapa;
    document.getElementById("proximaEtapaWrap").classList.remove("hidden");
  }

  if (pct === 100) setTimeout(() => mostrarCelebracao(), 1200 + etapaEls.length * 80);
}

// ============================================================
// MARKDOWN — links e negrito
// ============================================================

function renderMarkdown(texto) {
  if (!texto) return "";
  return texto
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
      '<a href="$2" target="_blank" class="md-link-btn">$1 →</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function criarEtapaCliente(etapa, tarefas, concluidas) {
  const total = tarefas.length;
  const etapaConcluida = concluidas === total && total > 0;

  const div = document.createElement("div");
  div.className = `etapa-card${etapaConcluida ? " concluida" : ""} aberta`;

  div.innerHTML = `
    <div class="etapa-header">
      <div class="etapa-header-left">
        <div class="etapa-numero">${etapaConcluida ? "✓" : etapa.ordem}</div>
        <div>
          <span class="etapa-titulo">${etapa.nome}</span>
          ${etapa.descricao ? `<p class="etapa-descricao">${etapa.descricao}</p>` : ""}
        </div>
      </div>
      <div class="etapa-header-right">
        <span class="etapa-mini-prog">${concluidas}/${total}</span>
        <span class="etapa-chevron">▾</span>
      </div>
    </div>
    <div class="etapa-body">
      ${tarefas.map(t => `
        <div class="tarefa-item${(t.concluida || t.status === "concluida") ? " concluida" : ""}">
          <div class="tarefa-item-top">
            <div class="tarefa-check"></div>
            <div class="tarefa-info">
              <span class="tarefa-nome">${t.nome}</span>
              ${t.descricao ? `<p class="tarefa-descricao">${renderMarkdown(t.descricao)}</p>` : ""}
              ${t.observacao ? `<p class="tarefa-observacao">💬 ${t.observacao}</p>` : ""}
            </div>
          </div>
          <div class="tarefa-meta">
            <span class="tarefa-resp ${t.responsavel}">${labelResp(t.responsavel)}</span>
            ${t.status ? `<span class="status-badge status-${t.status}">${STATUS_LABEL[t.status] || t.status}</span>` : ""}
            ${t.dataPrevisao ? `<span class="tarefa-data">📅 ${formatarData(t.dataPrevisao)}</span>` : ""}
          </div>
        </div>
      `).join("")}
    </div>
  `;

  div.querySelector(".etapa-header").addEventListener("click", () => div.classList.toggle("aberta"));
  return div;
}

// ============================================================
// LOGS
// ============================================================

async function carregarLogs(uid) {
  const wrap = document.getElementById("logsWrap");
  wrap.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';

  const snap = await getDocs(
    query(collection(db, "clientes", uid, "logs"), orderBy("data", "desc"), limit(50))
  );

  wrap.innerHTML = "";

  if (snap.empty) {
    wrap.innerHTML = '<p style="color:var(--cinza-texto);font-size:13px;padding:16px 0">Nenhum registro ainda.</p>';
    return;
  }

  snap.forEach(d => {
    const log = d.data();
    const data = log.data?.toDate ? log.data.toDate() : new Date();
    const dataFmt = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const concluida = log.acao?.includes("concluiu") || log.acao?.includes("concluída");

    const el = document.createElement("div");
    el.className = "log-item";
    el.innerHTML = `
      <div class="log-tarefa-nome ${concluida ? "" : "ativa"}">${log.tarefaNome || log.acao}</div>
      <div class="log-meta">
        <span class="log-check">✓</span>
        <span>${log.usuario}</span>
        <span class="log-dot">·</span>
        <span>${log.responsavel || "Paleta"}</span>
        <span class="log-dot">·</span>
        <span>${dataFmt}</span>
      </div>
    `;
    wrap.appendChild(el);
  });
}

// ============================================================
// HELPERS
// ============================================================

function labelResp(resp) {
  if (resp === "paleta") return "Paleta";
  if (resp === "cliente") return "Você";
  return "Ambos";
}

function formatarData(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function mostrarCelebracao() {
  const el = document.createElement("div");
  el.className = "celebracao";
  el.innerHTML = `
    <div class="celebracao-inner">
      <div class="celebracao-emoji">🎉</div>
      <h2>Onboarding concluído!</h2>
      <p>Tudo pronto. Bem-vindo à Paleta!</p>
      <button class="btn-primary" onclick="this.closest('.celebracao').remove()">Fechar</button>
    </div>
  `;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add("visible"));
}

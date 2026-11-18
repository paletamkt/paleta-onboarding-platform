// js/editor.js v2.1
import { initializeApp, getApps, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut, createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  collection, getDocs, query, orderBy, serverTimestamp, Timestamp, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth, db, firebaseConfig } from "./firebase.js";

const SECONDARY_APP_NAME = "paleta-secondary";

const STATUS_LABEL = {
  nao_iniciado: "Não iniciado", em_andamento: "Em andamento",
  aguardando_cliente: "Aguardando cliente", em_revisao: "Em revisão",
  concluido: "Concluído", atrasado: "Atrasado"
};

async function criarUsuarioSecundario(email, senha) {
  const existente = getApps().find(a => a.name === SECONDARY_APP_NAME);
  if (existente) await deleteApp(existente);
  const app2 = initializeApp(firebaseConfig, SECONDARY_APP_NAME);
  const auth2 = getAuth(app2);
  try {
    const cred = await createUserWithEmailAndPassword(auth2, email, senha);
    const uid = cred.user.uid;
    await signOut(auth2);
    return uid;
  } finally {
    await deleteApp(app2);
  }
}

// ============================================================
// TEMPLATES
// ============================================================

const TEMPLATES = {
  food: [
    { nome: "Formalização", descricao: "", tarefas: [
      { nome: "Assinar contrato", descricao: "Enviar o contrato assinado para a equipe Paleta.", observacao: "", responsavel: "cliente", visivel: true },
      { nome: "Criar fatura no Asaas", descricao: "", observacao: "", responsavel: "paleta", visivel: false },
      { nome: "Criar grupo de WhatsApp", descricao: "Grupo para comunicação direta com a equipe.", observacao: "", responsavel: "paleta", visivel: true },
      { nome: "Enviar formulário de entrada", descricao: "Formulário com informações essenciais do negócio.", observacao: "", responsavel: "paleta", visivel: true },
    ]},
    { nome: "Coleta de informações", descricao: "Precisamos de acessos e materiais para iniciar.", tarefas: [
      { nome: "Preencher formulário de entrada", descricao: "Formulário enviado pelo grupo de WhatsApp.", observacao: "", responsavel: "cliente", visivel: true },
      { nome: "Enviar logins e senhas (Instagram, Facebook, Google)", descricao: "Acessos necessários para gerenciamento das redes.", observacao: "", responsavel: "cliente", visivel: true },
      { nome: "Enviar acesso ao iFood / delivery", descricao: "Login do painel do estabelecimento.", observacao: "", responsavel: "cliente", visivel: true },
      { nome: "Enviar acesso ao sistema de PDV", descricao: "Acesso ao sistema de caixa para integração.", observacao: "", responsavel: "cliente", visivel: true },
      { nome: "Enviar cardápio atualizado", descricao: "Versão mais recente com preços e itens.", observacao: "", responsavel: "cliente", visivel: true },
      { nome: "Enviar fotos de ambiente e pratos", descricao: "Fotos em boa qualidade para uso nas redes sociais.", observacao: "", responsavel: "cliente", visivel: true },
    ]},
    { nome: "Leitura e estratégia", descricao: "", tarefas: [
      { nome: "Leitura do formulário de entrada", descricao: "", observacao: "", responsavel: "paleta", visivel: false },
      { nome: "Criação da estratégia", descricao: "Definição do posicionamento e linha editorial.", observacao: "", responsavel: "paleta", visivel: true },
    ]},
    { nome: "Configuração das ferramentas", descricao: "Configuramos todas as plataformas digitais.", tarefas: [
      { nome: "Organizar ou criar Instagram", descricao: "Bio, foto de perfil e configurações iniciais.", observacao: "", responsavel: "paleta", visivel: true },
      { nome: "Organizar ou criar Facebook", descricao: "Página e configurações básicas.", observacao: "", responsavel: "paleta", visivel: true },
      { nome: "Organizar ou criar Google Meu Negócio", descricao: "Perfil completo com horários e fotos.", observacao: "", responsavel: "paleta", visivel: true },
      { nome: "Configurar cardápio digital", descricao: "Cardápio online integrado às plataformas.", observacao: "", responsavel: "paleta", visivel: true },
      { nome: "Configurar iFood (se aplicável)", descricao: "Otimização do perfil e cardápio no iFood.", observacao: "", responsavel: "paleta", visivel: true },
    ]},
    { nome: "Kickoff", descricao: "Reunião de alinhamento para iniciar as operações.", tarefas: [
      { nome: "Reunião de kickoff", descricao: "Apresentação da estratégia e alinhamento de expectativas.", observacao: "", responsavel: "ambos", visivel: true },
    ]},
    { nome: "Primeira produção", descricao: "", tarefas: [
      { nome: "Produção de conteúdo — primeira produção", descricao: "Gravação e produção do primeiro conteúdo.", observacao: "", responsavel: "paleta", visivel: true },
      { nome: "Aprovação do conteúdo", descricao: "Revisar e aprovar o material produzido.", observacao: "", responsavel: "cliente", visivel: true },
    ]},
  ],
  mkt: [
    { nome: "Formalização", descricao: "", tarefas: [
      { nome: "Assinar contrato", descricao: "Enviar o contrato assinado para a equipe Paleta.", observacao: "", responsavel: "cliente", visivel: true },
      { nome: "Criar fatura no Asaas", descricao: "", observacao: "", responsavel: "paleta", visivel: false },
      { nome: "Criar grupo de WhatsApp", descricao: "Grupo para comunicação direta com a equipe.", observacao: "", responsavel: "paleta", visivel: true },
      { nome: "Enviar formulário de entrada", descricao: "Formulário com informações essenciais do negócio.", observacao: "", responsavel: "paleta", visivel: true },
    ]},
    { nome: "Coleta de informações", descricao: "Precisamos de acessos e materiais para iniciar.", tarefas: [
      { nome: "Preencher formulário de entrada", descricao: "Formulário enviado pelo grupo de WhatsApp.", observacao: "", responsavel: "cliente", visivel: true },
      { nome: "Enviar logins e senhas (Instagram, Facebook, site)", descricao: "Acessos necessários para gerenciamento.", observacao: "", responsavel: "cliente", visivel: true },
      { nome: "Enviar acesso ao Meta Business Suite", descricao: "Acesso ao gerenciador de anúncios.", observacao: "", responsavel: "cliente", visivel: true },
      { nome: "Enviar informações comerciais do nicho", descricao: "Catálogo, lista de serviços, empreendimentos ou produtos.", observacao: "", responsavel: "cliente", visivel: true },
    ]},
    { nome: "Leitura e estratégia", descricao: "", tarefas: [
      { nome: "Leitura do formulário de entrada", descricao: "", observacao: "", responsavel: "paleta", visivel: false },
      { nome: "Criação da estratégia", descricao: "Definição do posicionamento e linha editorial.", observacao: "", responsavel: "paleta", visivel: true },
    ]},
    { nome: "Configuração das ferramentas", descricao: "Configuramos todas as plataformas digitais.", tarefas: [
      { nome: "Organizar ou criar Instagram", descricao: "Bio, foto de perfil e configurações iniciais.", observacao: "", responsavel: "paleta", visivel: true },
      { nome: "Organizar ou criar Facebook", descricao: "Página e configurações básicas.", observacao: "", responsavel: "paleta", visivel: true },
      { nome: "Organizar ou criar Google Meu Negócio", descricao: "Perfil completo com horários e fotos.", observacao: "", responsavel: "paleta", visivel: true },
      { nome: "Configurar Meta Business Suite", descricao: "Pixel, públicos e configuração de campanhas.", observacao: "", responsavel: "paleta", visivel: true },
      { nome: "Configurar ferramentas de nicho", descricao: "Plataformas específicas do segmento do cliente.", observacao: "", responsavel: "paleta", visivel: true },
    ]},
    { nome: "Kickoff", descricao: "Reunião de alinhamento para iniciar as operações.", tarefas: [
      { nome: "Reunião de kickoff", descricao: "Apresentação da estratégia e alinhamento de expectativas.", observacao: "", responsavel: "ambos", visivel: true },
    ]},
    { nome: "Primeira produção", descricao: "", tarefas: [
      { nome: "Produção de conteúdo — primeira produção", descricao: "Gravação e produção do primeiro conteúdo.", observacao: "", responsavel: "paleta", visivel: true },
      { nome: "Aprovação do conteúdo", descricao: "Revisar e aprovar o material produzido.", observacao: "", responsavel: "cliente", visivel: true },
    ]},
  ]
};

// ============================================================
// AUTH
// ============================================================

let editorUID = null;
let clienteAtualUID = null;
let clienteAtualData = null;
let etapasCache = [];

onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "/index.html"; return; }
  const editorDoc = await getDoc(doc(db, "editores", user.uid));
  if (!editorDoc.exists()) { window.location.href = "/index.html"; return; }
  editorUID = user.uid;
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
// TABS
// ============================================================

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".detalhe-tab-content").forEach(t => t.classList.add("hidden"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.remove("hidden");
    if (btn.dataset.tab === "tabLogs" && clienteAtualUID) carregarLogsEditor(clienteAtualUID);
    if (btn.dataset.tab === "tabUsuarios" && clienteAtualUID) carregarUsuariosCliente(clienteAtualUID);
  });
});

// ============================================================
// LISTA DE CLIENTES
// ============================================================

async function carregarClientes() {
  window.history.replaceState({}, "", "/editor/lista");
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
  clienteAtualData = data;

  const slug = data.nome.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
  window.history.replaceState({}, "", "/editor/" + slug);

  mostrarView("viewDetalhe");
  document.getElementById("detalheTipo").textContent = data.tipo === "food" ? "🍽 Paleta Food" : "📣 Paleta Mkt";
  
  // Nome editável inline
  const nomeEl = document.getElementById("detalheNome");
  nomeEl.textContent = data.nome;
  nomeEl.title = "Clique para editar";
  nomeEl.style.cursor = "pointer";
  nomeEl.onclick = () => editarNomeInline(uid, nomeEl);

  document.getElementById("infoStatus").value = data.status || "em_andamento";
  if (data.dataInicio) {
    const d = data.dataInicio.toDate ? data.dataInicio.toDate() : new Date(data.dataInicio);
    document.getElementById("infoDataInicio").value = d.toISOString().split("T")[0];
  }
  if (data.dataPrevistaConclusao) {
    const d = data.dataPrevistaConclusao.toDate ? data.dataPrevistaConclusao.toDate() : new Date(data.dataPrevistaConclusao);
    document.getElementById("infoDataPrevisao").value = d.toISOString().split("T")[0];
  }
  atualizarDias();

  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".detalhe-tab-content").forEach(t => t.classList.add("hidden"));
  document.querySelector('[data-tab="tabEtapas"]').classList.add("active");
  document.getElementById("tabEtapas").classList.remove("hidden");

  await renderizarEtapas(uid);
  await migrarTarefas(uid);
}

function atualizarDias() {
  const inicio = document.getElementById("infoDataInicio").value;
  const previsao = document.getElementById("infoDataPrevisao").value;
  if (inicio && previsao) {
    const dias = Math.ceil((new Date(previsao) - new Date(inicio)) / (1000 * 60 * 60 * 24));
    document.getElementById("infoDias").textContent = `${dias} dias`;
  }
}

document.getElementById("infoDataInicio").addEventListener("change", atualizarDias);
document.getElementById("infoDataPrevisao").addEventListener("change", atualizarDias);

document.getElementById("btnSalvarInfo").addEventListener("click", async () => {
  if (!clienteAtualUID) return;
  const status = document.getElementById("infoStatus").value;
  const inicio = document.getElementById("infoDataInicio").value;
  const previsao = document.getElementById("infoDataPrevisao").value;
  const update = { status };
  if (inicio) update.dataInicio = Timestamp.fromDate(new Date(inicio));
  if (previsao) update.dataPrevistaConclusao = Timestamp.fromDate(new Date(previsao));
  await updateDoc(doc(db, "clientes", clienteAtualUID), update);
  await registrarLog(clienteAtualUID, `alterou status para "${STATUS_LABEL[status]}"`, null, null);
  const btn = document.getElementById("btnSalvarInfo");
  btn.textContent = "Salvo ✓";
  setTimeout(() => btn.textContent = "Salvar", 2000);
});

document.getElementById("btnVoltar").addEventListener("click", () => {
  clienteAtualUID = null; clienteAtualData = null;
  carregarClientes();
});

// ============================================================
// MIGRAÇÃO AUTOMÁTICA
// ============================================================

async function migrarTarefas(uid) {
  try {
    const etapasSnap = await getDocs(collection(db, "clientes", uid, "etapas"));
    for (const etapaDoc of etapasSnap.docs) {
      const etapa = etapaDoc.data();
      if (etapa.descricao === undefined) {
        await updateDoc(doc(db, "clientes", uid, "etapas", etapaDoc.id), { descricao: "" });
      }
      const tarefasSnap = await getDocs(collection(db, "clientes", uid, "etapas", etapaDoc.id, "tarefas"));
      for (const tarefaDoc of tarefasSnap.docs) {
        const t = tarefaDoc.data();
        const tu = {};
        if (t.descricao === undefined) tu.descricao = "";
        if (t.observacao === undefined) tu.observacao = "";
        if (t.dataPrevisao === undefined) tu.dataPrevisao = null;
        if (t.dataConclusao === undefined) tu.dataConclusao = null;
        if (Object.keys(tu).length > 0) {
          await updateDoc(doc(db, "clientes", uid, "etapas", etapaDoc.id, "tarefas", tarefaDoc.id), tu);
        }
      }
    }
  } catch (e) {
    console.warn("Migração parcial:", e.message);
  }
}

// ============================================================
// PAINEL DE RESUMO POR RESPONSÁVEL
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
          <div class="resumo-bar-wrap">
            <div class="resumo-bar-fill laranja" style="width:${paleta.total > 0 ? Math.round((paleta.conc/paleta.total)*100) : 0}%"></div>
          </div>
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
          <div class="resumo-bar-wrap">
            <div class="resumo-bar-fill azul" style="width:${cliente.total > 0 ? Math.round((cliente.conc/cliente.total)*100) : 0}%"></div>
          </div>
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
          <div class="resumo-bar-wrap">
            <div class="resumo-bar-fill verde" style="width:${ambos.total > 0 ? Math.round((ambos.conc/ambos.total)*100) : 0}%"></div>
          </div>
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
          <div class="resumo-bar-wrap">
            <div class="resumo-bar-fill laranja" style="width:${pct}%"></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// ETAPAS EDITOR
// ============================================================

async function renderizarEtapas(uid) {
  const wrap = document.getElementById("etapasEditorWrap");
  wrap.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';

  const etapasSnap = await getDocs(
    query(collection(db, "clientes", uid, "etapas"), orderBy("ordem"))
  );

  etapasCache = [];
  wrap.innerHTML = "";
  let totalT = 0, totalC = 0;
  const todasTarefas = [];

  for (const etapaDoc of etapasSnap.docs) {
    const etapa = { id: etapaDoc.id, ...etapaDoc.data() };
    const tarefasSnap = await getDocs(
      query(collection(db, "clientes", uid, "etapas", etapaDoc.id, "tarefas"), orderBy("ordem"))
    );
    const tarefas = tarefasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    etapa.tarefas = tarefas;
    etapasCache.push(etapa);
    totalT += tarefas.length;
    totalC += tarefas.filter(t => t.concluida).length;
    todasTarefas.push(...tarefas);

    const el = criarEtapaEditor(uid, etapa, tarefas);
    el.style.opacity = "0";
    el.style.transform = "translateY(10px)";
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.transition = "opacity 0.25s ease, transform 0.25s ease";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, etapasCache.length * 50);
  }

  const pct = totalT > 0 ? Math.round((totalC / totalT) * 100) : 0;
  document.getElementById("detalheProgresso").textContent = pct + "%";
  document.getElementById("detalheProgressoBar").style.width = pct + "%";

  renderizarResumo(todasTarefas);
}

function criarEtapaEditor(uid, etapa, tarefas) {
  const div = document.createElement("div");
  div.className = "etapa-card aberta";
  div.dataset.etapaId = etapa.id;
  const concluidas = tarefas.filter(t => t.concluida).length;

  div.innerHTML = `
    <div class="etapa-header">
      <div class="etapa-header-left">
        <div class="etapa-numero">${etapa.ordem}</div>
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
      ${tarefas.map(t => renderTarefaEditor(t)).join("")}
    </div>
  `;

  div.querySelector(".etapa-header").addEventListener("click", (e) => {
    if (e.target.closest(".btn-icone")) return;
    div.classList.toggle("aberta");
  });

  div.querySelectorAll(".tarefa-item").forEach(el => {
    const tid = el.dataset.tarefaId;
    const tarefa = tarefas.find(t => t.id === tid);

    el.querySelector(".tarefa-check").addEventListener("click", async () => {
      const novo = !tarefa.concluida;
      tarefa.concluida = novo;

      // Atualiza visual sem recriar a DOM
      el.classList.toggle("concluida", novo);

      // Atualiza o contador da etapa
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

      // Atualiza os cards de resumo
      atualizarResumoDireto();

      // Persiste no Firestore
      await updateDoc(doc(db, "clientes", uid, "etapas", etapa.id, "tarefas", tid), {
        concluida: novo,
        dataConclusao: novo ? serverTimestamp() : null
      });
      await registrarLog(uid, novo ? "concluiu a tarefa" : "reabriu a tarefa", tid, tarefa.nome);
    });

    el.querySelector(".btn-visivel")?.addEventListener("click", async () => {
      const novo = !tarefa.visivel;
      tarefa.visivel = novo;
      await updateDoc(doc(db, "clientes", uid, "etapas", etapa.id, "tarefas", tid), { visivel: novo });
      const tag = el.querySelector(".visivel-tag");
      tag.className = `visivel-tag ${novo ? "sim" : "nao"} btn-visivel`;
      tag.textContent = novo ? "Visível" : "Oculto";
    });

    el.querySelector(".btn-del-tarefa")?.addEventListener("click", async () => {
      if (!confirm(`Excluir "${tarefa.nome}"?`)) return;
      await deleteDoc(doc(db, "clientes", uid, "etapas", etapa.id, "tarefas", tid));
      await renderizarEtapas(uid);
    });

    // Edição inline — nome, descrição, observação
    el.querySelectorAll(".editavel").forEach(campo => {
      campo.addEventListener("click", (e) => {
        e.stopPropagation();
        const nomeCampo = campo.dataset.campo;
        if (campo.classList.contains("editando")) return;
        editarCampoInline(campo, tarefa, nomeCampo, uid, etapa.id, tid);
      });
    });
  });

  return div;
}

// ============================================================
// ATUALIZAR RESUMO SEM RECRIAR DOM
// ============================================================

function atualizarResumoDireto() {
  const todasTarefas = [];
  document.querySelectorAll("#etapasEditorWrap .tarefa-item").forEach(el => {
    const tid = el.dataset.tarefaId;
    // Busca no cache
    for (const etapa of etapasCache) {
      const t = etapa.tarefas?.find(t => t.id === tid);
      if (t) { todasTarefas.push({ ...t, concluida: el.classList.contains("concluida") }); break; }
    }
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
// EDIÇÃO INLINE DE CAMPO
// ============================================================

function editarCampoInline(el, tarefa, campo, uid, etapaId, tarefaId) {
  el.classList.add("editando");
  const valorAtual = tarefa[campo] || "";
  const ehMultilinha = campo === "descricao" || campo === "observacao";

  const input = document.createElement(ehMultilinha ? "textarea" : "input");
  input.value = valorAtual;

  if (ehMultilinha) {
    input.rows = 3;
    input.placeholder = campo === "descricao"
      ? "Descrição da tarefa. Use [texto](url) para links."
      : "Observação interna (não aparece para o cliente)";
  } else {
    input.type = "text";
    input.placeholder = "Nome da tarefa";
  }

  input.className = "campo-inline-input";
  if (ehMultilinha) input.className += " multilinha";

  // Dica de markdown para descrição
  let dica = null;
  if (campo === "descricao") {
    dica = document.createElement("div");
    dica.className = "campo-inline-dica";
    dica.innerHTML = `💡 Use <code>[texto do botão](https://url.com)</code> para criar links clicáveis`;
  }

  el.innerHTML = "";
  el.appendChild(input);
  if (dica) el.appendChild(dica);
  input.focus();
  if (!ehMultilinha) input.select();

  async function salvar() {
    const novoValor = input.value.trim();
    tarefa[campo] = novoValor;
    el.classList.remove("editando");

    if (novoValor !== valorAtual) {
      await updateDoc(doc(db, "clientes", uid, "etapas", etapaId, "tarefas", tarefaId), {
        [campo]: novoValor
      });
    }

    // Rerenderiza só esta tarefa
    if (campo === "nome") {
      el.textContent = novoValor || "Sem nome";
    } else if (campo === "descricao") {
      if (novoValor) {
        el.innerHTML = renderMarkdown(novoValor);
        el.className = "tarefa-descricao editavel";
        el.title = "Clique para editar";
      } else {
        el.textContent = "+ Adicionar descrição";
        el.className = "tarefa-descricao editavel vazia";
      }
    } else if (campo === "observacao") {
      if (novoValor) {
        el.textContent = "💬 " + novoValor;
        el.className = "tarefa-observacao editavel";
      } else {
        el.textContent = "+ Observação interna";
        el.className = "tarefa-observacao-vazia editavel";
      }
    }

    // Re-adiciona listener
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (el.classList.contains("editando")) return;
      editarCampoInline(el, tarefa, campo, uid, etapaId, tarefaId);
    });
  }

  input.addEventListener("blur", salvar);
  input.addEventListener("keydown", (e) => {
    if (!ehMultilinha && e.key === "Enter") { e.preventDefault(); input.blur(); }
    if (e.key === "Escape") { input.value = valorAtual; input.blur(); }
  });
}

function renderTarefaEditor(t) {
  const descricaoHtml = t.descricao
    ? `<p class="tarefa-descricao editavel" data-campo="descricao" title="Clique para editar">${renderMarkdown(t.descricao)}</p>`
    : `<p class="tarefa-descricao editavel vazia" data-campo="descricao" title="Clique para adicionar descrição">+ Adicionar descrição</p>`;

  const observacaoHtml = t.observacao
    ? `<p class="tarefa-observacao editavel" data-campo="observacao" title="Clique para editar">💬 ${t.observacao}</p>`
    : `<p class="tarefa-observacao-vazia editavel" data-campo="observacao" title="Clique para adicionar observação">+ Observação interna</p>`;

  return `
    <div class="tarefa-item${t.concluida ? " concluida" : ""}" data-tarefa-id="${t.id}">
      <div class="tarefa-item-top">
        <div class="tarefa-check"></div>
        <div class="tarefa-info">
          <span class="tarefa-nome editavel" data-campo="nome" title="Clique para editar">${t.nome}</span>
          ${descricaoHtml}
          ${observacaoHtml}
        </div>
        <div class="tarefa-acoes-editor">
          <span class="tarefa-resp ${t.responsavel}">${labelResp(t.responsavel)}</span>
          <span class="visivel-tag ${t.visivel !== false ? "sim" : "nao"} btn-visivel" style="cursor:pointer">
            ${t.visivel !== false ? "Visível" : "Oculto"}
          </span>
          <button class="btn-icone danger btn-del-tarefa" title="Excluir">🗑</button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// MARKDOWN SIMPLES — links e negrito
// ============================================================

function renderMarkdown(texto) {
  if (!texto) return "";
  return texto
    // [texto](url) → link/botão
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,
      '<a href="$2" target="_blank" class="md-link-btn" onclick="event.stopPropagation()">$1 →</a>')
    // **texto** → negrito
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // quebra de linha
    .replace(/\n/g, '<br>');
}

function labelResp(resp) {
  if (resp === "paleta") return "Paleta";
  if (resp === "cliente") return "Cliente";
  return "Ambos";
}

// ============================================================
// LOGS
// ============================================================

async function registrarLog(clienteUID, acao, tarefaId, tarefaNome) {
  try {
    await addDoc(collection(db, "clientes", clienteUID, "logs"), {
      data: serverTimestamp(), usuario: "Luiz", responsavel: "Paleta",
      acao, tarefaId: tarefaId || null, tarefaNome: tarefaNome || null
    });
  } catch (e) { console.warn("Log não registrado:", e.message); }
}

async function carregarLogsEditor(uid) {
  const wrap = document.getElementById("logsEditorWrap");
  wrap.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
  const snap = await getDocs(query(collection(db, "clientes", uid, "logs"), orderBy("data", "desc"), limit(50)));
  wrap.innerHTML = "";
  if (snap.empty) { wrap.innerHTML = '<p style="color:var(--cinza-texto);font-size:13px;padding:16px 0">Nenhum registro ainda.</p>'; return; }
  snap.forEach(d => {
    const log = d.data();
    const data = log.data?.toDate ? log.data.toDate() : new Date();
    const dataFmt = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
    const concluida = log.acao?.includes("concluiu");
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
// USUÁRIOS
// ============================================================

async function carregarUsuariosCliente(clienteUID) {
  const wrap = document.getElementById("usuariosWrap");
  wrap.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';
  const clienteDoc = await getDoc(doc(db, "clientes", clienteUID));
  const emailPrincipal = clienteDoc.data()?.email || "";
  const snap = await getDocs(collection(db, "clientes", clienteUID, "usuarios"));
  wrap.innerHTML = "";
  const principal = document.createElement("div");
  principal.className = "usuario-item";
  principal.innerHTML = `<div class="usuario-info"><span class="usuario-email">${emailPrincipal}</span><span class="usuario-tag principal">Principal</span></div>`;
  wrap.appendChild(principal);
  if (!snap.empty) {
    snap.forEach(d => {
      const data = d.data();
      const el = document.createElement("div");
      el.className = "usuario-item";
      el.innerHTML = `
        <div class="usuario-info">
          <span class="usuario-email">${data.email}</span>
          <span class="usuario-tag adicional">Adicional</span>
        </div>
        <button class="btn-icone danger" onclick="deletarUsuarioCliente('${clienteUID}','${d.id}')">🗑</button>
      `;
      wrap.appendChild(el);
    });
  }
}

window.deletarUsuarioCliente = async (clienteUID, usuarioId) => {
  if (!confirm("Remover este usuário?")) return;
  await deleteDoc(doc(db, "clientes", clienteUID, "usuarios", usuarioId));
  await carregarUsuariosCliente(clienteUID);
};

document.getElementById("btnAdicionarUsuario").addEventListener("click", () => {
  document.getElementById("novoUsuarioEmail").value = "";
  document.getElementById("novoUsuarioSenha").value = "";
  document.getElementById("novoUsuarioError").classList.add("hidden");
  abrirModal("modalNovoUsuario");
});

document.getElementById("btnSalvarUsuario").addEventListener("click", async () => {
  if (!clienteAtualUID) return;
  const email = document.getElementById("novoUsuarioEmail").value.trim();
  const senha = document.getElementById("novoUsuarioSenha").value;
  const errEl = document.getElementById("novoUsuarioError");
  errEl.classList.add("hidden");
  if (!email || !senha) { errEl.textContent = "Preencha e-mail e senha."; errEl.classList.remove("hidden"); return; }
  const btn = document.getElementById("btnSalvarUsuario");
  btn.disabled = true; btn.textContent = "Criando...";
  try {
    const uid = await criarUsuarioSecundario(email, senha);
    await setDoc(doc(db, "clientes", uid), {
      nome: clienteAtualData?.nome || "", tipo: clienteAtualData?.tipo || "mkt",
      email, clientePrincipalUID: clienteAtualUID, criadoEm: serverTimestamp()
    });
    await addDoc(collection(db, "clientes", clienteAtualUID, "usuarios"), { uid, email, criadoEm: serverTimestamp() });
    fecharModal("modalNovoUsuario");
    await carregarUsuariosCliente(clienteAtualUID);
  } catch (err) {
    let msg = "Erro ao criar usuário.";
    if (err.code === "auth/email-already-in-use") msg = "E-mail já cadastrado.";
    if (err.code === "auth/weak-password") msg = "Senha deve ter 6+ caracteres.";
    errEl.textContent = msg; errEl.classList.remove("hidden");
  } finally { btn.disabled = false; btn.textContent = "Criar usuário"; }
});

// ============================================================
// MODAL NOVO CLIENTE
// ============================================================

let tipoSelecionado = "food";

document.getElementById("btnNovoCliente").addEventListener("click", () => abrirModal("modalNovoCliente"));
window.abrirModalNovoCliente = () => abrirModal("modalNovoCliente");

document.querySelectorAll("#modalNovoCliente .tipo-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#modalNovoCliente .tipo-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    tipoSelecionado = btn.dataset.tipo;
  });
});

document.getElementById("btnCriarCliente").addEventListener("click", async () => {
  const nome = document.getElementById("novoNome").value.trim();
  const email = document.getElementById("novoEmail").value.trim();
  const senha = document.getElementById("novaSenha").value;
  const errEl = document.getElementById("novoClienteError");
  errEl.classList.add("hidden");
  if (!nome || !email || !senha) { errEl.textContent = "Preencha todos os campos."; errEl.classList.remove("hidden"); return; }
  const btn = document.getElementById("btnCriarCliente");
  btn.disabled = true; btn.textContent = "Criando...";
  try {
    const uid = await criarUsuarioSecundario(email, senha);
    const hoje = new Date();
    const previsao = new Date(hoje); previsao.setDate(previsao.getDate() + 7);
    await setDoc(doc(db, "clientes", uid), {
      nome, tipo: tipoSelecionado, email, status: "em_andamento",
      dataInicio: Timestamp.fromDate(hoje),
      dataPrevistaConclusao: Timestamp.fromDate(previsao),
      criadoEm: serverTimestamp()
    });
    const template = TEMPLATES[tipoSelecionado];
    for (let i = 0; i < template.length; i++) {
      const et = template[i];
      const etRef = await addDoc(collection(db, "clientes", uid, "etapas"), {
        nome: et.nome, descricao: et.descricao || "", ordem: i + 1, criadoEm: serverTimestamp()
      });
      for (let j = 0; j < et.tarefas.length; j++) {
        await addDoc(collection(db, "clientes", uid, "etapas", etRef.id, "tarefas"), {
          ...et.tarefas[j], concluida: false, dataPrevisao: null,
          dataConclusao: null, ordem: j + 1, criadoEm: serverTimestamp()
        });
      }
    }
    await registrarLog(uid, "criou o onboarding", null, null);
    fecharModal("modalNovoCliente");
    document.getElementById("novoNome").value = "";
    document.getElementById("novoEmail").value = "";
    document.getElementById("novaSenha").value = "";
    carregarClientes();
  } catch (err) {
    let msg = "Erro ao criar cliente.";
    if (err.code === "auth/email-already-in-use") msg = "Este e-mail já está cadastrado.";
    if (err.code === "auth/weak-password") msg = "Senha deve ter pelo menos 6 caracteres.";
    errEl.textContent = msg; errEl.classList.remove("hidden");
  } finally { btn.disabled = false; btn.textContent = "Criar cliente"; }
});

// ============================================================
// MODAL NOVA ETAPA
// ============================================================

document.getElementById("btnAdicionarEtapa").addEventListener("click", () => {
  document.getElementById("novaEtapaNome").value = "";
  document.getElementById("novaEtapaDescricao").value = "";
  abrirModal("modalNovaEtapa");
});

document.getElementById("btnSalvarEtapa").addEventListener("click", async () => {
  const nome = document.getElementById("novaEtapaNome").value.trim();
  const descricao = document.getElementById("novaEtapaDescricao").value.trim();
  if (!nome || !clienteAtualUID) return;
  await addDoc(collection(db, "clientes", clienteAtualUID, "etapas"), {
    nome, descricao, ordem: etapasCache.length + 1, criadoEm: serverTimestamp()
  });
  fecharModal("modalNovaEtapa");
  await renderizarEtapas(clienteAtualUID);
});

// ============================================================
// MODAL NOVA TAREFA
// ============================================================

let respSelecionado = "paleta";

document.getElementById("btnAdicionarTarefa").addEventListener("click", () => {
  const sel = document.getElementById("novaTarefaEtapa");
  sel.innerHTML = etapasCache.map(e => `<option value="${e.id}">${e.nome}</option>`).join("");
  document.getElementById("novaTarefaNome").value = "";
  document.getElementById("novaTarefaDescricao").value = "";
  document.getElementById("novaTarefaObservacao").value = "";
  document.getElementById("novaTarefaData").value = "";
  document.getElementById("novaTarefaVisivel").checked = true;
  respSelecionado = "paleta";
  document.querySelectorAll("#modalNovaTarefa .tipo-btn").forEach(b => b.classList.toggle("active", b.dataset.resp === "paleta"));
  abrirModal("modalNovaTarefa");
});

document.querySelectorAll("#modalNovaTarefa .tipo-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#modalNovaTarefa .tipo-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    respSelecionado = btn.dataset.resp;
  });
});

document.getElementById("btnSalvarTarefa").addEventListener("click", async () => {
  const etapaId = document.getElementById("novaTarefaEtapa").value;
  const nome = document.getElementById("novaTarefaNome").value.trim();
  const descricao = document.getElementById("novaTarefaDescricao").value.trim();
  const observacao = document.getElementById("novaTarefaObservacao").value.trim();
  const dataVal = document.getElementById("novaTarefaData").value;
  const visivel = document.getElementById("novaTarefaVisivel").checked;
  if (!nome || !etapaId || !clienteAtualUID) return;
  const etapa = etapasCache.find(e => e.id === etapaId);
  await addDoc(collection(db, "clientes", clienteAtualUID, "etapas", etapaId, "tarefas"), {
    nome, descricao, observacao, responsavel: respSelecionado, visivel,
    concluida: false,
    dataPrevisao: dataVal ? Timestamp.fromDate(new Date(dataVal)) : null,
    dataConclusao: null, ordem: (etapa?.tarefas?.length || 0) + 1, criadoEm: serverTimestamp()
  });
  fecharModal("modalNovaTarefa");
  await renderizarEtapas(clienteAtualUID);
});

// ============================================================
// EDIÇÃO INLINE DO NOME
// ============================================================

function editarNomeInline(uid, el) {
  const nomeAtual = el.textContent;
  const input = document.createElement("input");
  input.type = "text";
  input.value = nomeAtual;
  input.style.cssText = `
    font-family: var(--font-display);
    font-size: inherit;
    font-weight: 800;
    letter-spacing: -0.02em;
    border: none;
    border-bottom: 2px solid var(--laranja);
    outline: none;
    background: transparent;
    color: var(--preto);
    width: 100%;
    padding: 0;
  `;

  el.textContent = "";
  el.appendChild(input);
  input.focus();
  input.select();

  async function salvar() {
    const novoNome = input.value.trim();
    el.textContent = novoNome || nomeAtual;
    el.style.cursor = "pointer";
    el.onclick = () => editarNomeInline(uid, el);

    if (novoNome && novoNome !== nomeAtual) {
      await updateDoc(doc(db, "clientes", uid), { nome: novoNome });
      await registrarLog(uid, `alterou nome para "${novoNome}"`, null, null);
      // Atualiza titulo do detalhe
      document.getElementById("detalheNome").textContent = novoNome;
    }
  }

  input.addEventListener("blur", salvar);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
    if (e.key === "Escape") { input.value = nomeAtual; input.blur(); }
  });
}

// ============================================================
// HELPERS
// ============================================================

window.abrirModal = (id) => document.getElementById(id).classList.remove("hidden");
window.fecharModal = (id) => document.getElementById(id).classList.add("hidden");

document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.add("hidden"); });
});

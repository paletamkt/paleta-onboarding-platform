# Paleta Onboarding Platform

Plataforma exclusiva de onboarding de clientes do **Grupo Paleta** (Paleta Marketing + Paleta Food).

---

## 🌐 Acesso e Hospedagem

| Item | Detalhe |
|------|---------|
| **URL de produção** | https://onboarding.paletamarketing.com.br |
| **Hospedagem** | Cloudflare Pages |
| **Repositório** | GitHub → auto-deploy via Cloudflare Pages |
| **Banco de dados** | Firebase Firestore (projeto: `paleta-onboarding`) |
| **Autenticação** | Firebase Auth (email + senha) |
| **Domínio** | CNAME configurado no Cloudflare → `onboarding.paletamarketing.com.br` |

---

## 🛠️ Stack Técnica

- **Frontend:** HTML + CSS + JS puro (sem frameworks)
- **Fontes:** Plus Jakarta Sans + DM Sans (Google Fonts)
- **Hospedagem:** Cloudflare Pages (deploy automático a cada push no GitHub)
- **Banco:** Firebase Firestore
- **Auth:** Firebase Auth

### Firebase Config
```js
apiKey: "AIzaSyAKgvAdG0khyPt0K-InRwVrsyDJ-UbnX9U"
authDomain: "paleta-onboarding.firebaseapp.com"
projectId: "paleta-onboarding"
appId: "1:1004310882844:web:cbb0c4b71be435eef14dd9"
```

---

## 👤 Perfis de Acesso

| Perfil | Coleção Firestore | Página após login | Permissões |
|--------|------------------|-------------------|------------|
| **Editor (Luiz)** | `editores/{uid}` | `/editor/lista` | Tudo — criar, editar, excluir, dar check |
| **CS (Júlia)** | `cs/{uid}` | `/cs/lista` | Ver todos os clientes + dar check em tarefas |
| **Cliente** | `clientes/{uid}` | `/cliente/nome-empresa` | Ver apenas o próprio onboarding |

---

## 📁 Estrutura de Arquivos

```
onboarding-paleta/
├── index.html              → Tela de login
├── cliente.html            → Visão do cliente
├── editor.html             → Painel do editor (Luiz)
├── cs.html                 → Painel CS (Júlia)
├── _redirects              → Regras de rota do Cloudflare Pages
├── firestore.rules         → Regras de segurança Firebase
├── assets/
│   ├── logo-food.png
│   ├── logo-mkt.png
│   └── favicon.png
├── css/style.css
└── js/
    ├── firebase.js
    ├── auth.js
    ├── cliente.js
    ├── editor.js
    └── cs.js
```

---

## 🚀 Deploy

1. Push no GitHub → Cloudflare Pages faz deploy automático
2. Se necessário: Cloudflare → Caching → Purge Everything

**Primeira vez:** ver seção completa no final deste README.

---

## ✨ Funcionalidades Principais

- Login com redirecionamento automático por perfil
- Splash personalizado com nome do cliente (2.2s)
- Dashboard com progresso, datas e tarefas
- Etapas accordion com descrição visível
- Observações destacadas + links Markdown clicáveis
- Checklist com responsável (Paleta / Cliente / Ambos)
- Edição inline de tarefas e nome do cliente
- Toggle visível/oculto por tarefa
- Logs de atividade em tempo real
- Botão WhatsApp flutuante → Júlia (92 984890543)
- Celebração ao atingir 100%

---

## 🗄️ Estrutura Firestore

```
editores/{uid} → nome
cs/{uid} → nome
clientes/{uid}
  ├── nome, email, tipo (food|mkt), status, dataInicio, dataPrevistaConclusao
  ├── /etapas/{id} → nome, descricao, ordem
  │   └── /tarefas/{id} → nome, descricao, observacao, responsavel, visivel, concluida, dataPrevisao
  ├── /usuarios/{id} → uid, email
  └── /logs/{id} → data, usuario, acao, tarefaId, tarefaNome
```

---

## 📋 Templates de Onboarding

**Paleta Food** e **Paleta MKT** — 6 etapas cada:
Formalização → Coleta → Leitura e estratégia → Configuração → Kickoff → Primeira produção

Prazo padrão: **7 dias corridos** (editável)

---

## 🚀 Deploy Completo — Primeira Vez

1. Subir todos os arquivos neste repositório no GitHub
2. Subir logos: `assets/logo-food.png`, `assets/logo-mkt.png`, `assets/favicon.png`
3. Firebase Console → Authentication → habilitar **Email/Senha**
4. Firebase Console → Firestore → colar `firestore.rules` em Regras
5. Firebase Console → Firestore → criar `editores/{UID_LUIZ}` com campo `nome: "Luiz"`
6. Firebase Console → Firestore → criar `cs/{UID_JULIA}` com campo `nome: "Júlia"`
7. Cloudflare Pages → conectar GitHub → build command: *(vazio)* → output: `/`
8. Configurar domínio: `onboarding.paletamarketing.com.br`

---

## 🗺️ _redirects

```
/cliente/*  /cliente.html  200
/editor/*   /editor.html   200
/cs/*       /cs.html       200
```

---

## 🔐 Firestore Rules — Resumo

- `editores` / `cs` — leitura do próprio documento
- `clientes` — leitura: editor + CS + próprio cliente; escrita: somente editor
- `clientes/tarefas` — escrita: editor + CS
- `clientes/logs` — leitura: todos; escrita: editor + CS

---

*Plataforma exclusiva do Grupo Paleta. Uso interno.*

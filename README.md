<p align="center">
  <h1 align="center">Auxiliador de Acionamentos — WEB</h1>
  <p align="center">
    <strong>Plataforma interna de automação e padronização de acionamentos para operações de cobrança</strong>
  </p>
  <p align="center">
    <em>Portes Advogados · Departamento de Tecnologia e Automação</em>
  </p>
</p>

<br/>

---

## 📋 Sumário

- [Visão Geral](#-visão-geral)
- [Arquitetura e Stack Tecnológico](#-arquitetura-e-stack-tecnológico)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Controle de Acesso e Permissões](#-controle-de-acesso-e-permissões)
- [Guia de Setup e Execução (Local)](#-guia-de-setup-e-execução-local)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Scripts de Migração do Banco de Dados](#-scripts-de-migração-do-banco-de-dados)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Deploy em Produção](#-deploy-em-produção)
- [Autoria e Status](#-autoria-e-status)

---

## 🏢 Visão Geral

O **Auxiliador de Acionamentos** é um sistema web full-stack desenvolvido sob medida para a operação interna do escritório **Portes Advogados**. Ele foi arquitetado para resolver um problema crítico do setor de cobrança: a geração manual e repetitiva de modelos de acionamento para múltiplas carteiras de clientes, cada uma com suas próprias regras de negócio, campos obrigatórios, tipos de acordo e prazos de vencimento.

### Impacto direto na operação

- **Eliminação de retrabalho manual:** Conciliadores deixam de montar textos de acionamento manualmente. Basta selecionar a carteira, o tipo de acordo e preencher os dados — o sistema gera o modelo padronizado automaticamente.
- **Mitigação de falhas humanas:** Validações em tempo real (CPF/CNPJ, datas, valores monetários, percentuais de desconto) e regras de negócio embarcadas no código impedem que acionamentos sejam gerados com dados inválidos ou fora do prazo.
- **Centralização da operação:** Todo o histórico de acionamentos fica armazenado, rastreável por conciliador, carteira, tipo e data — eliminando planilhas descentralizadas e garantindo auditoria.
- **Padronização entre carteiras:** O sistema gerencia **12 carteiras ativas** (SENAC RJ, SENAC MS, SENAC BA, CEDAE, SESC, CASSEMS, UNIMED, FIRJAN, FIEB, VUON CARD, Águas Guariroba, ANITA), cada uma com tipos de acordo, campos e regras de desconto próprios.
- **Calculadora especializada (Águas Guariroba):** Módulo dedicado com lógica de desconto por faixa de dias em atraso, suporte a parcelamento e geração de texto — operação que antes exigia cálculos manuais propensos a erro.
- **Controle de acesso hierárquico:** Três níveis de perfil (conciliador, admin, admin supremo) garantem que cada colaborador acesse apenas o que é pertinente à sua função, com log de exclusões para auditoria.

O resultado é uma operação mais ágil, padronizada e auditável — com redução significativa no tempo de geração de cada acionamento e ganho direto em produtividade do time de cobrança.

---

## 🛠 Arquitetura e Stack Tecnológico

A aplicação segue uma arquitetura **monorepo** com separação clara entre frontend e backend, comunicando-se via API REST.

### Frontend

| Tecnologia | Versão | Finalidade |
|---|---|---|
| **React** | ^19.2.0 | Biblioteca principal de UI (componentes funcionais, hooks) |
| **React DOM** | ^19.2.0 | Renderização no navegador |
| **React Router DOM** | ^7.13.0 | Roteamento SPA com rotas protegidas e redirecionamentos |
| **Vite** | ^7.3.1 | Bundler e dev server com HMR, proxy reverso para a API |
| **ESLint** | ^9.39.1 | Linting estático com plugins para React Hooks e React Refresh |
| **CSS Puro (Custom Properties)** | — | Sistema de design com variáveis CSS, tema dark nativo |

**Padrões adotados no frontend:**
- Componentes funcionais com `useState`, `useEffect`, `useMemo` e `useCallback`
- Roteamento com guard de autenticação (`ProtectedAdminRoute`)
- Fetch API nativo (sem dependência de bibliotecas como Axios)
- Validações client-side: CPF, CNPJ, datas (`DD/MM/AAAA`), moeda (`R$`), percentuais
- Formatação automática em campos (`onBlur`) para CPF/CNPJ, datas, valores monetários e percentuais
- Persistência de sessão via `localStorage`; estado de abas da calculadora via `sessionStorage`

### Backend

| Tecnologia | Versão | Finalidade |
|---|---|---|
| **Node.js** | LTS | Runtime JavaScript server-side (ES Modules) |
| **Express** | ^4.21.0 | Framework HTTP para rotas REST |
| **MariaDB (driver)** | ^3.4.5 | Connection pool para MariaDB/MySQL |
| **bcryptjs** | ^3.0.3 | Hashing de senhas (salt rounds: 10) |
| **cors** | ^2.8.6 | Middleware CORS com múltiplas origens configuráveis |
| **dotenv** | ^16.4.5 | Carregamento de variáveis de ambiente |

**Padrões adotados no backend:**
- ES Modules (`"type": "module"`) em todo o projeto
- Pool de conexões com MariaDB para gerenciamento eficiente de recursos
- Geração de códigos sequenciais por prefixo/ano (`ACD-2026-00001`, `AG-2026-001`)
- Row-Level Security implementada em nível de aplicação (filtros por `usuario_id` e `perfil`)
- Registro de auditoria (`deletados_log`) para todas as exclusões de acionamentos

### Banco de Dados

| Componente | Detalhes |
|---|---|
| **SGBD** | MariaDB / MySQL |
| **Banco** | `auxiliador_acionamentos` |
| **Tabelas principais** | `usuarios`, `acionamentos`, `aguas_guariroba`, `solicitacoes_cadastro`, `carteiras`, `codigo_sequencia`, `deletados_log` |
| **Migrações** | Scripts Node.js sequenciais em `backend/scripts/` |

### Infraestrutura de Desenvolvimento

| Recurso | Detalhes |
|---|---|
| **Dev Server Frontend** | Vite na porta `3088` com proxy `/api` → `localhost:3089` |
| **Dev Server Backend** | Express na porta `3089`, binding `0.0.0.0` (acesso em rede) |
| **CORS** | Múltiplas origens via variável `CORS_ORIGIN` |
| **Health Check** | Endpoint `GET /api/health` com verificação de conectividade ao banco |
| **Startup Script** | `INICIAR.bat` para inicialização simultânea (Windows) |

---

## ⚙ Funcionalidades Principais

### 🔐 Autenticação e Registro

- Login com usuário e senha (hash `bcrypt`); dados da sessão armazenados no `localStorage`
- Fluxo de auto-registro: colaboradores solicitam cadastro e aguardam aprovação de um administrador
- Identificação nas requisições via headers `X-User-Id` e `X-User-Perfil`

### 📝 Geração de Acionamentos (Dashboard)

- Seleção de **carteira** e **tipo de acordo** — formulário dinâmico renderizado conforme a combinação
- Campos configuráveis por carteira/tipo (até 15+ campos por modelo), com validação e formatação automática
- Regras de prazo máximo de vencimento por carteira (ex.: UNIMED = 2 dias, VUON CARD = 40 dias)
- Regras de desconto máximo por carteira (ex.: ANITA = 100%)
- Geração automática do texto do modelo de acionamento, pronto para cópia (`clipboard`)
- Salvamento no banco com código sequencial único (ex.: `ACD-2026-00001`)
- Vinculação automática ao conciliador logado

### 📊 Histórico de Acionamentos

- Listagem unificada de acionamentos normais e registros Águas Guariroba
- Filtros avançados: período (data início/fim), carteira, tipo, busca textual
- Administradores podem filtrar por conciliador específico
- Visualização detalhada por código ou ID
- Exclusão com registro em log de auditoria

### 💧 Calculadora Águas Guariroba (Urania)

- Módulo especializado com sistema de **múltiplas abas** (até 10 simultâneas, estado em `sessionStorage`)
- Cálculo automático de desconto por faixa de dias em atraso
- Suporte a acordos **à vista** e **parcelados** (entrada + parcelas)
- Validação de CPF/CNPJ, matrícula, valores e datas
- Geração de texto de acionamento e cópia para clipboard
- Persistência via API com código sequencial próprio (`AG-2026-001`)

### 👥 Gestão de Usuários

- CRUD completo de usuários (criar, editar, ativar/desativar, excluir)
- Atribuição de perfil: `conciliador`, `admin` ou `admin_supremo`
- Painel de solicitações de cadastro pendentes (aprovar/rejeitar)
- Exclusão protegida: registros vinculados impedem exclusão acidental (flag `?forcar=1` para forçar)

### 🗂 Gestão de Carteiras

- Ativação/desativação de carteiras em tempo real (sem necessidade de deploy)
- 12 carteiras pré-configuradas com regras de negócio embarcadas

### 🕐 Relógios em Tempo Real

- Exibição de horários de **Brasília** e **Campo Grande (MS)** via `Intl.DateTimeFormat`
- Útil para conciliadores que operam em fusos diferentes

### 📡 API REST — Endpoints

| Módulo | Método | Rota | Descrição |
|---|---|---|---|
| **Health** | `GET` | `/api/health` | Status do servidor e conectividade com o banco |
| **Auth** | `POST` | `/api/auth/login` | Autenticação por credenciais |
| **Usuários** | `GET POST PUT DELETE` | `/api/usuarios` | CRUD de usuários |
| **Solicitações** | `GET POST PATCH` | `/api/solicitacoes` | Registro e aprovação de cadastros |
| **Acionamentos** | `GET POST DELETE` | `/api/acionamentos` | Geração, listagem e exclusão de acionamentos |
| **Águas Guariroba** | `GET POST DELETE` | `/api/aguas-guariroba` | Registros da calculadora Águas Guariroba |
| **Carteiras** | `GET PATCH` | `/api/carteiras` | Listagem e toggle de ativação |
| **Log de Exclusões** | `GET` | `/api/deletados-log` | Auditoria de registros excluídos |

---

## 🔒 Controle de Acesso e Permissões

O sistema implementa três níveis hierárquicos de perfil com permissões distintas tanto no frontend (exibição condicional de menus e ações) quanto no backend (filtros por perfil em queries SQL):

| Funcionalidade | Conciliador | Admin | Admin Supremo |
|---|:---:|:---:|:---:|
| Dashboard (gerar acionamentos) | ✅ | ✅ | ✅ |
| Histórico (próprios registros) | ✅ | ✅ | ✅ |
| Histórico (todos os registros) | ❌ | ✅ | ✅ |
| Calculadora Águas Guariroba | ✅ | ✅ | ✅ |
| Excluir acionamento próprio | ✅ | ✅ | ✅ |
| Excluir acionamento de terceiros | ❌ | ❌ | ✅ |
| Gestão de Usuários | ❌ | ✅ | ✅ |
| Aprovar/Rejeitar Cadastros | ❌ | ✅ | ✅ |
| Gestão de Carteiras | ❌ | ✅ | ✅ |
| Log de Exclusões (Auditoria) | ❌ | ❌ | ✅ |

**Log de Auditoria:** Toda exclusão de acionamento ou registro Águas Guariroba é registrada na tabela `deletados_log`, com identificação do responsável pela exclusão, do dono original do registro, código do registro e resumo — acessível exclusivamente pelo perfil `admin_supremo`.

---

## 🚀 Guia de Setup e Execução (Local)

### Pré-requisitos

- **Node.js** v18+ (LTS recomendado)
- **MariaDB** ou **MySQL** instalado e em execução
- **npm** (incluso no Node.js)
- **Git**

### 1. Clonar o repositório

```bash
git clone https://github.com/seu-usuario/Auxiliador_de_Acionamentos_WEB.git
cd Auxiliador_de_Acionamentos_WEB
```

### 2. Instalar dependências

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Voltar à raiz
cd ..
```

### 3. Configurar o banco de dados

Crie o banco de dados no MariaDB/MySQL:

```sql
CREATE DATABASE auxiliador_acionamentos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Configurar variáveis de ambiente

**Backend** — copie o arquivo de exemplo e preencha:

```bash
cd backend
cp .env.example .env
```

Edite o `backend/.env` com as credenciais do seu banco:

```env
PORT=3089
CORS_ORIGIN=http://localhost:3088
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_NAME=auxiliador_acionamentos
SUPER_ADMIN_USUARIO=admin@portes.com
SUPER_ADMIN_SENHA=senha_segura
SUPER_ADMIN_NOME=Administrador
```

**Frontend** — copie o arquivo de exemplo:

```bash
cd ../frontend
cp .env.example .env
```

> Em ambiente de desenvolvimento, deixe `VITE_API_URL` vazio para utilizar o proxy do Vite (recomendado).

### 5. Executar os scripts de criação do banco

Na pasta `backend`, execute **na ordem indicada**:

```bash
cd ../backend

# 1. Criar tabela de usuários
node scripts/criar-tabela-usuarios.js

# 2. Adicionar coluna de perfil
node scripts/adicionar-perfil-usuarios.js

# 3. Criar tabela de solicitações de cadastro
node scripts/criar-tabela-solicitacoes.js

# 4. Criar tabela de acionamentos
node scripts/criar-tabela-acionamentos.js

# 5. Criar tabela de código sequencial
node scripts/criar-tabela-codigo-sequencia.js

# 6. Criar tabela Águas Guariroba
node scripts/criar-tabela-aguas-guariroba.js

# 7. Criar tabela de carteiras
node scripts/criar-tabela-carteiras.js

# 8. Criar tabela de log de exclusões
node scripts/criar-tabela-deletados-log.js

# 9. Criar o primeiro usuário (super admin)
node scripts/criar-tabela-e-super-admin.js
```

### 6. Iniciar a aplicação

**Opção A — Script automático (Windows):**

```bash
# Na raiz do projeto
INICIAR.bat
```

**Opção B — Manual (dois terminais):**

```bash
# Terminal 1 — Backend
cd backend
npm run dev
```

```bash
# Terminal 2 — Frontend
cd frontend
npm run dev
```

### 7. Acessar o sistema

| Serviço | URL |
|---|---|
| **Frontend** | http://localhost:3088 |
| **Backend API** | http://localhost:3089 |
| **Health Check** | http://localhost:3089/api/health |

---

## 🔑 Variáveis de Ambiente

### Backend (`backend/.env`)

| Variável | Descrição | Valor Padrão |
|---|---|---|
| `PORT` | Porta do servidor Express | `3089` |
| `CORS_ORIGIN` | Origens permitidas (separadas por vírgula) | `http://localhost:3088,http://10.100.20.137:3088` |
| `DB_HOST` | Host do MariaDB/MySQL | `localhost` |
| `DB_PORT` | Porta do banco | `3306` |
| `DB_USER` | Usuário do banco | `root` |
| `DB_PASSWORD` | Senha do banco | — |
| `DB_NAME` | Nome do banco de dados | `auxiliador_acionamentos` |
| `SUPER_ADMIN_USUARIO` | Login do super admin (script de criação) | — |
| `SUPER_ADMIN_SENHA` | Senha do super admin (script de criação) | — |
| `SUPER_ADMIN_NOME` | Nome do super admin (script de criação) | — |
| `SUPER_ADMIN_NOVO_USUARIO` | Novo login do super admin (script de atualização) | — |

### Frontend (`frontend/.env`)

| Variável | Descrição | Valor Padrão |
|---|---|---|
| `VITE_API_URL` | URL base da API. Vazio em dev (usa proxy do Vite). Em produção: URL completa do backend. | `""` (vazio) |

---

## 🗃 Scripts de Migração do Banco de Dados

Todos os scripts estão em `backend/scripts/` e devem ser executados com `node` a partir da pasta `backend`:

| Script | Descrição |
|---|---|
| `criar-tabela-usuarios.js` | Cria a tabela `usuarios` |
| `adicionar-perfil-usuarios.js` | Adiciona coluna `perfil` (ENUM) à tabela `usuarios` |
| `criar-tabela-solicitacoes.js` | Cria a tabela `solicitacoes_cadastro` |
| `criar-tabela-acionamentos.js` | Cria a tabela `acionamentos` com colunas por elemento |
| `criar-tabela-codigo-sequencia.js` | Cria a tabela `codigo_sequencia` para geração de códigos |
| `criar-tabela-aguas-guariroba.js` | Cria a tabela `aguas_guariroba` |
| `criar-tabela-carteiras.js` | Cria e popula a tabela `carteiras` |
| `criar-tabela-deletados-log.js` | Cria a tabela `deletados_log` (auditoria) |
| `criar-tabela-e-super-admin.js` | Cria o primeiro usuário super admin |
| `adicionar-colunas-acionamentos.js` | Migração: adiciona colunas de elementos em `acionamentos` |
| `adicionar-coluna-valor-para-pagamento.js` | Migração: adiciona coluna `valor_para_pagamento` |
| `alter-usuario-id-set-null.js` | Migração: altera FK `usuario_id` para `ON DELETE SET NULL` |
| `atualizar-login-super-admin.js` | Utilitário: atualiza o login do super admin |

---

## 📁 Estrutura do Projeto

```
Auxiliador_de_Acionamentos_WEB/
│
├── frontend/                          # Aplicação React (SPA)
│   ├── src/
│   │   ├── api/
│   │   │   └── config.js             # URL base da API
│   │   ├── components/
│   │   │   ├── ConfirmModal.jsx       # Modal de confirmação/alerta
│   │   │   └── Relogios.jsx           # Relógios Brasília / Campo Grande
│   │   ├── data/
│   │   │   ├── config.js             # Carteiras, tipos, campos, prazos e regras
│   │   │   └── mockHistorico.js       # Helpers de extração de dados
│   │   ├── pages/
│   │   │   ├── Hero.jsx              # Landing page
│   │   │   ├── Login.jsx             # Tela de login
│   │   │   ├── Registro.jsx          # Solicitação de cadastro
│   │   │   ├── Dashboard.jsx         # Geração de acionamentos
│   │   │   ├── Historico.jsx         # Histórico com filtros
│   │   │   ├── AguasGuariroba.jsx    # Calculadora Águas Guariroba
│   │   │   ├── Usuarios.jsx          # Gestão de usuários
│   │   │   ├── Carteiras.jsx         # Gestão de carteiras
│   │   │   └── Exclusoes.jsx         # Log de exclusões (auditoria)
│   │   ├── utils/
│   │   │   ├── auth.js               # Login, logout, getUser, isAdmin, etc.
│   │   │   ├── validators.js         # CPF, CNPJ, data, moeda, porcentagem
│   │   │   └── fieldValidators.js    # Validação e formatação por campo
│   │   ├── App.jsx                    # Rotas e ProtectedAdminRoute
│   │   ├── App.css
│   │   ├── index.css                  # Variáveis CSS e tema dark
│   │   └── main.jsx                   # Entry point (BrowserRouter)
│   ├── vite.config.js                 # Vite: proxy /api → backend
│   ├── .env.example
│   └── package.json
│
├── backend/                           # API REST (Node.js + Express)
│   ├── routes/
│   │   ├── auth.js                    # POST /api/auth/login
│   │   ├── usuarios.js                # CRUD /api/usuarios
│   │   ├── solicitacoes.js            # /api/solicitacoes
│   │   ├── acionamentos.js            # /api/acionamentos
│   │   ├── aguasGuariroba.js          # /api/aguas-guariroba
│   │   ├── carteiras.js               # /api/carteiras
│   │   └── deletadosLog.js            # /api/deletados-log
│   ├── lib/
│   │   ├── camposAcionamento.js       # Mapeamento label → coluna DB
│   │   └── carteirasLista.js          # Lista de carteiras (seed + validação)
│   ├── scripts/                       # Migrações e utilitários de banco
│   ├── db.js                          # Connection pool MariaDB
│   ├── server.js                      # Entry point Express
│   ├── .env.example
│   └── package.json
│
├── INICIAR.bat                        # Script de inicialização (Windows)
├── LOGICA_DATA_VENCIMENTO.md          # Documentação de regras de vencimento
└── README.md                          # Esta documentação
```

---

## 🌐 Deploy em Produção

1. **Backend:** Execute o servidor Express atrás de um **reverse proxy** (Nginx ou Apache) com **HTTPS** habilitado. Configure `CORS_ORIGIN` com a(s) origem(ens) exata(s) do frontend em produção.

2. **Frontend:** Defina `VITE_API_URL` com a URL pública do backend e gere o build:

```bash
cd frontend
npm run build
```

Sirva o conteúdo de `frontend/dist` por um servidor HTTP com HTTPS (Nginx, Apache, etc.).

3. **Banco de dados:** Garanta que o MariaDB/MySQL está acessível pelo backend com as credenciais configuradas em `.env`.

4. **CORS:** Em `CORS_ORIGIN`, inclua exatamente a(s) URL(s) de onde o frontend será servido em produção (ex.: `https://acionamentos.portes.adv.br`).

---

## ✍ Autoria e Status

<table>
  <tr>
    <td><strong>Arquitetura e Desenvolvimento</strong></td>
    <td>Wesley da Cruz Gomes</td>
  </tr>
</table>

| | |
|---|---|
| **Status** | 🟢 Entregue e Concluido |
| **Organização** | Portes Advogados |
| **Departamento** | Tecnologia e Automação |
| **Uso** | Exclusivamente interno |

---

<p align="center">
  <sub>© Portes Advogados — Departamento de Tecnologia e Automação. Todos os direitos reservados.</sub>
</p>

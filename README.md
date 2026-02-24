# Auxiliador de Acionamentos (Web)

Sistema para geração de modelos de acionamento por carteira e tipo, com histórico por usuário e gestão de conciliadores (admin).

---

## Tecnologias

- **Frontend:** React (Vite), React Router
- **Backend:** Node.js, Express, MariaDB/MySQL
- **Autenticação:** login por usuário e senha (hash bcrypt); identificação por headers `X-User-Id` e `X-User-Perfil`

---

## Pré-requisitos

- Node.js (LTS recomendado)
- MariaDB ou MySQL
- npm (ou yarn/pnpm)

---

## Instalação

1. Clone o repositório e entre na pasta do projeto.

2. Instale as dependências na raiz, no frontend e no backend:

   ```bash
   npm install
   cd frontend && npm install && cd ..
   cd backend && npm install && cd ..
   ```

3. Crie o banco de dados no MariaDB/MySQL (ex.: `auxiliador_acionamentos`).

4. Configure o backend com variáveis de ambiente. Na pasta `backend`, crie um arquivo `.env` (ou copie de um exemplo, se houver). Exemplo:

   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=sua_senha
   DB_NAME=auxiliador_acionamentos
   PORT=3089
   CORS_ORIGIN=http://localhost:3088,http://10.100.20.137:3088
   ```

   Ajuste `CORS_ORIGIN` conforme as origens de onde o frontend será acessado (URL do Vite em dev ou da aplicação em produção).

5. (Opcional) Frontend: na pasta `frontend`, crie `.env` a partir de `.env.example` e ajuste se precisar (veja seção [Frontend](#frontend) abaixo).

---

## Banco de dados – criação das tabelas

Execute os scripts **na pasta `backend`** e **na ordem indicada**:

| Ordem | Script | Descrição |
|-------|--------|-----------|
| 1 | `node scripts/criar-tabela-usuarios.js` | Tabela `usuarios` |
| 2 | `node scripts/adicionar-perfil-usuarios.js` | Coluna de perfil (admin/conciliador) em `usuarios` |
| 3 | `node scripts/criar-tabela-solicitacoes.js` | Tabela `solicitacoes` (pedidos de cadastro) |
| 4 | `node scripts/criar-tabela-acionamentos.js` | Tabela `acionamentos` (histórico, com coluna por elemento) |
| 5 | `node scripts/criar-tabela-aguas-guariroba.js` | Tabela `aguas_guariroba` (histórico da calculadora Águas Guariroba) |
| 6 | `node scripts/criar-tabela-e-super-admin.js` | Cria o primeiro usuário admin (super admin) |

**Se a tabela `acionamentos` já existir** (criada por versão antiga do script), use o script de migração para adicionar as colunas de elementos:

```bash
cd backend
node scripts/adicionar-colunas-acionamentos.js
```

**Outros scripts úteis:**

- `node scripts/atualizar-login-super-admin.js` — altera o usuário do super admin (variável de ambiente `SUPER_ADMIN_NOVO_USUARIO`).

---

## Como rodar

### Desenvolvimento

- **Tudo de uma vez (Windows):** use o arquivo `INICIAR.bat` na raiz do projeto. Ele sobe frontend (porta 3088) e backend (porta 3089) e mostra as URLs (localhost e IP da rede).

- **Manual:**

  ```bash
  # Terminal 1 – backend
  cd backend && npm run dev

  # Terminal 2 – frontend
  cd frontend && npm run dev
  ```

- **Raiz do projeto (com concurrently):**

  ```bash
  npm run start:all
  ```

Acesse o frontend em **http://localhost:3088** (ou no IP exibido pelo `INICIAR.bat`).

### Build para produção

```bash
npm run build
```

Isso gera a build do frontend em `frontend/dist`. Sirva essa pasta com um servidor HTTP (Nginx, Apache, etc.) e configure a API (veja [Produção](#produção)).

---

## Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DB_HOST` | Host do banco | `localhost` |
| `DB_PORT` | Porta do banco | `3306` |
| `DB_USER` | Usuário do banco | `root` |
| `DB_PASSWORD` | Senha do banco | (vazio) |
| `DB_NAME` | Nome do banco | `auxiliador_acionamentos` |
| `PORT` | Porta do servidor Express | `3089` |
| `CORS_ORIGIN` | Origens permitidas (CORS), separadas por vírgula | `http://localhost:3088,...` |

Para o script do super admin:

- `SUPER_ADMIN_USUARIO`, `SUPER_ADMIN_SENHA`, `SUPER_ADMIN_NOME` (em `criar-tabela-e-super-admin.js`)
- `SUPER_ADMIN_NOVO_USUARIO` (em `atualizar-login-super-admin.js`)

### Frontend (`frontend/.env`)

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL base da API. **Vazio** em dev: usa o proxy do Vite (recomendado). Em produção: URL do backend (ex.: `https://api.seudominio.com`). |

---

## Funcionalidades principais

- **Login** por usuário e senha; **registro** com solicitação de cadastro; admin **aprova ou rejeita** pedidos.
- **Dashboard:** escolha de carteira e tipo de acionamento, formulário dinâmico por modelo, regras de data de vencimento, geração do texto do modelo, copiar, limpar e **salvar no histórico** (dados gravados em colunas por elemento).
- **Histórico:** listagem com filtros (data, carteira, tipo, busca); **admin** pode filtrar por conciliador; detalhe por código ou id.
- **Usuários** (somente admin): listar, criar, editar e excluir usuários; perfis admin e conciliador; conciliador não acessa esta tela.

Regras de negócio (carteiras, tipos, campos por tipo, prazos) estão em `frontend/src/data/config.js` e em `LOGICA_DATA_VENCIMENTO.md` para datas.

---

## Produção

1. **API:** deixe o backend rodando atrás de um reverse proxy (Nginx/Apache) com **HTTPS**.
2. **Frontend:** defina `VITE_API_URL` com a URL pública do backend e faça o build (`npm run build`). Sirva o conteúdo de `frontend/dist` por HTTPS.
3. **CORS:** em `CORS_ORIGIN` no backend, inclua exatamente a(s) origem(ões) do frontend (ex.: `https://app.seudominio.com`).
4. **404 no POST /api/acionamentos:** em dev, se o front for acessado por IP (ex.: `http://10.100.20.137:3088`), o proxy do Vite encaminha `/api` para `localhost:3089`. O **backend precisa estar rodando na mesma máquina** em que o Vite está. Em produção, o front deve usar `VITE_API_URL` apontando para o backend.

---

## Estrutura resumida do projeto

```
Auxiliador_de_Acionamentos_WEB/
├── frontend/           # React (Vite)
│   ├── src/
│   │   ├── api/        # Config e chamadas à API
│   │   ├── components/ # ConfirmModal, Relogios, etc.
│   │   ├── data/       # config.js (carteiras, tipos, campos)
│   │   ├── pages/      # Hero, Login, Registro, Dashboard, Historico, Usuarios
│   │   └── utils/      # auth, validators, fieldValidators
│   └── vite.config.js  # proxy /api -> backend
├── backend/
│   ├── lib/            # camposAcionamento.js (mapeamento label -> coluna)
│   ├── routes/         # auth, usuarios, solicitacoes, acionamentos
│   ├── scripts/        # criação de tabelas e migração
│   ├── db.js
│   └── server.js
├── INICIAR.bat         # Sobe front e back (Windows)
├── LOGICA_DATA_VENCIMENTO.md
└── README.md           # Esta documentação
```

---

## Licença

Uso interno / conforme definido pelo projeto.

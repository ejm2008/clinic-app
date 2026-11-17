# Clínica Médica — Agenda e Laudos

Sistema full-stack para gerenciamento de agendamentos de exames e publicação de laudos médicos, estruturado em monorepo (`packages/shared`, `apps/api` e `apps/web`).

## Pré-requisitos

- **Node.js** 20+ e **npm**
- **Docker** e **Docker Compose** (ou uma instância PostgreSQL 16 disponível)

---

## 1. Instalação e Execução

1. **Instale as dependências** na raiz do repositório:

   ```bash
   npm install
   ```

2. **Compile o pacote compartilhado** (`@clinic/shared`), necessário para a API e os testes:

   ```bash
   npm --workspace=packages/shared run build
   ```

3. **Configure as variáveis de ambiente** copiando o arquivo de exemplo para a raiz e para `apps/api`:

   - Na raiz (`.env`): usada pelo Docker Compose (opcionalmente altere `POSTGRES_PORT` caso a porta `5432` já esteja em uso):
     ```env
     POSTGRES_PORT=5432
     ```
   - Em `apps/api/.env` (baseado em `.env.example`):
     ```env
     DATABASE_URL="postgresql://clinic:clinic123@localhost:5432/clinic_db?schema=public"
     JWT_SECRET="dev-secret-change-in-production"
     PORT=3001
     ```
     > Se alterar `POSTGRES_PORT` no `.env` da raiz (por exemplo, `5433`), atualize a porta na `DATABASE_URL` de `apps/api/.env` para corresponder.

4. **Inicie o projeto em modo de desenvolvimento** (API + Web simultaneamente):

   ```bash
   npm run dev
   ```

   - **Frontend (`@clinic/web`)**: http://localhost:5173
   - **Backend (`@clinic/api`)**: http://localhost:3001

---

## 2. Preparação do Banco de Dados

1. **Suba o PostgreSQL com Docker Compose**:

   ```bash
   docker compose up -d
   ```

2. **Gere o Prisma Client**:

   ```bash
   npm run db:generate
   ```

3. **Sincronize o schema do Prisma com o banco**:

   ```bash
   npm --workspace=apps/api run db:push
   ```

4. **Popule o banco com os dados iniciais (seed)**:

   ```bash
   npm run db:seed
   ```

### Contas de teste criadas pelo seed

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Equipe (`STAFF`) | `equipe@clinica.com` | `staff123` |
| Paciente (`PATIENT`) | `joao@paciente.com` | `paciente123` |
| Paciente (`PATIENT`) | `maria@paciente.com` | `paciente123` |

O seed também cria agendamentos de exemplo e laudos (um publicado e um em rascunho).

---

## 3. Execução dos Testes

### Testes unitários e de integração da API (Jest)

Executa as suítes de `@clinic/api` e `@clinic/web`:

```bash
npm test
```

Para executar apenas um workspace:

```bash
npm --workspace=apps/api test
npm --workspace=apps/web test
```

### Testes End-to-End (Playwright)

1. **Instale os navegadores do Playwright** (necessário na primeira vez):

   ```bash
   npx playwright install
   ```

2. **Execute os testes E2E** (certifique-se de que o banco esteja ativo e populado com `npm run db:seed`):

   ```bash
   npm run test:e2e
   ```

   > O `e2e/playwright.config.ts` reutiliza automaticamente os servidores se `npm run dev` já estiver rodando em `http://localhost:5173`, ou os inicia automaticamente caso não estejam.

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

---

## 4. Decisões Técnicas

### Origem e planejamento (`/plan`)

O projeto foi concebido a partir de um planejamento inicial (`/plan`) estruturado em **monorepo com npm workspaces** para isolar responsabilidades sem duplicar regras de negócio:

- `packages/shared`: fonte única para enums (`UserRole`, `ExamType`, `AppointmentStatus`, `ReportStatus`), DTOs e schemas de validação (`zod`).
- `apps/api`: API REST em Express + TypeScript conectada ao PostgreSQL via Prisma ORM.
- `apps/web`: SPA em React + Vite + Tailwind CSS + TanStack Query + React Router.
- `e2e`: suíte de testes ponta a ponta com Playwright.

### Escolhas de arquitetura e implementação

- **PostgreSQL + Prisma ORM**: escolhido pela consistência transacional (ACID) e integridade referencial entre usuários, perfis de pacientes, agendamentos e laudos. O agendamento utiliza transação com isolamento `Serializable` para impedir condições de corrida no bloqueio de horários de 30 minutos.
- **Interoperabilidade do `@clinic/shared`**: o pacote compila para CommonJS (`packages/shared/tsconfig.json` com `moduleResolution: "Node"`) para atender a API e o Jest, enquanto o `apps/web/vite.config.ts` aponta `@clinic/shared` via `resolve.alias` diretamente para `packages/shared/src/index.ts`, permitindo consumo nativo em ESM pelo Vite.
- **Cancelamento em vez de exclusão física**: agendamentos não possuem remoção (`DELETE`); o cancelamento altera o status para `CANCELLED`, preservando o histórico e liberando automaticamente o horário para novos agendamentos (exceto quando já há laudo publicado).
- **Visibilidade e imutabilidade de laudos**: laudos em `DRAFT` são acessíveis apenas pela equipe (`STAFF`). Após publicados (`PUBLISHED`), tornam-se somente leitura e visíveis exclusivamente para o paciente vinculado.
- **Testes em duas camadas**:
  - **Jest** (`apps/api` com `supertest` e mock do Prisma; `apps/web` com React Testing Library) para feedback rápido de regras de negócio e componentes.
  - **Playwright** (`e2e/tests/clinic.spec.ts`) para validar os fluxos reais entre interface, API e banco PostgreSQL.

### Possíveis melhorias

- **Múltiplas salas e profissionais**: evoluir a verificação de conflito de horário para considerar sala/equipamento específico e profissional responsável.
- **Migrações versionadas (`prisma migrate`)**: adotar histórico formal de migrations em `apps/api/prisma/migrations` no lugar de `prisma db push` para ambientes de produção.
- **Paginação nas listagens**: implementar paginação e ordenação nas rotas de agendamentos, laudos e pacientes para escalar com grandes volumes de dados.
- **Exportação em PDF e notificações**: permitir download de laudos publicados em PDF e envio de notificações (e-mail/SMS) ao confirmar agendamentos ou publicar laudos.
- **Recuperação de senha e refresh tokens**: adicionar fluxo de redefinição de senha e renovação de sessão para maior segurança em produção.
- **Ajuste completo de `typecheck` e CI**: alinhar `moduleResolution` em `apps/api/tsconfig.json` e adicionar tipos `vite/client` em `apps/web` para que `npm run typecheck` passe integralmente em todos os workspaces, integrando `typecheck`, `npm test` e `npm run test:e2e` em uma pipeline de CI.

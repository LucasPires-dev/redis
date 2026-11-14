# Redis

Aplicação web da plataforma **Redis**, voltada à gestão de igrejas com múltiplos
campus. A interface reúne operações de pessoas, ministérios, células,
reconciliação e produção de eventos em um painel responsivo.

> **Nota:** Redis é o nome do produto; não é uma interface de administração do
> servidor Redis.

## Funcionalidades

- Painel de gestão com navegação organizada por área.
- Experiências para pessoas, ministérios, células e lideranças.
- Fluxo de acompanhamento de novos convertidos.
- Módulo de produção de eventos, demandas, escala e checklist.
- Login com autenticação JWT e navegação condicionada ao perfil do usuário.
- Interface responsiva construída com componentes React reutilizáveis.

As telas de pessoas, ministérios, células, reconciliação e produção consomem a
API. Algumas áreas, como o dashboard, campus, cursos e eventos gerais, ainda
usam dados locais de demonstração; a integração com o backend nessas telas está
em andamento.

## Tecnologias

| Área | Tecnologias |
| --- | --- |
| Interface | React 19, TypeScript |
| Framework e rotas | TanStack Start, TanStack Router |
| Dados e formulários | TanStack Query, React Hook Form, Zod |
| Estilos e componentes | Tailwind CSS, Radix UI |
| Gráficos e ícones | Recharts, Lucide |
| Desenvolvimento e build | Vite, npm |

## Pré-requisitos

- Node.js compatível com Vite 8.
- npm.
- A API Redis em execução para usar as telas integradas.

## Instalação e configuração local

### 1. Instale as dependências

Na raiz deste repositório:

```powershell
npm ci
```

### 2. Configure a URL da API

Crie `.env` a partir do exemplo, caso ainda não exista:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

No `.env`, configure a URL do backend local:

```dotenv
VITE_API_URL=http://127.0.0.1:8000
```

O valor deve corresponder ao endereço em que a API está rodando. Se o backend
for iniciado pelo Docker Compose, use `http://127.0.0.1:8090`. Não coloque
credenciais ou segredos do backend neste arquivo.

### 3. Inicie o frontend

```powershell
npm run dev
```

Abra no navegador o endereço informado pelo Vite, normalmente
`http://localhost:8080`. Se essa porta estiver ocupada, o Vite pode selecionar
uma porta próxima; a origem correspondente também precisa estar permitida em
`CORS_ALLOWED_ORIGINS` na API.

Para login e operações integradas, mantenha o backend ativo e use uma conta
válida da aplicação.

## Scripts disponíveis

```powershell
npm run dev      # Servidor local de desenvolvimento
npm run build    # Build de produção
npm run preview  # Pré-visualização do build
npm run lint     # ESLint
```

## Organização do código

```text
src/
├── components/ # Componentes compartilhados e biblioteca de interface
├── lib/        # Cliente da API, autenticação e utilitários
├── routes/     # Rotas file-based do TanStack Router
└── router.tsx  # Configuração do roteador
```

As rotas são definidas por arquivos em `src/routes/`. Consulte
[`src/routes/README.md`](src/routes/README.md) para as convenções do roteamento.

## Configuração da API e segurança

- `VITE_API_URL` define o endereço base usado para chamadas HTTP e WebSockets.
- O backend deve permitir a origem local do frontend em sua configuração CORS.
- Arquivos `.env` são locais; não inclua tokens, senhas ou outras credenciais no
  repositório.

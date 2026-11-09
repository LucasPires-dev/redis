# Redis · Web

Front-end de gestão para uma **igreja com vários campus**: pessoas, ministérios, células, equipes, a **produção dos cultos em tempo real** e o acompanhamento de novos convertidos. Cada líder vê só o que lhe cabe, conforme o seu papel.

> API: [redis-api](https://github.com/LucasPires-dev/redis-api)

## ✨ Telas

| Área | O que faz |
|---|---|
| **Pessoas** | Cadastro e perfil dos membros |
| **Ministérios** | Visão de um ministério em todos os campus (líder geral) ou em um campus só (líder local), com as equipes |
| **Células** | Células e suas lideranças |
| **Produção** | Roteiro do culto com status por item, demandas entre equipes, escala e checklist, **sincronizados ao vivo** |
| **Reconciliação** | Dashboard de acompanhamento dos novos convertidos |
| **Campus, eventos e cursos** | Telas de protótipo com dados de exemplo, ainda sem integração com a API |

## 🛠️ Stack

React 19 · TypeScript · TanStack Start · TanStack Router · TanStack Query · Tailwind CSS · Radix UI (shadcn/ui) · React Hook Form · Zod · Recharts

## 🧠 Destaques técnicos

- **Tempo real sem estado duplicado**: o WebSocket só avisa o tipo de mudança, e o cliente invalida a *query* certa do TanStack Query, que busca de novo pela API. O REST continua sendo a única fonte de dados.
- **Visibilidade por papel**: uma regra central (`canAccessMinistryAtCampus`) decide o que cada nível de liderança enxerga e é aplicada em listas, telas e navegação. Documentação em [`docs/access-levels.md`](docs/access-levels.md).
- **Rotas tipadas por arquivo** com TanStack Router, incluindo rotas aninhadas como `/app/ministerios/:kind/:campusId/equipes/:teamId`.
- **Cliente HTTP com renovação automática do token JWT.**
- **Formulários validados** com React Hook Form e Zod.

## 🚀 Como rodar

```bash
npm install
cp .env.example .env     # VITE_API_URL apontando para a redis-api
npm run dev
```

O WebSocket usa a mesma URL da API, trocando `http` por `ws`.

Outros scripts: `npm run build`, `npm run lint`, `npm run format`.

## 📁 Estrutura

```
src/
  routes/        # telas (rotas baseadas em arquivo)
  lib/api/       # cliente HTTP, auth e WebSocket por domínio
  components/    # componentes de tela e UI (shadcn/ui)
docs/            # regras de acesso por papel
```

---

Desenvolvido por [Lucas C. Pires](https://github.com/LucasPires-dev) · Full-stack Python

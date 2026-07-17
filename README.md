# Rifa Solidária do Gustavo ⚽

Rifa online de 700 números (000–699) a R$ 40,00 para arrecadar fundos para testes em clubes de futebol de Portugal (meta: R$ 25.000; venda total: R$ 28.000). Prêmio: bicicleta elétrica 0 km. Sorteio pelos 3 últimos dígitos do 1º prêmio da **Loteria Federal** — se sair acima de 699, vale o 2º prêmio, e assim por diante.

**Stack:** Next.js (App Router) + TypeScript + Tailwind CSS + Drizzle ORM + Neon Postgres, hospedado na Vercel.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # e preencha as variáveis
npm run dev                  # http://localhost:3000
```

Com o banco configurado (`DATABASE_URL`), rode uma vez:

```bash
npm run db:push   # cria as tabelas
npm run db:seed   # popula os números 000–699
```

Sem banco, o site sobe em modo demonstração (grade toda livre, reservas desabilitadas).

## Scripts

| Script | Função |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run db:push` | aplica o schema no banco |
| `npm run db:seed` | popula os 700 números (idempotente) |
| `npm run admin:hash -- "senha"` | gera o hash da senha do admin |

## Documentação

- **[Painel do organizador](docs/painel-admin.md)** — acesso, segurança, dashboard, confirmação/cancelamento de pagamentos e rotina de operação.

## Mapa do projeto

```
src/
├── app/            # rotas: / (landing), /numeros (grade), /reserva/[id], /admin
├── actions/        # server actions: reservar, admin (confirmar/cancelar), auth
├── db/             # schema Drizzle, cliente Neon, queries, seed
├── lib/            # config da campanha, validação, sessão
└── components/     # ui/, grid/, landing/, admin/
```

A regra de negócio editável (preço, meta, chave Pix, WhatsApp, data do sorteio, prazo de reserva) fica toda em **`src/lib/config.ts`**.

## Garantia anti-concorrência

Duas pessoas não conseguem reservar o mesmo número: a reserva roda em **transação Postgres** com captura atômica (`UPDATE ... WHERE status = 'available'`). Se o rowcount não bater com a quantidade pedida, a transação inteira reverte e o comprador é avisado de quais números perdeu. Reservas não pagas **expiram em 1 semana** automaticamente (expiração lazy, sem cron; prazo configurável em `src/lib/config.ts`).

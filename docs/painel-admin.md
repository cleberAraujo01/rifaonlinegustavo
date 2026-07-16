# Painel do Organizador (`/admin`)

Área administrativa da rifa, feita para ser operada **pelo celular, em poucos toques**. Só o organizador tem acesso.

## Acesso e segurança

- **URL:** `/admin` (ex.: `http://localhost:3000/admin` em desenvolvimento).
- A rota é protegida por **cookie de sessão assinado** (JWT HS256 via `jose`, cookie `httpOnly` + `secure` + `sameSite=lax`, validade de 7 dias).
- Sem login válido, qualquer acesso a `/admin` **redireciona com HTTP 307 para `/admin/login`** (verificado em teste).
- O login é uma **senha única** do organizador:
  - A senha nunca fica no código — apenas o **hash bcrypt** na variável de ambiente `ADMIN_PASSWORD_HASH`.
  - O segredo que assina o cookie fica em `SESSION_SECRET`.
- Defesa em profundidade: além da guarda de página (`ensureAdminOrRedirect`), **toda server action administrativa revalida a sessão** (`requireAdmin`) antes de tocar no banco.

### Trocar a senha

```bash
npm run admin:hash -- "nova-senha-forte"
```

Copie a linha `ADMIN_PASSWORD_HASH="..."` gerada para o `.env.local` (local) e para as variáveis de ambiente na Vercel (produção). Sessões antigas continuam válidas até expirarem; para invalidar imediatamente, troque também o `SESSION_SECRET`.

> ⚠️ **No `.env.local`, escape os cifrões do hash**: o Next.js expande `$palavra` em arquivos `.env` como se fosse outra variável, corrompendo o valor. Escreva `\$2b\$12\$...` em vez de `$2b$12$...`. No painel da Vercel isso **não** é necessário (o valor é usado literalmente).

> ⚠️ A senha padrão de desenvolvimento (`rifa-gustavo-2026`) **deve ser trocada antes de divulgar o site**.

## Dashboard

No topo do painel, a visão geral da campanha em tempo real:

| Indicador | Descrição |
|---|---|
| **Arrecadado** | Soma apenas dos números **confirmados como pagos** × R$ 40 (valores em reserva não contam) |
| **% da meta** | Progresso sobre a meta de R$ 25.000, com barra visual |
| **✅ Pagos** | Números com pagamento confirmado |
| **🔒 Reservados** | Números com reserva ativa (dentro do prazo de 6h) |
| **⬜ Livres** | Números disponíveis na grade |

Reservas vencidas (mais de 6h sem confirmação) **não aparecem como reservadas** — a expiração é automática ("lazy"): o sistema as trata como livres na leitura e as libera de vez na próxima reserva, sem nenhuma ação do organizador.

## Lista "⏳ Aguardando pagamento"

Cada reserva pendente aparece como um cartão com:

- **Nome** do comprador e **horário** da reserva;
- Os **números** reservados e o **valor total**;
- Três ações:

| Botão | O que faz |
|---|---|
| **✓ Confirmar** | Marca o pedido como pago: os números ficam 🟡 dourados na grade pública e o valor entra no total arrecadado. Use depois de conferir o comprovante do Pix no WhatsApp. |
| **💬** | Abre a conversa do WhatsApp **com o comprador** (`wa.me/55...`) — útil para cobrar um comprovante que não chegou. |
| **✕ Cancelar** | Cancela o pedido e **devolve os números à grade** imediatamente. Pede confirmação antes de executar (ação irreversível). |

Abaixo fica a lista **"✅ Confirmados"**, com os mesmos cartões (sem o botão de confirmar) para consulta e, se necessário, cancelamento de uma confirmação feita por engano.

## Como funciona por dentro (para manutenção)

- Página: `src/app/admin/page.tsx` (server component, `force-dynamic`).
- Login: `src/app/admin/login/page.tsx` + `src/components/admin/LoginForm.tsx` + action `login` em `src/actions/auth.ts`.
- Sessão: `src/lib/session.ts` (criação, verificação e guardas).
- Ações: `src/actions/admin.ts` — `confirmarPagamento` e `cancelarPedido`, ambas em **transação** (pedido + números atualizados juntos, nunca um sem o outro) e com `revalidatePath` para atualizar o painel e a landing.
- Cartão: `src/components/admin/OrderCard.tsx` (client component com `useTransition`).

## Rotina sugerida do organizador

1. Chegou comprovante no WhatsApp → abrir `/admin`.
2. Achar o cartão pelo nome na lista "Aguardando pagamento".
3. Conferir se o valor do comprovante bate com o valor do cartão.
4. Tocar em **✓ Confirmar**. Pronto — a grade pública atualiza em até ~15 segundos.
5. Reserva pendente há horas sem comprovante? Tocar em **💬** e cobrar gentilmente — ou não fazer nada: em 6h ela expira sozinha.

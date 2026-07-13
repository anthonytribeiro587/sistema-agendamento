# Sistema de Agendamento — Sítio Emanuel

Aplicação em Next.js para apresentação do espaço, consulta de disponibilidade e gerenciamento de solicitações de reserva de sexta-feira a domingo.

## O que o sistema faz

### Área pública

- Exibe os próximos 12 meses de fins de semana em calendário.
- Mostra apenas `AVAILABLE` ou `UNAVAILABLE`, sem revelar publicamente se existe solicitação pendente, reserva confirmada ou bloqueio interno.
- Permite novas solicitações quando a data ainda não possui reserva confirmada nem bloqueio.
- Registra o pedido como `PENDING` e gera o atalho opcional para WhatsApp.
- Aplica validação no servidor, campo-isca contra bots e limite por origem.

### Área administrativa

- Login com Supabase Auth.
- Autorização pela tabela protegida `admin_users`, sem lista pública de e-mails administrativos.
- Listagem e gestão de solicitações.
- Confirmação, rejeição, cancelamento e reabertura.
- Reserva manual e bloqueio de datas.
- Histórico de mudanças de status.

## Regras principais

- Toda reserva começa em uma sexta-feira e termina no domingo.
- Mais de uma solicitação pode ficar pendente para a mesma data.
- Apenas uma reserva pode ficar `CONFIRMED` por fim de semana.
- Ao confirmar uma solicitação, as demais pendentes da data são rejeitadas na mesma transação.
- Pedidos pendentes expiram após 48 horas e são movidos para rejeitados com motivo de expiração.
- Bloquear uma data rejeita pedidos pendentes, mas nunca sobrescreve uma reserva confirmada.

## Privacidade da agenda

- Nome, telefone, e-mail, igreja, quantidade e observações nunca são enviados ao calendário público.
- O navegador recebe somente datas e o estado simplificado `AVAILABLE` ou `UNAVAILABLE`.
- Solicitações pendentes não são reveladas: continuam aparecendo como disponíveis até uma reserva ser confirmada.
- A função de disponibilidade é executada somente pelo backend com `service_role`.
- As tabelas permanecem protegidas por RLS e leitura administrativa.

## Stack

- Next.js 16 / React 19 / TypeScript
- Supabase Auth e PostgreSQL
- Tailwind CSS
- Vercel

## Recuperar o projeto em um Supabase novo

### 1. Criar o projeto

Crie um projeto vazio no Supabase e aguarde a inicialização do banco.

### 2. Executar as migrations

No SQL Editor do Supabase, execute integralmente e nesta ordem:

```text
supabase/migrations/202607130001_rebuild_booking_system.sql
supabase/migrations/202607130002_privacy_hardening.sql
```

A primeira migration cria tabelas, índices, RLS e funções transacionais. A segunda reduz a exposição da agenda pública e restringe a RPC de disponibilidade ao backend.

> Em um banco que já recebeu a primeira migration, execute somente `202607130002_privacy_hardening.sql`.

### 3. Criar o usuário administrador

Em **Authentication → Users**, crie o usuário que acessará o painel. Depois execute no SQL Editor, substituindo o e-mail:

```sql
insert into public.admin_users (user_id, email)
select id, email
from auth.users
where lower(email) = lower('admin@exemplo.com')
on conflict (user_id) do update
set email = excluded.email,
    active = true;
```

### 4. Configurar variáveis

Copie `.env.example` para `.env.local` no ambiente local e configure as mesmas variáveis na Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_WHATSAPP_NUMBER=5551995092781
RATE_LIMIT_SALT=uma-chave-aleatoria-grande
```

A `SUPABASE_SERVICE_ROLE_KEY` é somente do servidor. Nunca use essa chave em variável iniciada por `NEXT_PUBLIC_`.

### 5. Instalar e validar

```bash
npm install
npm run lint
npm run build
npm run dev
```

## Fluxo de publicação recomendado

1. Trabalhar em uma branch.
2. Executar lint e build antes do push.
3. Fazer um único merge na `main` quando o Supabase e as variáveis estiverem prontos.
4. Validar login, calendário, solicitação pública, confirmação, bloqueio e reserva manual no deploy final.

## Deploy atual

https://sistema-agendamento-beta.vercel.app/

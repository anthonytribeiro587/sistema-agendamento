# 📅 Sistema de Agendamento – Sítio Emanuel

Aplicação web fullstack para gerenciamento de reservas de fins de semana em um sítio, permitindo controle de disponibilidade, solicitação de agendamentos e administração das reservas.

## 🚀 Deploy
👉 https://sistema-agendamento-beta.vercel.app/

---

## 📌 Sobre o projeto

O sistema foi desenvolvido para resolver o controle manual de reservas, oferecendo uma solução digital para:

- Visualizar datas disponíveis
- Solicitar reservas
- Gerenciar pedidos de agendamento
- Controlar status das reservas

---

## ⚙️ Funcionalidades

### 👤 Público
- Visualização de calendário com datas disponíveis
- Solicitação de reserva
- Status inicial como **PENDING**

### 🔐 Administrativo
- Login de administrador
- Visualização de todas as reservas
- Aprovação (**CONFIRMED**) ou rejeição (**REJECTED**) de pedidos
- Cancelamento de reservas (**CANCELLED**)
- Bloqueio manual de datas
- Gestão de finais de semana (sexta a domingo)

---

## 🛠️ Tecnologias utilizadas

- **Frontend:** Next.js (App Router), React, TypeScript  
- **Backend:** API Routes (Next.js)  
- **Banco de Dados:** Supabase  
- **Autenticação:** Supabase Auth  
- **Estilização:** CSS / Tailwind (se estiver usando)  
- **Versionamento:** Git / GitHub  
- **Deploy:** Vercel  

---

## 🧠 Regras de Negócio

- Reservas públicas são criadas com status **PENDING**
- Reservas feitas pelo admin são automaticamente **CONFIRMED**
- Apenas finais de semana (sexta a domingo) são válidos
- Datas podem ser bloqueadas manualmente
- Cada reserva passa por validação antes de confirmação

---

## 📂 Estrutura do projeto
app/
api/
bookings/
blocks/
admin/
agenda/
components/
lib/


---

## 💻 Como rodar o projeto localmente

# Clonar repositório
git clone https://github.com/SEU-USUARIO/SEU-REPO

# Entrar na pasta
cd sistema-agendamento

# Instalar dependências
npm install

# Rodar o projeto
npm run dev

🔐 Variáveis de ambiente

Crie um arquivo .env.local:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

📈 Melhorias futuras
Notificações por e-mail
Dashboard com métricas
Testes automatizados
Melhorias de UX/UI
Deploy com domínio próprio

👨‍💻 Autor

Anthony Thiago da Cruz Ribeiro

- 📧 anthony.tribeiro587@gmail.com
- 💼 LinkedIn (adicione aqui)https://www.linkedin.com/in/anthonytcribeiro

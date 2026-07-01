# Ritual diário

App de acompanhamento de rituais diários, humor, hidratação, macros e pirâmide alimentar.
Funciona como **PWA** (instalável no celular, funciona offline) e sincroniza entre dispositivos via **Supabase**.

> 📱 **Primeira instalação no celular**: abra a URL publicada → o navegador mostra um banner
> "Instalar app" → clique em **Instalar** → vira ícone na tela inicial, abre em tela cheia e
> funciona offline. No iPhone (Safari): Compartilhar → "Adicionar à Tela de Início".

---

## 📂 Estrutura do projeto

O app inteiro é um **HTML standalone** servido pela pasta `public/`. O Next.js só faz o
hosting — toda a lógica vive no `ritual.html`.

```
public/
├── ritual.html            ← APP COMPLETO (HTML + CSS + JS num arquivo só)
├── manifest.json          ← manifesto PWA (instalação no celular)
├── sw.js                  ← service worker (cache offline)
├── icon-192.png           ← ícone do app (192×192)
├── icon-512.png           ← ícone do app (512×512)
└── supabase_schema.sql    ← ⚠️ SCRIPT SQL PARA CRIAR AS TABELAS NO SUPABASE

src/app/page.tsx           ← só um <iframe> que carrega /ritual.html
next.config.ts             ← output: "standalone" (otimizado para deploy)
package.json               ← scripts: dev, build, start, lint
```

---

## 🚀 Deploy no Render

O Render pode hospedar isso como um **Web Service** (Node.js). Siga os passos:

### 1. Pré-requisitos
- Conta no [Render](https://render.com)
- Conta no [Supabase](https://supabase.com) (já configurada — veja abaixo)
- Repositório Git com este código (GitHub/GitLab)

### 2. Criar o Web Service no Render
1. No painel do Render → **New +** → **Web Service**
2. Conecte seu repositório Git
3. Configurações:
   - **Environment**: `Node` (ou `Bun` se preferir)
   - **Build Command**: `bun install && bun run build`
   - **Start Command**: `bun run start`
   - **Plan**: Free ou Starter (Free "dorme" após 15 min de inatividade — o app
     ainda funciona, só demora ~30s pra acordar no primeiro acesso)
4. **Create Web Service**
5. Aguarde o build terminar. Você vai receber uma URL tipo
   `https://seu-app.onrender.com`

> 💡 Se o build pedir versão específica do Node, use **Node 20+** ou **Bun 1.1+**.

### 3. Configurar o Supabase (TABELAS NOVAS — OBRIGATÓRIO)

O app já vem apontando para um projeto Supabase (URL e anon key estão em
`public/ritual.html`, linhas ~1023-1024). As tabelas originais (`checklist_items`,
`checklist_status`, `tasks`, `mood_log`) provavelmente já existem, mas as **tabelas
novas de nutrição ainda NÃO**. Sem elas, o app funciona (cai no fallback localStorage),
**mas não sincroniza** hidratação, macros, pirâmide, gratidão, módulos customizados
nem configurações de nutrição entre dispositivos.

Para criar todas as tabelas:

1. Abra seu projeto no [Supabase](https://supabase.com)
2. Vá em **SQL Editor** → **New query**
3. Abra o arquivo **`public/supabase_schema.sql`** deste repositório
   (ou copie o conteúdo dele)
4. Cole no editor e clique em **Run** ▶️
5. Pronto! O script cria:
   - Tabelas originais (com `if not exists` — não duplica se já existirem)
   - **Tabelas novas**: `water_log`, `macros_log`, `pyramid_log`,
     `nutrition_settings`, `gratitude_log`, `custom_modules`
   - Políticas RLS (permitem acesso via anon key)
   - Índices para performance

> ⚠️ O script é **idempotente** — pode rodar quantas vezes quiser sem quebrar nada.

### 4. (Opcional) Trocar as credenciais do Supabase

Se quiser usar **outro** projeto Supabase (não o que vem no código), edite
`public/ritual.html` nas linhas ~1023-1024:

```js
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "SUA_ANON_KEY";
```

As credenciais estão no painel do Supabase: **Project Settings → API**.

> 🔒 **Sobre segurança**: o app usa apenas a **anon key** (pública). As políticas RLS
> do SQL permitem leitura/escrita para qualquer um com a URL+key. Isso é OK para uso
> pessoal (os dados ficam no SEU projeto Supabase), mas **não compartilhe a URL
> publicamente**. Para privacidade real no futuro, adicione Supabase Auth e troque
> `TO anon` por `TO authenticated` no SQL.

---

## 💻 Desenvolvimento local

```bash
# instalar dependências
bun install

# rodar em modo dev (http://localhost:3000)
bun run dev

# build de produção
bun run build

# rodar o build de produção
bun run start

# verificar qualidade do código
bun run lint
```

Para testar o app diretamente (sem o iframe do Next.js), acesse:
`http://localhost:3000/ritual.html`

---

## 📱 Instalar no celular (PWA)

Depois de publicado no Render:

### Android (Chrome / Edge)
1. Abra a URL do Render no celular
2. O banner "📲 Instalar app" aparece no topo → clique **Instalar**
   - (Se não aparecer: menu ⋮ → **Adicionar à tela inicial**)
3. Vira ícone na tela inicial, abre em tela cheia

### iPhone / iPad (Safari)
1. Abra a URL no Safari
2. Toque em **Compartilhar** (ícone de quadrado com seta pra cima)
3. **Adicionar à Tela de Início**
4. Vira ícone na tela inicial

### Funcionamento offline
- Após o **primeiro acesso online**, o service worker (`sw.js`) faz cache de:
  - HTML, manifest, ícones
  - SDK do Supabase (CDN)
  - Fontes do Google
- Daí pra frente o app abre **100% offline**
- Dados digitados offline ficam no `localStorage` e sincronizam com o Supabase
  quando a conexão voltar

---

## 🧩 Funcionalidades

### Abas principais
- **Resumo** — dashboard do dia: % geral, humor, água, carboidratos, tarefas, pirâmide, gratidão
- **Manhã / Noturno / Saída / Semanal** — checklists de hábitos
- **Bem-estar** — checklist mental + humor + hidratação + macros + pirâmide + gratidão
- **Organização** — checklist de organização pessoal
- **Tarefas** — tarefas com data (hoje, amanhã, semana que vem, etc.)
- **Histórico** — sequências (streaks), conclusão 7 dias, humor 14 dias, etc.

### Recursos
- ✅ **Modo escuro** (toggle no header, persiste + detecta preferência do sistema)
- ✅ **Módulos customizados** (botão + na barra de abas — crie "Academia", "Estudos", etc.)
- ✅ **Hidratação configurável** — meta calculada por peso (kg × 35ml) ou manual
- ✅ **Macros** — carboidratos, proteínas, gorduras (meta vs consumido, em gramas)
- ✅ **Pirâmide alimentar configurável** — 5 grupos padrão, editável (nome, cor, ícone, meta, reordenar)
- ✅ **Tarefas para outros dias** — agrupadas por Atrasadas / Hoje / Amanhã / Semana / Próximas / Concluídas, com reagendamento via date picker
- ✅ **Sincronização entre dispositivos** via Supabase (checklist, tarefas, humor, hidratação, macros, pirâmide, gratidão, módulos custom, configurações)
- ✅ **Fallback offline** — tudo funciona no localStorage quando sem conexão
- ✅ **PWA instalável** + funciona offline

---

## 🗄️ Tabelas do Supabase

Referência rápida das tabelas (detalhes completos em `public/supabase_schema.sql`):

| Tabela | Uso |
|---|---|
| `checklist_items` | Itens de cada checklist ("Tomei banho", etc.) |
| `checklist_status` | Marcado/desmarcado por item + período (dia ou semana) |
| `tasks` | Tarefas avulsas com `day_key` (suporta outros dias) |
| `mood_log` | Humor diário (1-5) + nota |
| `water_log` | Copos de água por dia |
| `macros_log` | Carboidratos/proteínas/gorduras por dia (em gramas) |
| `pyramid_log` | Porções da pirâmide por grupo, por dia (JSON) |
| `nutrition_settings` | Configurações de nutrição (peso, copo, metas, grupos) — singleton |
| `gratitude_log` | 3 coisas boas por dia (JSON array) |
| `custom_modules` | Módulos criados pelo usuário (key, label, accent) |

---

## ❓ Troubleshooting

### O app abre mas não sincroniza (badge "offline (local)")
- Verifique se rodou o `supabase_schema.sql` no SQL Editor do Supabase
- Abra o console do navegador (F12) e veja os erros — requests 404 indicam
  tabelas faltando
- Confirme que a URL e anon key em `public/ritual.html` (linhas ~1023-1024)
  batem com seu projeto Supabase

### O banner "Instalar app" não aparece
- PWA exige **HTTPS** (Render já fornece por padrão) ✅
- No Chrome Android, o banner só aparece depois de algum engajamento
  (visite 2-3 vezes, ou use o menu ⋮ → "Adicionar à tela inicial")
- No desktop Chrome, o ícone de instalar fica na barra de endereço (ícone ⊕)

### O app não abre offline no celular
- O service worker só é registrado no **primeiro acesso online**
- Abra pelo menos uma vez online, espere carregar tudo, depois pode usar offline
- No iOS Safari, PWA offline é mais limitado — use Chrome Android quando possível

### Build falha no Render
- Confirme que está usando Node 20+ ou Bun 1.1+
- O `next.config.ts` usa `output: "standalone"` — não remova
- Se der erro de memória no build Free, faça upgrade para Starter

### Dados não aparecem em outro dispositivo
- Ambos os dispositivos precisam apontar para o **mesmo** projeto Supabase
- (mesmas `SUPABASE_URL` e `SUPABASE_ANON_KEY` no `ritual.html`)
- Verifique se rodou o SQL completo (todas as 10 tabelas)

---

## 📜 Licença

Projeto pessoal. Sinta-se livre para adaptar às suas necessidades.

---

**Resumo do fluxo de implantação:**
1. `git push` para o GitHub
2. Render detecta o push → build automático
3. (uma vez) Rode `public/supabase_schema.sql` no SQL Editor do Supabase
4. Abra a URL do Render no celular → Instalar app → pronto! 🎉

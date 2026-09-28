# Controle de Presença — Reunião de Obreiros

Sistema web para fazer a **chamada da Reunião de Obreiros** por **nome**, **cargo** e **congregação**,
com vários celulares ao mesmo tempo, tudo interligado, e **relatório em PDF** ao final de cada reunião.

- 33 congregações fixas e 6 cargos (Pastor, Evangelista, Presbítero, Diácono, Cooperador, Membro).
- **Cadastro de obreiros** (nome + cargo + congregação), mantido de uma reunião para outra.
- Chamada tocando no nome de quem está presente, mais a contagem de **não cadastrados** (visitantes/novos).
- Totais por cargo, por congregação e total geral calculados automaticamente (com dupla conferência).
- Vários aparelhos ao mesmo tempo, atualizando em tempo real.
- PDF A4 com resumo, lista geral de presentes em **ordem alfabética**, detalhamento de cada congregação
  (presentes em ordem alfabética) e resumo final.
- Cada nova reunião começa com **todas as contagens em zero**.

---

## 1. Como instalar

Requisitos: [Node.js](https://nodejs.org) 20 ou superior.

```bash
npm install
```

## 2. Como executar (no próprio computador)

```bash
npm run dev
```

Abra <http://localhost:3000>.

Sem as variáveis do Supabase, o sistema funciona em **modo local**: os dados ficam no arquivo
`data/estado.json` deste computador. É útil para testar. Para usar com vários celulares
pela internet, publique no Render (seção 8).

## 3. Como funciona a chamada

1. **Cadastro de obreiros** (tela inicial): informe nome, cargo e congregação.
   Depois de salvar, o cargo e a congregação continuam selecionados, para agilizar.
   Use **"Adicionar vários de uma vez"** para colar uma lista de nomes (um por linha).
   Um mesmo nome não pode ser cadastrado duas vezes na mesma congregação.
2. **+ NOVA REUNIÃO**: informe a data (obrigatória), o horário, o local e uma observação.
3. **Iniciar chamada**: aparecem o resumo (total geral, total por cargo, progresso) e as 33 congregações.
4. Toque em uma congregação para abrir a lista de obreiros dela, em ordem alfabética.
   **Toque no nome** para marcar presente (fica verde). Toque de novo para desmarcar.
5. **Não cadastrados**: use "+ Contar presentes não cadastrados" e os botões **−** / **+**
   (ou digite o número) para visitantes ou pessoas ainda sem cadastro.
6. A busca no topo encontra **congregações e nomes**: dá para marcar a presença direto no resultado.
7. **✓ Concluir congregação** marca que a chamada dela terminou. Continua sendo possível corrigir depois.
8. **Revisar chamada** mostra todas as congregações e destaca as ainda não conferidas.
9. **Finalizar chamada** pede confirmação e gera o PDF.

### Painel de totais (TV / projetor)

Abra **`/painel`** (ex.: `https://chamada-rbo.onrender.com/painel`), ou use o botão **📊 Painel de totais** na
tela inicial ou o quadro **Total 📊** no topo da chamada. Ele mostra, em números grandes e atualizando
ao vivo, o **total geral**, o **total de cada cargo** (Pastores, Evangelistas, Presbíteros, Diáconos,
Cooperadores e Membros), as congregações conferidas e o total de cada congregação.
O painel só mostra os números; nada pode ser alterado nele. Use **⛶ Tela cheia** para projetar.

Situação de cada congregação no relatório:

| Situação | Significado |
|---|---|
| **Conferida** | A chamada foi feita e há presentes. |
| **Conferida — 0 presentes** | A chamada foi feita e ninguém compareceu. |
| **Não conferida** | Ninguém marcou a congregação como concluída (a chamada pode não ter sido feita). |

## 4. Como os dados são salvos

| Dado | Onde fica |
|---|---|
| Cadastro de obreiros | Supabase (ou `data/estado.json` no modo local). Permanente. |
| Chamada da reunião atual | Supabase (ou `data/estado.json`). Substituída ao iniciar nova reunião. |
| Cópia de segurança da chamada | `localStorage` de cada aparelho. Se a chamada sumir do servidor, o aparelho oferece restaurá-la. |
| Histórico das reuniões | **Os arquivos PDF.** O sistema não guarda reuniões antigas. |

Atualizar a página ou fechar o navegador **não** apaga a chamada: ao voltar, a tela inicial mostra
"Chamada em andamento" com a data, o total e as congregações conferidas.

Contagens feitas sem internet ficam guardadas no aparelho e são enviadas quando a conexão voltar
(aparece uma faixa vermelha avisando).

## 5. Como gerar o PDF

**Finalizar chamada** → (se houver congregações não conferidas, confirme) → **Finalizar e gerar PDF**.
O arquivo é baixado com o nome `reuniao-obreiros-DD-MM-AAAA.pdf`.

- O PDF só é gerado se os totais conferirem (soma por cargo = soma por congregação).
- Depois de finalizada, a chamada fica travada. Use **Reabrir chamada** para corrigir e gerar de novo.
- **Baixar PDF** gera o arquivo novamente em qualquer aparelho.

Conteúdo do PDF: cabeçalho e rodapé com número da página, dados da reunião, total geral em destaque,
total por cargo, tabela por congregação, **lista geral de presentes (A–Z)**,
**detalhamento de cada congregação com os presentes (A–Z)** e resumo final.

## 6. Como iniciar uma nova reunião

**+ Nova reunião** (tela inicial ou após gerar o PDF).

- Se o PDF da reunião atual **ainda não foi gerado**, aparece o aviso com as opções
  **Voltar**, **Gerar PDF** e **Iniciar mesmo assim**.
- A nova reunião começa com **todas as contagens em zero**, nenhum presente e as 33 congregações
  como **não conferidas**. O **cadastro de obreiros é mantido**.

## 7. Build de produção

```bash
npm run build
npm start
```

Outros comandos: `npm test` (testes automáticos) e `npm run typecheck`.

## 8. Publicar na internet (Render + Supabase)

As duas contas são gratuitas para este uso.

### 8.1 Supabase (banco de dados)

1. Crie uma conta em <https://supabase.com> e clique em **New project**.
   Em *Region*, escolha **South America (São Paulo)**.
2. No projeto, abra **SQL Editor** → **New query**, cole todo o conteúdo de
   [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
3. Em **Project Settings → API Keys** (aba *Legacy*), copie:
   - **Project URL**
   - chave **anon / public**
   - chave **service_role** (secreta)

### 8.2 GitHub

Crie um repositório **privado** e envie este projeto (`git push`). O `.gitignore` já exclui
`node_modules`, `.next`, `data/` e os arquivos `.env` — a chave secreta nunca vai para o GitHub.

### 8.3 Render (hospedagem)

1. Em <https://dashboard.render.com>: **New → Blueprint** → conecte o GitHub e escolha o repositório.
   O arquivo [`render.yaml`](render.yaml) já define os comandos, a região e o plano gratuito.
2. O Render pede os valores de:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave service_role |

3. Clique em **Apply / Deploy**. Ao final, o Render mostra o link (ex.: `https://chamada-rbo.onrender.com`).
   Esse é o endereço que todos vão abrir no celular. O painel de totais fica em `/painel`.

Atualizações: a cada `git push`, o Render publica a nova versão sozinho.

> ℹ️ **Plano gratuito do Render:** o site "dorme" após 15 minutos sem acesso e a primeira abertura
> depois disso leva cerca de 1 minuto. Abra o link alguns minutos antes da reunião.
> Durante a chamada, com uso contínuo, ele fica rápido. Os dados não se perdem (ficam no Supabase).

> ⚠️ **Acesso:** o sistema não tem senha. Qualquer pessoa com o link consegue ver e alterar a chamada
> e o cadastro. Compartilhe o link só com a equipe da chamada.
> A chave `service_role` nunca vai para o navegador nem para o GitHub.

---
## Estrutura do projeto

```
src/
├── app/                      Páginas e rotas (Next.js App Router)
│   ├── page.tsx              Página única do sistema
│   └── api/chamada/          API: estado atual, operações e eventos em tempo real (modo local)
├── components/               Interface
│   ├── AppChamada.tsx        Controle das telas e das confirmações
│   ├── inicio/               Tela inicial e formulário de nova reunião
│   ├── cadastro/             Cadastro de obreiros
│   ├── chamada/              Chamada: cards, lista de presença, contadores, resumo
│   ├── revisao/              Revisão antes de finalizar
│   └── ui/                   Botões e modais
├── domain/                   Regras de negócio (puras, sem interface)
│   ├── cargos.ts             Cargos e ordem hierárquica
│   ├── congregacoes.ts       33 congregações fixas e busca
│   ├── obreiros.ts           Nomes e ordem alfabética
│   ├── calculos.ts           Totais, resumo e validação
│   ├── operacoes.ts          Todas as alterações possíveis e suas regras
│   ├── estado.ts             Conversão do estado armazenado
│   └── types.ts              Tipos TypeScript
├── hooks/
│   └── useChamadaSincronizada.ts   Sincronização em tempo real entre aparelhos
├── lib/                      Configuração, ids, cópia de segurança local
├── relatorio/gerarPdf.ts     Geração do PDF (jsPDF + jspdf-autotable)
└── server/                   Armazenamento (arquivo local ou Supabase) e serviço
supabase/schema.sql           Estrutura do banco
tests/                        Testes automáticos (Vitest)
```

**Como a sincronização funciona:** cada toque vira uma *operação* (ex.: "marcar presença de X").
O aparelho mostra o resultado na hora e envia a operação ao servidor, que a aplica sobre o estado
oficial usando controle de versão (dois aparelhos ao mesmo tempo nunca apagam a alteração um do
outro). Em seguida, todos os aparelhos recebem o novo estado em tempo real
(Supabase Realtime ou, no modo local, Server-Sent Events).

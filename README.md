# Projeto C — Controle de Estoque

**Aluno:** Pedro Queiroz de Souza

**Projeto escolhido:** C — Controle de Estoque

Pequena aplicação para uma loja controlar quantos produtos tem e quanto vale o estoque. Feita com Next.js, TypeScript, CSS puro, Drizzle e Neon, sem autenticação.

## Como rodar

1. Crie um banco novo no Neon e copie a connection string.
2. Copie `.env.example` para `.env.local` e cole a connection string em `DATABASE_URL`.
3. Rode:

```bash
npm install
npx drizzle-kit push
npm run dev
```

4. Abra http://localhost:3000.

## Rotas da API

| Método | Rota | O que faz |
| --- | --- | --- |
| GET | `/api/produtos` | Lista os produtos e devolve o resumo `{ totalProdutos, itensEmEstoque, valorTotalCentavos, abaixoDoMinimo }` |
| POST | `/api/produtos` | Cadastra um produto. Corpo: `{ nome, precoCentavos, quantidade?, estoqueMinimo? }` |
| PATCH | `/api/produtos/[id]/movimentar` | Registra entrada ou saída. Corpo: `{ "tipo": "entrada" \| "saida", "quantidade": 3 }` |
| DELETE | `/api/produtos/[id]` | Apaga o produto |


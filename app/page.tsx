"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Produto = {
  id: number;
  nome: string;
  precoCentavos: number;
  quantidade: number;
  estoqueMinimo: number;
  criadoEm: string;
};

type Resumo = {
  totalProdutos: number;
  itensEmEstoque: number;
  valorTotalCentavos: number;
  abaixoDoMinimo: number;
};

type Filtro = "todos" | "baixo";
type Tema = "claro" | "escuro";

const brl = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Aceita "12,50", "12.50" e "1.234,50"
function reaisParaCentavos(texto: string): number {
  const limpo = texto.trim();
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  return Math.round(Number(normalizado) * 100);
}

const formVazio = { nome: "", preco: "", quantidade: "0", estoqueMinimo: "5" };

// Número que "sobe" até o valor final, para os cartões ganharem vida
function useContagem(alvo: number, duracao = 700) {
  const [valor, setValor] = useState(0);
  const atual = useRef(0);

  useEffect(() => {
    const inicio = atual.current;
    const t0 = performance.now();
    let raf = 0;

    const passo = (agora: number) => {
      const p = Math.min((agora - t0) / duracao, 1);
      const suave = 1 - Math.pow(1 - p, 3);
      const novo = Math.round(inicio + (alvo - inicio) * suave);
      atual.current = novo;
      setValor(novo);
      if (p < 1) raf = requestAnimationFrame(passo);
    };

    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [alvo, duracao]);

  return valor;
}

type CartaoProps = {
  icone: string;
  rotulo: string;
  alvo: number;
  formatar?: (n: number) => string;
  tom?: "azul" | "verde" | "roxo" | "vermelho";
  alerta?: boolean;
  ativo?: boolean;
  dica?: string;
  onClick?: () => void;
};

function Cartao({ icone, rotulo, alvo, formatar, tom = "azul", alerta, ativo, dica, onClick }: CartaoProps) {
  const valor = useContagem(alvo);
  const conteudo = (
    <>
      <span className={`icone icone-${tom}`} aria-hidden="true">
        {icone}
      </span>
      <span className="cartao-texto">
        <span className="rotulo">{rotulo}</span>
        <strong>{formatar ? formatar(valor) : valor}</strong>
        {dica && <span className="dica">{dica}</span>}
      </span>
    </>
  );
  const classe = `cartao ${alerta ? "alerta" : ""} ${ativo ? "ativo" : ""}`;

  return onClick ? (
    <button type="button" className={`${classe} clicavel`} onClick={onClick} aria-pressed={ativo}>
      {conteudo}
    </button>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

export default function Home() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState(formVazio);
  const [qtds, setQtds] = useState<Record<number, string>>({});
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [confirmando, setConfirmando] = useState<number | null>(null);
  const [destaque, setDestaque] = useState<number | null>(null);
  const [tema, setTema] = useState<Tema>("claro");
  const temporizadorAviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const temporizadorDestaque = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tema: lembra a escolha e usa a preferência do sistema na primeira visita
  useEffect(() => {
    let inicial: Tema = window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
    try {
      const salvo = localStorage.getItem("tema");
      if (salvo === "claro" || salvo === "escuro") inicial = salvo;
    } catch {
      /* sem localStorage: segue com o padrão */
    }
    setTema(inicial);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  function alternarTema() {
    const novo: Tema = tema === "escuro" ? "claro" : "escuro";
    setTema(novo);
    try {
      localStorage.setItem("tema", novo);
    } catch {
      /* ignora */
    }
  }

  function mostrarAviso(texto: string) {
    setAviso(texto);
    if (temporizadorAviso.current) clearTimeout(temporizadorAviso.current);
    temporizadorAviso.current = setTimeout(() => setAviso(""), 2600);
  }

  function piscar(id: number) {
    setDestaque(id);
    if (temporizadorDestaque.current) clearTimeout(temporizadorDestaque.current);
    temporizadorDestaque.current = setTimeout(() => setDestaque(null), 800);
  }

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/produtos");
      const d = await r.json();
      if (!r.ok) throw new Error(d.erro ?? "Erro ao carregar os produtos.");
      setProdutos(d.produtos);
      setResumo(d.resumo);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar os produtos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function chamar(url: string, init: RequestInit): Promise<boolean> {
    try {
      const r = await fetch(url, init);
      const d = await r.json();
      if (!r.ok) {
        setErro(d.erro ?? "Ocorreu um erro.");
        return false;
      }
      setErro("");
      await carregar();
      return true;
    } catch {
      setErro("Não foi possível falar com o servidor.");
      return false;
    }
  }

  async function cadastrar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    const nome = form.nome.trim();
    const ok = await chamar("/api/produtos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: form.nome,
        precoCentavos: reaisParaCentavos(form.preco),
        quantidade: Number(form.quantidade),
        estoqueMinimo: Number(form.estoqueMinimo),
      }),
    });
    if (ok) {
      setForm(formVazio);
      mostrarAviso(`✅ "${nome}" cadastrado!`);
    }
    setEnviando(false);
  }

  async function movimentar(p: Produto, tipo: "entrada" | "saida", quantidade: number) {
    const ok = await chamar(`/api/produtos/${p.id}/movimentar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, quantidade }),
    });
    if (ok) {
      piscar(p.id);
      mostrarAviso(
        tipo === "entrada"
          ? `📥 +${quantidade} em ${p.nome}`
          : `📤 −${quantidade} em ${p.nome}`
      );
    }
  }

  async function apagar(p: Produto) {
    setConfirmando(null);
    const ok = await chamar(`/api/produtos/${p.id}`, { method: "DELETE" });
    if (ok) mostrarAviso(`🗑️ "${p.nome}" apagado`);
  }

  function alternarFiltroBaixo() {
    setFiltro((f) => (f === "baixo" ? "todos" : "baixo"));
  }

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(termo) &&
        (filtro === "todos" || p.quantidade < p.estoqueMinimo)
    );
  }, [produtos, busca, filtro]);

  const qtdBaixo = resumo?.abaixoDoMinimo ?? 0;

  return (
    <>
      <header className="topo">
        <div className="topo-conteudo">
          <div>
            <h1>📦 Controle de Estoque</h1>
            <p>Acompanhe produtos, entradas e saídas em tempo real.</p>
          </div>
          <button
            type="button"
            className="tema"
            onClick={alternarTema}
            aria-label={tema === "escuro" ? "Mudar para tema claro" : "Mudar para tema escuro"}
            title="Alternar tema"
          >
            {tema === "escuro" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <main className="container">
        {erro && (
          <div className="erro" role="alert">
            <span>⚠️ {erro}</span>
            <button type="button" className="fechar" onClick={() => setErro("")} aria-label="Fechar aviso">
              ×
            </button>
          </div>
        )}

        <section className="cartoes" aria-label="Resumo do estoque">
          <Cartao icone="🗂️" rotulo="Produtos" alvo={resumo?.totalProdutos ?? 0} tom="azul" />
          <Cartao icone="📦" rotulo="Itens em estoque" alvo={resumo?.itensEmEstoque ?? 0} tom="verde" />
          <Cartao
            icone="💰"
            rotulo="Valor total"
            alvo={resumo?.valorTotalCentavos ?? 0}
            formatar={brl}
            tom="roxo"
          />
          <Cartao
            icone="🚨"
            rotulo="Abaixo do mínimo"
            alvo={qtdBaixo}
            tom="vermelho"
            alerta={qtdBaixo > 0}
            ativo={filtro === "baixo"}
            dica={qtdBaixo > 0 ? (filtro === "baixo" ? "Clique para ver todos" : "Clique para filtrar") : undefined}
            onClick={alternarFiltroBaixo}
          />
        </section>

        <section className="painel">
          <h2>➕ Novo produto</h2>
          <form className="formulario" onSubmit={cadastrar}>
            <label>
              Nome
              <input
                value={form.nome}
                maxLength={80}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex.: Caderno 96 folhas"
              />
            </label>
            <label>
              Preço
              <span className="prefixo">
                <span aria-hidden="true">R$</span>
                <input
                  value={form.preco}
                  inputMode="decimal"
                  onChange={(e) => setForm({ ...form, preco: e.target.value })}
                  placeholder="12,50"
                />
              </span>
            </label>
            <label>
              Quantidade inicial
              <input
                type="number"
                min={0}
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
              />
            </label>
            <label>
              Estoque mínimo
              <input
                type="number"
                min={0}
                value={form.estoqueMinimo}
                onChange={(e) => setForm({ ...form, estoqueMinimo: e.target.value })}
              />
            </label>
            <button type="submit" className="primario" disabled={enviando}>
              {enviando ? "Salvando…" : "Cadastrar"}
            </button>
          </form>
        </section>

        <section className="painel">
          <div className="barra-ferramentas">
            <h2>📋 Produtos</h2>
            <div className="ferramentas">
              <label className="busca">
                <span aria-hidden="true">🔍</span>
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar produto…"
                  aria-label="Buscar produto"
                />
              </label>
              <div className="chips" role="group" aria-label="Filtro">
                <button
                  type="button"
                  className={`chip ${filtro === "todos" ? "ativo" : ""}`}
                  onClick={() => setFiltro("todos")}
                  aria-pressed={filtro === "todos"}
                >
                  Todos <span className="contador">{produtos.length}</span>
                </button>
                <button
                  type="button"
                  className={`chip chip-baixo ${filtro === "baixo" ? "ativo" : ""}`}
                  onClick={() => setFiltro("baixo")}
                  aria-pressed={filtro === "baixo"}
                >
                  Estoque baixo <span className="contador">{qtdBaixo}</span>
                </button>
              </div>
            </div>
          </div>

          {carregando ? (
            <div className="esqueleto" aria-label="Carregando produtos">
              <span />
              <span />
              <span />
            </div>
          ) : produtos.length === 0 ? (
            <div className="vazio">
              <span className="vazio-icone">🛒</span>
              <strong>Nenhum produto cadastrado ainda</strong>
              <p>Use o formulário acima para cadastrar o primeiro produto.</p>
            </div>
          ) : visiveis.length === 0 ? (
            <div className="vazio">
              <span className="vazio-icone">🔎</span>
              <strong>Nada encontrado</strong>
              <p>Tente outro nome ou limpe o filtro.</p>
              <button
                type="button"
                onClick={() => {
                  setBusca("");
                  setFiltro("todos");
                }}
              >
                Limpar busca e filtro
              </button>
            </div>
          ) : (
            <div className="tabela-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="num">Preço</th>
                    <th>Estoque</th>
                    <th className="num">Mínimo</th>
                    <th>Movimentar</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((p) => {
                    const baixo = p.quantidade < p.estoqueMinimo;
                    const valor = qtds[p.id] ?? "1";
                    const n = Number(valor);
                    const nivel = p.estoqueMinimo > 0 ? Math.min(p.quantidade / (p.estoqueMinimo * 2), 1) : 1;
                    const classes = [baixo ? "baixo" : "", destaque === p.id ? "piscar" : ""].join(" ").trim();
                    return (
                      <tr key={p.id} className={classes}>
                        <td className="nome">{p.nome}</td>
                        <td className="num">{brl(p.precoCentavos)}</td>
                        <td className="estoque">
                          <div className="qtd">
                            <strong>{p.quantidade}</strong>
                            <span className={`selo ${baixo ? "selo-baixo" : "selo-ok"}`}>
                              {baixo ? "Baixo" : "OK"}
                            </span>
                          </div>
                          <div className="nivel" aria-hidden="true">
                            <span style={{ width: `${Math.max(nivel * 100, 4)}%` }} />
                          </div>
                        </td>
                        <td className="num">{p.estoqueMinimo}</td>
                        <td>
                          <div className="movimentos">
                            <button
                              type="button"
                              className="passo"
                              onClick={() => movimentar(p, "saida", 1)}
                              aria-label={`Retirar 1 de ${p.nome}`}
                            >
                              −1
                            </button>
                            <button
                              type="button"
                              className="passo"
                              onClick={() => movimentar(p, "entrada", 1)}
                              aria-label={`Adicionar 1 a ${p.nome}`}
                            >
                              +1
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={valor}
                              onChange={(e) => setQtds({ ...qtds, [p.id]: e.target.value })}
                              aria-label={`Quantidade a movimentar de ${p.nome}`}
                            />
                            <button type="button" className="entrada" onClick={() => movimentar(p, "entrada", n)}>
                              Entrada
                            </button>
                            <button type="button" className="saida" onClick={() => movimentar(p, "saida", n)}>
                              Saída
                            </button>
                          </div>
                        </td>
                        <td className="acoes">
                          {confirmando === p.id ? (
                            <div className="confirmar">
                              <button type="button" className="perigo-cheio" onClick={() => apagar(p)}>
                                Confirmar
                              </button>
                              <button type="button" onClick={() => setConfirmando(null)}>
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button type="button" className="perigo" onClick={() => setConfirmando(p.id)}>
                              Apagar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {aviso && (
        <div className="aviso" role="status" aria-live="polite">
          {aviso}
        </div>
      )}
    </>
  );
}

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";

type AbaSistema =
  | "xml"
  | "validacao"
  | "sped"
  | "dominio"
  | "atualizacao"
  | "configuracoes";

type StatusExecucao = "parado" | "processando" | "concluido" | "erro";

type TemaSistema = "dark" | "light";

type ArquivoXmlSelecionado = {
  nome: string;
  caminho: string;
  arquivo: File;
};

type ResultadoArquivoXml = {
  nome: string;
  caminho: string;
  ocorrencias: number;
  corrigido: boolean;
  erro?: string;
};

type FileSystemFileHandleFx = {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
};

type FileSystemDirectoryHandleFx = {
  kind: "directory";
  name: string;
  entries: () => AsyncIterableIterator<
    [string, FileSystemFileHandleFx | FileSystemDirectoryHandleFx]
  >;
  getDirectoryHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<FileSystemDirectoryHandleFx>;
  getFileHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<{
    createWritable: () => Promise<{
      write: (content: string) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

type WindowComFileSystemAccess = Window &
  typeof globalThis & {
    showDirectoryPicker?: (options?: {
      mode?: "read" | "readwrite";
    }) => Promise<FileSystemDirectoryHandleFx>;
  };

const ABAS: Array<{
  id: AbaSistema;
  titulo: string;
  subtitulo: string;
  icone: string;
}> = [
  {
    id: "xml",
    titulo: "XML NFC-e/NF-e",
    subtitulo: "Correção em lote",
    icone: "⌂",
  },
  {
    id: "validacao",
    titulo: "Validação e Correção",
    subtitulo: "Regras PVA",
    icone: "🛡",
  },
  {
    id: "sped",
    titulo: "SPED Fiscal",
    subtitulo: "Análise fiscal",
    icone: "▤",
  },
  {
    id: "dominio",
    titulo: "Produtos Domínio",
    subtitulo: "Ajustes de importação",
    icone: "⚖",
  },
  {
    id: "atualizacao",
    titulo: "Atualização",
    subtitulo: "Rotinas futuras",
    icone: "↻",
  },
  {
    id: "configuracoes",
    titulo: "Configurações",
    subtitulo: "Empresas e parâmetros",
    icone: "⚙",
  },
];

function escaparRegex(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizarNomeTagXml(valor: string): string {
  return valor.trim().replace(/[<>/]/g, "");
}

function normalizarValorTagXml(valor: string): string {
  return valor.trim();
}

function nomeTagXmlEhValido(valor: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(valor);
}

function montarTagXml(nomeTag: string, valor: string): string {
  return `<${nomeTag}>${valor}</${nomeTag}>`;
}

function contarOcorrencias(conteudo: string, alvo: string): number {
  if (!alvo) {
    return 0;
  }

  const regex = new RegExp(escaparRegex(alvo), "g");
  return conteudo.match(regex)?.length ?? 0;
}

function substituirTagExata(
  conteudo: string,
  nomeTag: string,
  valorAtual: string,
  valorNovo: string,
): string {
  const tagAtual = montarTagXml(nomeTag, valorAtual);
  const tagNova = montarTagXml(nomeTag, valorNovo);

  return conteudo.replaceAll(tagAtual, tagNova);
}

async function listarXmlsRecursivo(
  pasta: FileSystemDirectoryHandleFx,
  caminhoBase = "",
): Promise<ArquivoXmlSelecionado[]> {
  const arquivos: ArquivoXmlSelecionado[] = [];

  for await (const [nome, item] of pasta.entries()) {
    const caminhoAtual = caminhoBase ? `${caminhoBase}/${nome}` : nome;

    if (item.kind === "file" && nome.toLowerCase().endsWith(".xml")) {
      const arquivo = await item.getFile();

      arquivos.push({
        nome,
        caminho: caminhoAtual,
        arquivo,
      });
    }

    if (item.kind === "directory") {
      const arquivosInternos = await listarXmlsRecursivo(item, caminhoAtual);
      arquivos.push(...arquivosInternos);
    }
  }

  return arquivos;
}

async function criarArquivoNaPasta(
  pastaDestino: FileSystemDirectoryHandleFx,
  caminhoRelativo: string,
  conteudo: string,
): Promise<void> {
  const partes = caminhoRelativo.split("/").filter(Boolean);
  const nomeArquivo = partes.pop();

  if (!nomeArquivo) {
    throw new Error("Nome do arquivo inválido.");
  }

  let pastaAtual = pastaDestino;

  for (const parte of partes) {
    pastaAtual = await pastaAtual.getDirectoryHandle(parte, { create: true });
  }

  const arquivoHandle = await pastaAtual.getFileHandle(nomeArquivo, {
    create: true,
  });

  const gravador = await arquivoHandle.createWritable();
  await gravador.write(conteudo);
  await gravador.close();
}

function converterFileListParaXmls(fileList: FileList | null): ArquivoXmlSelecionado[] {
  if (!fileList) {
    return [];
  }

  return Array.from(fileList)
    .filter((arquivo) => arquivo.name.toLowerCase().endsWith(".xml"))
    .map((arquivo) => ({
      nome: arquivo.name,
      caminho: arquivo.name,
      arquivo,
    }));
}

function gerarRelatorioXml(params: {
  nomeTag: string;
  valorAtual: string;
  valorNovo: string;
  arquivosSelecionados: number;
  arquivosCorrigidos: number;
  totalAlteracoes: number;
  resultados: ResultadoArquivoXml[];
}): string {
  const linhas: string[] = [];

  linhas.push("CORRETOR FISCAL FX");
  linhas.push("Relatório de Correção XML");
  linhas.push("");
  linhas.push(`Tag XML: ${params.nomeTag}`);
  linhas.push(`Valor atual: ${params.valorAtual}`);
  linhas.push(`Valor novo: ${params.valorNovo}`);
  linhas.push(`Arquivos analisados: ${params.arquivosSelecionados}`);
  linhas.push(`Arquivos corrigidos: ${params.arquivosCorrigidos}`);
  linhas.push(`Total de alterações: ${params.totalAlteracoes}`);
  linhas.push("");
  linhas.push("Detalhamento:");
  linhas.push("");

  for (const resultado of params.resultados) {
    if (resultado.erro) {
      linhas.push(`[ERRO] ${resultado.caminho} - ${resultado.erro}`);
    } else if (resultado.corrigido) {
      linhas.push(
        `[CORRIGIDO] ${resultado.caminho} - ${resultado.ocorrencias} alteração(ões)`,
      );
    } else {
      linhas.push(`[SEM ALTERAÇÃO] ${resultado.caminho}`);
    }
  }

  linhas.push("");
  linhas.push("Observação:");
  linhas.push(
    "Os arquivos originais não foram sobrescritos. Os XMLs corrigidos foram gravados na pasta de saída selecionada.",
  );

  return linhas.join("\n");
}

function App() {
  const [tema, setTema] = useState<TemaSistema>("dark");
  const [abaAtiva, setAbaAtiva] = useState<AbaSistema>("xml");

  const [nomeTag, setNomeTag] = useState("CST");
  const [valorAtual, setValorAtual] = useState("04");
  const [valorNovo, setValorNovo] = useState("06");

  const [arquivosSelecionados, setArquivosSelecionados] = useState<
    ArquivoXmlSelecionado[]
  >([]);
  const [pastaOrigem, setPastaOrigem] = useState("");
  const [pastaDestino, setPastaDestino] =
    useState<FileSystemDirectoryHandleFx | null>(null);
  const [nomePastaDestino, setNomePastaDestino] = useState("");

  const [status, setStatus] = useState<StatusExecucao>("parado");
  const [mensagem, setMensagem] = useState(
    "Selecione os XMLs, escolha a pasta de saída e execute a correção.",
  );
  const [resultados, setResultados] = useState<ResultadoArquivoXml[]>([]);
  const [progresso, setProgresso] = useState(0);

  const tagAtualPreview = useMemo(() => {
    const tag = normalizarNomeTagXml(nomeTag);
    const valor = normalizarValorTagXml(valorAtual);

    if (!tag || !valor) {
      return "";
    }

    return montarTagXml(tag, valor);
  }, [nomeTag, valorAtual]);

  const tagNovaPreview = useMemo(() => {
    const tag = normalizarNomeTagXml(nomeTag);
    const valor = normalizarValorTagXml(valorNovo);

    if (!tag || !valor) {
      return "";
    }

    return montarTagXml(tag, valor);
  }, [nomeTag, valorNovo]);

  const arquivosCorrigidos = resultados.filter((item) => item.corrigido).length;

  const arquivosComErro = resultados.filter((item) => Boolean(item.erro)).length;

  const totalAlteracoes = resultados.reduce(
    (total, item) => total + item.ocorrencias,
    0,
  );

  const temaClasse = tema === "dark" ? "theme-dark" : "theme-light";

  function alternarTema(): void {
    setTema((temaAtual) => (temaAtual === "dark" ? "light" : "dark"));
  }

  function selecionarArquivosOrigem(evento: ChangeEvent<HTMLInputElement>): void {
    const arquivos = converterFileListParaXmls(evento.target.files);

    setArquivosSelecionados(arquivos);
    setPastaOrigem(
      arquivos.length > 0 ? `${arquivos.length} XML(s) selecionado(s)` : "",
    );
    setResultados([]);
    setProgresso(0);
    setStatus("parado");
    setMensagem(
      arquivos.length > 0
        ? `${arquivos.length} XML(s) selecionado(s). Agora escolha a pasta de saída.`
        : "Nenhum XML foi selecionado.",
    );

    evento.target.value = "";
  }

  async function selecionarPastaOrigem(): Promise<void> {
    try {
      const navegador = window as WindowComFileSystemAccess;

      if (!navegador.showDirectoryPicker) {
        setStatus("erro");
        setMensagem(
          "Seu navegador não liberou seleção de pasta. Use o botão de selecionar XMLs diretamente.",
        );
        return;
      }

      const pasta = await navegador.showDirectoryPicker({ mode: "read" });
      const arquivos = await listarXmlsRecursivo(pasta);

      setArquivosSelecionados(arquivos);
      setPastaOrigem(pasta.name);
      setResultados([]);
      setProgresso(0);
      setStatus("parado");
      setMensagem(
        arquivos.length > 0
          ? `${arquivos.length} XML(s) encontrado(s) na pasta de origem.`
          : "Nenhum XML foi encontrado nessa pasta.",
      );
    } catch (erro) {
      if (erro instanceof Error && erro.name === "AbortError") {
        return;
      }

      setStatus("erro");
      setMensagem("Não foi possível selecionar a pasta de origem.");
    }
  }

  async function selecionarPastaDestino(): Promise<void> {
    try {
      const navegador = window as WindowComFileSystemAccess;

      if (!navegador.showDirectoryPicker) {
        setStatus("erro");
        setMensagem(
          "Seu navegador não liberou seleção de pasta de saída.",
        );
        return;
      }

      const pasta = await navegador.showDirectoryPicker({ mode: "readwrite" });

      setPastaDestino(pasta);
      setNomePastaDestino(pasta.name);
      setMensagem("Pasta de saída selecionada. Você já pode corrigir os XMLs.");
    } catch (erro) {
      if (erro instanceof Error && erro.name === "AbortError") {
        return;
      }

      setStatus("erro");
      setMensagem("Não foi possível selecionar a pasta de saída.");
    }
  }

  async function corrigirXmls(): Promise<void> {
    const tagNormalizada = normalizarNomeTagXml(nomeTag);
    const valorAtualNormalizado = normalizarValorTagXml(valorAtual);
    const valorNovoNormalizado = normalizarValorTagXml(valorNovo);

    if (!tagNormalizada || !nomeTagXmlEhValido(tagNormalizada)) {
      setStatus("erro");
      setMensagem("Informe uma tag XML válida. Exemplo: CST.");
      return;
    }

    if (!valorAtualNormalizado) {
      setStatus("erro");
      setMensagem("Informe o valor atual que será localizado no XML.");
      return;
    }

    if (!valorNovoNormalizado) {
      setStatus("erro");
      setMensagem("Informe o valor novo que será gravado no XML.");
      return;
    }

    if (arquivosSelecionados.length === 0) {
      setStatus("erro");
      setMensagem("Selecione pelo menos um arquivo XML.");
      return;
    }

    if (!pastaDestino) {
      setStatus("erro");
      setMensagem("Selecione a pasta de saída antes de corrigir.");
      return;
    }

    setStatus("processando");
    setMensagem("Processando XMLs...");
    setResultados([]);
    setProgresso(0);

    const novosResultados: ResultadoArquivoXml[] = [];

    for (let indice = 0; indice < arquivosSelecionados.length; indice += 1) {
      const item = arquivosSelecionados[indice];

      try {
        const conteudoOriginal = await item.arquivo.text();
        const tagAtual = montarTagXml(tagNormalizada, valorAtualNormalizado);
        const ocorrencias = contarOcorrencias(conteudoOriginal, tagAtual);
        const conteudoCorrigido = substituirTagExata(
          conteudoOriginal,
          tagNormalizada,
          valorAtualNormalizado,
          valorNovoNormalizado,
        );

        await criarArquivoNaPasta(pastaDestino, item.caminho, conteudoCorrigido);

        novosResultados.push({
          nome: item.nome,
          caminho: item.caminho,
          ocorrencias,
          corrigido: ocorrencias > 0,
        });
      } catch (erro) {
        novosResultados.push({
          nome: item.nome,
          caminho: item.caminho,
          ocorrencias: 0,
          corrigido: false,
          erro:
            erro instanceof Error
              ? erro.message
              : "Erro desconhecido ao processar arquivo.",
        });
      }

      const percentual = Math.round(
        ((indice + 1) / arquivosSelecionados.length) * 100,
      );

      setProgresso(percentual);
      setResultados([...novosResultados]);
    }

    const totalCorrigidos = novosResultados.filter((item) => item.corrigido).length;
    const totalMudancas = novosResultados.reduce(
      (total, item) => total + item.ocorrencias,
      0,
    );

    const relatorio = gerarRelatorioXml({
      nomeTag: tagNormalizada,
      valorAtual: valorAtualNormalizado,
      valorNovo: valorNovoNormalizado,
      arquivosSelecionados: arquivosSelecionados.length,
      arquivosCorrigidos: totalCorrigidos,
      totalAlteracoes: totalMudancas,
      resultados: novosResultados,
    });

    await criarArquivoNaPasta(
      pastaDestino,
      "relatorio-correcao-xml.txt",
      relatorio,
    );

    setStatus("concluido");
    setMensagem(
      `Concluído. ${totalCorrigidos} arquivo(s) corrigido(s), ${totalMudancas} alteração(ões) realizada(s).`,
    );
  }

  return (
    <div className={`app-shell ${temaClasse}`}>
      <aside className="app-sidebar">
        <div className="brand-box">
          <div className="brand-mark">FX</div>
          <div>
            <strong>Corretor Fiscal</strong>
            <span>Automação XML/SPED</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {ABAS.map((aba) => (
            <button
              key={aba.id}
              type="button"
              className={`sidebar-item ${abaAtiva === aba.id ? "active" : ""}`}
              onClick={() => setAbaAtiva(aba.id)}
            >
              <span className="sidebar-icon">{aba.icone}</span>
              <span>
                <strong>{aba.titulo}</strong>
                <small>{aba.subtitulo}</small>
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="app-main">
        <header className="app-header">
          <div>
            <p className="eyebrow">Sistema local</p>
            <h1>Corretor Fiscal FX</h1>
            <span>
              Correção fiscal em lote com segurança, conferência e relatório.
            </span>
          </div>

          <button type="button" className="theme-button" onClick={alternarTema}>
            {tema === "dark" ? "☀" : "◐"}
          </button>
        </header>

        <section className="app-content">
          <div style={{ display: abaAtiva === "xml" ? "block" : "none" }}>
            <section className="page-hero">
              <div>
                <p className="eyebrow">XML NFC-e/NF-e</p>
                <h2>Correção em lote de tags XML</h2>
                <p>
                  Selecione os XMLs, informe a tag e o valor que deve ser
                  substituído. O sistema gera cópias corrigidas sem sobrescrever
                  os arquivos originais.
                </p>
              </div>

              <div className={`status-pill status-${status}`}>
                {status === "parado" && "Aguardando"}
                {status === "processando" && "Processando"}
                {status === "concluido" && "Concluído"}
                {status === "erro" && "Atenção"}
              </div>
            </section>

            <section className="filter-panel">
              <div className="field-group">
                <label htmlFor="nomeTag">Tag XML</label>
                <input
                  id="nomeTag"
                  value={nomeTag}
                  onChange={(evento) => setNomeTag(evento.target.value)}
                  placeholder="Exemplo: CST"
                />
              </div>

              <div className="field-group">
                <label htmlFor="valorAtual">Valor atual</label>
                <input
                  id="valorAtual"
                  value={valorAtual}
                  onChange={(evento) => setValorAtual(evento.target.value)}
                  placeholder="Exemplo: 04"
                />
              </div>

              <div className="field-group">
                <label htmlFor="valorNovo">Valor novo</label>
                <input
                  id="valorNovo"
                  value={valorNovo}
                  onChange={(evento) => setValorNovo(evento.target.value)}
                  placeholder="Exemplo: 06"
                />
              </div>

              <div className="field-group preview-field">
                <label>Prévia da troca</label>
                <div className="xml-preview">
                  <code>{tagAtualPreview || "Tag atual"}</code>
                  <span>→</span>
                  <code>{tagNovaPreview || "Tag nova"}</code>
                </div>
              </div>
            </section>

            <section className="stepper-grid">
              <article className="step-card">
                <div className="step-icon">☁</div>
                <div>
                  <strong>1. Selecionar XMLs</strong>
                  <span>{pastaOrigem || "Nenhum XML selecionado"}</span>
                </div>

                <div className="step-actions">
                  <label className="primary-button file-button">
                    Selecionar XMLs
                    <input
                      type="file"
                      accept=".xml,text/xml,application/xml"
                      multiple
                      onChange={selecionarArquivosOrigem}
                    />
                  </label>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={selecionarPastaOrigem}
                  >
                    Usar pasta inteira
                  </button>
                </div>
              </article>

              <article className="step-card">
                <div className="step-icon">▣</div>
                <div>
                  <strong>2. Pasta de saída</strong>
                  <span>{nomePastaDestino || "Nenhuma pasta escolhida"}</span>
                </div>

                <div className="step-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={selecionarPastaDestino}
                  >
                    Escolher saída
                  </button>
                </div>
              </article>

              <article className="step-card">
                <div className="step-icon">🛠</div>
                <div>
                  <strong>3. Corrigir XMLs</strong>
                  <span>{mensagem}</span>
                </div>

                <div className="step-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={corrigirXmls}
                    disabled={status === "processando"}
                  >
                    {status === "processando" ? "Corrigindo..." : "Corrigir XMLs"}
                  </button>
                </div>
              </article>
            </section>

            <section className="kpi-grid">
              <article className="kpi-card kpi-orange">
                <div className="kpi-icon">▤</div>
                <div className="kpi-info">
                  <strong>{arquivosSelecionados.length}</strong>
                  <span>Arquivos selecionados</span>
                  <small>Total de XMLs carregados para análise.</small>
                </div>
              </article>

              <article className="kpi-card kpi-purple">
                <div className="kpi-icon">⚠</div>
                <div className="kpi-info">
                  <strong>{arquivosComErro}</strong>
                  <span>Arquivos com erro</span>
                  <small>Falhas encontradas durante o processamento.</small>
                </div>
              </article>

              <article className="kpi-card kpi-blue">
                <div className="kpi-icon">⚖</div>
                <div className="kpi-info">
                  <strong>{totalAlteracoes}</strong>
                  <span>Alterações feitas</span>
                  <small>Total de tags substituídas nos XMLs.</small>
                </div>
              </article>

              <article className="kpi-card kpi-teal">
                <div className="kpi-icon">✓</div>
                <div className="kpi-info">
                  <strong>{arquivosCorrigidos}</strong>
                  <span>Arquivos corrigidos</span>
                  <small>XMLs gravados com alteração na pasta de saída.</small>
                </div>
              </article>
            </section>

            <section className="progress-panel">
              <div className="progress-header">
                <strong>Progresso</strong>
                <span>{progresso}%</span>
              </div>
              <div className="progress-bar">
                <div style={{ width: `${progresso}%` }} />
              </div>
              <p>{mensagem}</p>
            </section>

            <section className="main-grid">
              <article className="data-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Resultado</p>
                    <h3>Arquivos processados</h3>
                  </div>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Arquivo</th>
                        <th>Caminho</th>
                        <th>Alterações</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultados.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="empty-cell">
                            Nenhum processamento executado ainda.
                          </td>
                        </tr>
                      ) : (
                        resultados.map((resultado) => (
                          <tr key={resultado.caminho}>
                            <td>{resultado.nome}</td>
                            <td>{resultado.caminho}</td>
                            <td>{resultado.ocorrencias}</td>
                            <td>
                              {resultado.erro ? (
                                <span className="badge badge-error">Erro</span>
                              ) : resultado.corrigido ? (
                                <span className="badge badge-success">
                                  Corrigido
                                </span>
                              ) : (
                                <span className="badge badge-muted">
                                  Sem alteração
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </article>

              <aside className="summary-panel">
                <p className="eyebrow">Resumo técnico</p>
                <h3>Regra aplicada</h3>

                <div className="summary-block">
                  <span>Busca exata</span>
                  <code>{tagAtualPreview || "-"}</code>
                </div>

                <div className="summary-block">
                  <span>Substituição</span>
                  <code>{tagNovaPreview || "-"}</code>
                </div>

                <div className="summary-block">
                  <span>Segurança</span>
                  <p>
                    O sistema grava os arquivos corrigidos em outra pasta e
                    preserva os XMLs originais.
                  </p>
                </div>

                <div className="summary-block">
                  <span>Relatório</span>
                  <p>
                    Ao final, é criado o arquivo
                    <strong> relatorio-correcao-xml.txt</strong>.
                  </p>
                </div>
              </aside>
            </section>
          </div>

          <div style={{ display: abaAtiva === "validacao" ? "block" : "none" }}>
            <TelaEmConstrucao
              titulo="Validação e Correção"
              descricao="Aqui voltaremos com as rotinas C100 x C170, C170 x C190 e validações seguras para PVA."
            />
          </div>

          <div style={{ display: abaAtiva === "sped" ? "block" : "none" }}>
            <TelaEmConstrucao
              titulo="SPED Fiscal"
              descricao="Aqui voltaremos com importação, leitura, análise e relatório do SPED Fiscal."
            />
          </div>

          <div style={{ display: abaAtiva === "dominio" ? "block" : "none" }}>
            <TelaEmConstrucao
              titulo="Produtos Domínio"
              descricao="Aqui voltaremos com os ajustes para uso e consumo, CFOP 1556, acumulador 1556 e regras de importação no Domínio."
            />
          </div>

          <div style={{ display: abaAtiva === "atualizacao" ? "block" : "none" }}>
            <TelaEmConstrucao
              titulo="Atualização"
              descricao="Área reservada para rotinas de atualização, versões e melhorias futuras."
            />
          </div>

          <div
            style={{ display: abaAtiva === "configuracoes" ? "block" : "none" }}
          >
            <TelaEmConstrucao
              titulo="Configurações"
              descricao="Área reservada para empresas, parâmetros fiscais e preferências do sistema."
            />
          </div>
        </section>

        <footer className="app-footer">
          <span>Corretor Fiscal FX</span>
          <span>Desenvolvido para rotinas fiscais locais</span>
        </footer>
      </main>
    </div>
  );
}

function TelaEmConstrucao(props: { titulo: string; descricao: string }) {
  return (
    <section className="placeholder-page">
      <p className="eyebrow">Módulo</p>
      <h2>{props.titulo}</h2>
      <p>{props.descricao}</p>

      <div className="placeholder-card">
        <strong>Próxima etapa</strong>
        <span>
          Este módulo será reconstruído depois da tela XML estar validada e
          funcionando corretamente.
        </span>
      </div>
    </section>
  );
}

export default App;
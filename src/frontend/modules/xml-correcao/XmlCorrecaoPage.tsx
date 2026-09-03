import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";

import { FxKpiCard } from "../../components/FxKpiCard";
import { FxPageHeader } from "../../components/FxPageHeader";
import { FxStepCard } from "../../components/FxStepCard";
import type {
  ArquivoXmlSelecionado,
  FileSystemDirectoryHandleFx,
  ResultadoArquivoXml,
  StatusExecucaoXml,
  WindowComFileSystemAccess,
} from "./xmlCorrecaoTypes";
import {
  contarOcorrencias,
  converterFileListParaXmls,
  corrigirEstruturaCofins,
  criarArquivoNaPasta,
  gerarRelatorioXml,
  listarXmlsRecursivo,
  montarTagXml,
  nomeTagXmlEhValido,
  normalizarNomeTagXml,
  normalizarValorTagXml,
  substituirTagExata,
} from "./xmlCorrecaoUtils";

export function XmlCorrecaoPage() {
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

  const [status, setStatus] = useState<StatusExecucaoXml>("parado");
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
        setMensagem("Seu navegador não liberou seleção de pasta de saída.");
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

        let conteudoCorrigido = substituirTagExata(
          conteudoOriginal,
          tagNormalizada,
          valorAtualNormalizado,
          valorNovoNormalizado,
        );

        if (tagNormalizada.toUpperCase() === "CST") {
          conteudoCorrigido = corrigirEstruturaCofins(conteudoCorrigido);
        }

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
    <div className="xml-correcao-page">
      <FxPageHeader
        eyebrow="XML NFC-e/NF-e"
        titulo="Correção em lote de tags XML"
        descricao="Selecione os XMLs, informe a tag e o valor que deve ser substituído. O sistema gera cópias corrigidas sem sobrescrever os arquivos originais."
      >
        <div className={`status-pill status-${status}`}>
          {status === "parado" && "Aguardando"}
          {status === "processando" && "Processando"}
          {status === "concluido" && "Concluído"}
          {status === "erro" && "Atenção"}
        </div>
      </FxPageHeader>

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
        <FxStepCard
          numero={1}
          titulo="Selecionar XMLs"
          descricao={pastaOrigem || "Nenhum XML selecionado"}
          icone="☁"
        >
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
        </FxStepCard>

        <FxStepCard
          numero={2}
          titulo="Pasta de saída"
          descricao={nomePastaDestino || "Nenhuma pasta escolhida"}
          icone="▣"
        >
          <button
            type="button"
            className="primary-button"
            onClick={selecionarPastaDestino}
          >
            Escolher saída
          </button>
        </FxStepCard>

        <FxStepCard
          numero={3}
          titulo="Corrigir XMLs"
          descricao={mensagem}
          icone="🛠"
        >
          <button
            type="button"
            className="primary-button"
            onClick={corrigirXmls}
            disabled={status === "processando"}
          >
            {status === "processando" ? "Corrigindo..." : "Corrigir XMLs"}
          </button>
        </FxStepCard>
      </section>

      <section className="kpi-grid">
        <FxKpiCard
          valor={arquivosSelecionados.length}
          titulo="Arquivos selecionados"
          descricao="Total de XMLs carregados para análise."
          icone="▤"
          variante="orange"
        />

        <FxKpiCard
          valor={arquivosComErro}
          titulo="Arquivos com erro"
          descricao="Falhas encontradas durante o processamento."
          icone="⚠"
          variante="purple"
        />

        <FxKpiCard
          valor={totalAlteracoes}
          titulo="Alterações feitas"
          descricao="Total de tags substituídas nos XMLs."
          icone="⚖"
          variante="blue"
        />

        <FxKpiCard
          valor={arquivosCorrigidos}
          titulo="Arquivos corrigidos"
          descricao="XMLs gravados com alteração na pasta de saída."
          icone="✓"
          variante="teal"
        />
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
                          <span className="badge badge-success">Corrigido</span>
                        ) : (
                          <span className="badge badge-muted">Sem alteração</span>
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
              O sistema grava os arquivos corrigidos em outra pasta e preserva
              os XMLs originais.
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
  );
}
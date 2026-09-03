import { useState } from "react";
import type { ChangeEvent } from "react";

import { FxKpiCard } from "../../components/FxKpiCard";
import { FxPageHeader } from "../../components/FxPageHeader";
import { FxStepCard } from "../../components/FxStepCard";
import type {
  ArquivoNfseSelecionado,
  FileSystemDirectoryHandleNfseFx,
  ResultadoArquivoNfseCfop,
  StatusExecucaoNfseCfop,
  WindowComFileSystemAccessNfse,
} from "./nfseCfopTypes";
import {
  analisarNfseParaSeparacaoQuestor,
  converterFileListParaNfses,
  criarArquivoNfseNaPasta,
  gerarRelatorioNfseCfop,
  listarNfsesRecursivo,
  montarCaminhoSeparado,
} from "./nfseCfopUtils";

export function NfseCfopPage() {
  const [arquivosSelecionados, setArquivosSelecionados] = useState<
    ArquivoNfseSelecionado[]
  >([]);
  const [pastaOrigem, setPastaOrigem] = useState("");
  const [pastaDestino, setPastaDestino] =
    useState<FileSystemDirectoryHandleNfseFx | null>(null);
  const [nomePastaDestino, setNomePastaDestino] = useState("");

  const [status, setStatus] = useState<StatusExecucaoNfseCfop>("parado");
  const [mensagem, setMensagem] = useState(
    "Selecione as NFSe, escolha a pasta de saída e separe os lotes para importação no Questor.",
  );
  const [resultados, setResultados] = useState<ResultadoArquivoNfseCfop[]>([]);
  const [progresso, setProgresso] = useState(0);

  const arquivosInternos = resultados.filter(
    (item) => item.categoria === "interna",
  ).length;
  const arquivosInterestaduais = resultados.filter(
    (item) => item.categoria === "interestadual",
  ).length;
  const arquivosNaoIdentificados = resultados.filter(
    (item) => item.categoria === "naoIdentificada",
  ).length;
  const arquivosComErro = resultados.filter((item) => Boolean(item.erro)).length;

  function selecionarArquivosOrigem(evento: ChangeEvent<HTMLInputElement>): void {
    const arquivos = converterFileListParaNfses(evento.target.files);

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
      const navegador = window as WindowComFileSystemAccessNfse;

      if (!navegador.showDirectoryPicker) {
        setStatus("erro");
        setMensagem(
          "Seu navegador não liberou seleção de pasta. Use o botão de selecionar XMLs diretamente.",
        );
        return;
      }

      const pasta = await navegador.showDirectoryPicker({ mode: "read" });
      const arquivos = await listarNfsesRecursivo(pasta);

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
      const navegador = window as WindowComFileSystemAccessNfse;

      if (!navegador.showDirectoryPicker) {
        setStatus("erro");
        setMensagem("Seu navegador não liberou seleção de pasta de saída.");
        return;
      }

      const pasta = await navegador.showDirectoryPicker({ mode: "readwrite" });

      setPastaDestino(pasta);
      setNomePastaDestino(pasta.name);
      setMensagem("Pasta de saída selecionada. Você já pode separar as NFSe.");
    } catch (erro) {
      if (erro instanceof Error && erro.name === "AbortError") {
        return;
      }

      setStatus("erro");
      setMensagem("Não foi possível selecionar a pasta de saída.");
    }
  }

  async function separarNfses(): Promise<void> {
    if (arquivosSelecionados.length === 0) {
      setStatus("erro");
      setMensagem("Selecione pelo menos um arquivo XML.");
      return;
    }

    if (!pastaDestino) {
      setStatus("erro");
      setMensagem("Selecione a pasta de saída antes de separar.");
      return;
    }

    setStatus("processando");
    setMensagem("Separando NFSe para importação no Questor...");
    setResultados([]);
    setProgresso(0);

    const novosResultados: ResultadoArquivoNfseCfop[] = [];

    for (let indice = 0; indice < arquivosSelecionados.length; indice += 1) {
      const item = arquivosSelecionados[indice];

      try {
        const conteudoOriginal = await item.arquivo.text();
        const analise = analisarNfseParaSeparacaoQuestor(conteudoOriginal);

        const caminhoSeparado = montarCaminhoSeparado({
          pastaDestino: analise.pastaDestino,
          caminhoOriginal: item.caminho,
        });

        await criarArquivoNfseNaPasta(
          pastaDestino,
          caminhoSeparado,
          conteudoOriginal,
        );

        novosResultados.push({
          nome: item.nome,
          caminho: item.caminho,
          ufPrestador: analise.ufPrestador,
          ufTomador: analise.ufTomador,
          cMunTomador: analise.cMunTomador,
          categoria: analise.categoria,
          naturezaQuestor: analise.naturezaQuestor,
          pastaDestino: analise.pastaDestino,
          copiado: true,
        });
      } catch (erro) {
        novosResultados.push({
          nome: item.nome,
          caminho: item.caminho,
          categoria: "naoIdentificada",
          naturezaQuestor: "conferir",
          pastaDestino: "nao-identificados-conferir",
          copiado: false,
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

    const totalInternos = novosResultados.filter(
      (item) => item.categoria === "interna",
    ).length;
    const totalInterestaduais = novosResultados.filter(
      (item) => item.categoria === "interestadual",
    ).length;
    const totalNaoIdentificados = novosResultados.filter(
      (item) => item.categoria === "naoIdentificada",
    ).length;

    const relatorio = gerarRelatorioNfseCfop({
      arquivosSelecionados: arquivosSelecionados.length,
      arquivosInternos: totalInternos,
      arquivosInterestaduais: totalInterestaduais,
      arquivosNaoIdentificados: totalNaoIdentificados,
      resultados: novosResultados,
    });

    await criarArquivoNfseNaPasta(
      pastaDestino,
      "relatorio-separacao-nfse-questor.txt",
      relatorio,
    );

    setStatus("concluido");
    setMensagem(
      `Concluído. ${totalInternos} interna(s), ${totalInterestaduais} interestadual(is), ${totalNaoIdentificados} para conferência.`,
    );
  }

  return (
    <div className="xml-correcao-page nfse-cfop-page">
      <FxPageHeader
        eyebrow="NFSe Questor"
        titulo="Separador de XML por Natureza"
        descricao="O sistema lê a UF do prestador e identifica a UF do tomador pelo cMun. Depois separa os XMLs em pastas próprias para importar no Questor com Natureza 5.933.004 ou 6.933.004."
      >
        <div className={`status-pill status-${status}`}>
          {status === "parado" && "Aguardando"}
          {status === "processando" && "Separando"}
          {status === "concluido" && "Concluído"}
          {status === "erro" && "Atenção"}
        </div>
      </FxPageHeader>

      <section className="filter-panel nfse-rule-panel">
        <div className="summary-block nfse-rule-card">
          <span>XML interno</span>
          <p>
            Prestador e tomador na mesma UF:
            <strong> importar com 5.933.004</strong>
          </p>
        </div>

        <div className="summary-block nfse-rule-card">
          <span>XML interestadual</span>
          <p>
            Prestador e tomador em UFs diferentes:
            <strong> importar com 6.933.004</strong>
          </p>
        </div>

        <div className="summary-block nfse-rule-card">
          <span>Saída</span>
          <p>
            O XML não é alterado. Ele é apenas copiado para a pasta correta de
            importação.
          </p>
        </div>
      </section>

      <section className="stepper-grid">
        <FxStepCard
          numero={1}
          titulo="Selecionar NFSe"
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
          titulo="Separar XMLs"
          descricao={mensagem}
          icone="🛠"
        >
          <button
            type="button"
            className="primary-button"
            onClick={separarNfses}
            disabled={status === "processando"}
          >
            {status === "processando" ? "Separando..." : "Separar NFSe"}
          </button>
        </FxStepCard>
      </section>

      <section className="kpi-grid">
        <FxKpiCard
          valor={arquivosSelecionados.length}
          titulo="Arquivos selecionados"
          descricao="Total de XMLs carregados para separação."
          icone="▤"
          variante="orange"
        />

        <FxKpiCard
          valor={arquivosInternos}
          titulo="Internas"
          descricao="Importar no Questor com Natureza 5.933.004."
          icone="⌂"
          variante="teal"
        />

        <FxKpiCard
          valor={arquivosInterestaduais}
          titulo="Interestaduais"
          descricao="Importar no Questor com Natureza 6.933.004."
          icone="⇄"
          variante="blue"
        />

        <FxKpiCard
          valor={arquivosComErro + arquivosNaoIdentificados}
          titulo="Conferir"
          descricao="Arquivos com erro ou sem identificação completa."
          icone="⚠"
          variante="purple"
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
              <h3>NFSe separadas para o Questor</h3>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Prestador</th>
                  <th>Tomador</th>
                  <th>cMun</th>
                  <th>Natureza</th>
                  <th>Pasta</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {resultados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-cell">
                      Nenhum processamento executado ainda.
                    </td>
                  </tr>
                ) : (
                  resultados.map((resultado) => (
                    <tr key={resultado.caminho}>
                      <td>{resultado.nome}</td>
                      <td>{resultado.ufPrestador ?? "-"}</td>
                      <td>{resultado.ufTomador ?? "-"}</td>
                      <td>{resultado.cMunTomador ?? "-"}</td>
                      <td>{resultado.naturezaQuestor}</td>
                      <td>{resultado.pastaDestino}</td>
                      <td>
                        {resultado.erro ? (
                          <span className="badge badge-error">Erro</span>
                        ) : resultado.categoria === "interna" ? (
                          <span className="badge badge-success">Interna</span>
                        ) : resultado.categoria === "interestadual" ? (
                          <span className="badge badge-success">
                            Interestadual
                          </span>
                        ) : (
                          <span className="badge badge-muted">Conferir</span>
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
          <h3>Como importar</h3>

          <div className="summary-block">
            <span>Pasta interna</span>
            <p>
              Importe <strong>internas-5-933-004</strong> no Questor usando
              Natureza <strong>5.933.004</strong>.
            </p>
          </div>

          <div className="summary-block">
            <span>Pasta interestadual</span>
            <p>
              Importe <strong>interestaduais-6-933-004</strong> no Questor usando
              Natureza <strong>6.933.004</strong>.
            </p>
          </div>

          <div className="summary-block">
            <span>Conferência</span>
            <p>
              Arquivos sem UF do prestador ou sem cMun do tomador vão para
              <strong> nao-identificados-conferir</strong>.
            </p>
          </div>

          <div className="summary-block">
            <span>Segurança</span>
            <p>
              O XML original não é alterado. O sistema apenas copia cada arquivo
              para a pasta correta.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
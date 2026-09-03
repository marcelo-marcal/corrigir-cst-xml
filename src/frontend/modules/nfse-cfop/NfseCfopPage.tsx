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
  analisarECorrigirNfseCfop,
  converterFileListParaNfses,
  criarArquivoNfseNaPasta,
  gerarRelatorioNfseCfop,
  listarNfsesRecursivo,
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
    "Selecione as NFSe, escolha a pasta de saída e execute a correção interestadual.",
  );
  const [resultados, setResultados] = useState<ResultadoArquivoNfseCfop[]>([]);
  const [progresso, setProgresso] = useState(0);

  const arquivosCorrigidos = resultados.filter((item) => item.corrigido).length;
  const arquivosInterestaduais = resultados.filter((item) => item.interestadual).length;
  const arquivosComErro = resultados.filter((item) => Boolean(item.erro)).length;

  const totalAlteracoes = resultados.reduce(
    (total, item) => total + item.ocorrencias,
    0,
  );

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
      setMensagem("Pasta de saída selecionada. Você já pode corrigir as NFSe.");
    } catch (erro) {
      if (erro instanceof Error && erro.name === "AbortError") {
        return;
      }

      setStatus("erro");
      setMensagem("Não foi possível selecionar a pasta de saída.");
    }
  }

  async function corrigirNfses(): Promise<void> {
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
    setMensagem("Processando NFSe...");
    setResultados([]);
    setProgresso(0);

    const novosResultados: ResultadoArquivoNfseCfop[] = [];

    for (let indice = 0; indice < arquivosSelecionados.length; indice += 1) {
      const item = arquivosSelecionados[indice];

      try {
        const conteudoOriginal = await item.arquivo.text();
        const analise = analisarECorrigirNfseCfop(conteudoOriginal);

        await criarArquivoNfseNaPasta(
          pastaDestino,
          item.caminho,
          analise.conteudoCorrigido,
        );

        novosResultados.push({
          nome: item.nome,
          caminho: item.caminho,
          ufPrestador: analise.ufPrestador,
          ufTomador: analise.ufTomador,
          cMunTomador: analise.cMunTomador,
          interestadual: analise.interestadual,
          ocorrencias: analise.ocorrencias,
          corrigido: analise.corrigido,
        });
      } catch (erro) {
        novosResultados.push({
          nome: item.nome,
          caminho: item.caminho,
          interestadual: false,
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

    const relatorio = gerarRelatorioNfseCfop({
      arquivosSelecionados: arquivosSelecionados.length,
      arquivosCorrigidos: totalCorrigidos,
      totalAlteracoes: totalMudancas,
      resultados: novosResultados,
    });

    await criarArquivoNfseNaPasta(
      pastaDestino,
      "relatorio-nfse-cfop-interestadual.txt",
      relatorio,
    );

    setStatus("concluido");
    setMensagem(
      `Concluído. ${totalCorrigidos} arquivo(s) corrigido(s), ${totalMudancas} alteração(ões) realizada(s).`,
    );
  }

  return (
    <div className="xml-correcao-page nfse-cfop-page">
      <FxPageHeader
        eyebrow="NFSe CFOP Interestadual"
        titulo="Correção de 5.xxx.xxx para 6.xxx.xxx"
        descricao="Quando a UF do prestador for diferente da UF do tomador identificada pelo cMun, o sistema altera códigos no padrão 5.xxx.xxx para 6.xxx.xxx."
      >
        <div className={`status-pill status-${status}`}>
          {status === "parado" && "Aguardando"}
          {status === "processando" && "Processando"}
          {status === "concluido" && "Concluído"}
          {status === "erro" && "Atenção"}
        </div>
      </FxPageHeader>

      <section className="filter-panel nfse-rule-panel">
        <div className="summary-block nfse-rule-card">
          <span>Regra de localização</span>
          <p>
            Prestador: <strong>&lt;emit&gt; &gt; &lt;enderNac&gt; &gt; &lt;UF&gt;</strong>
          </p>
        </div>

        <div className="summary-block nfse-rule-card">
          <span>Regra do tomador</span>
          <p>
            Tomador: <strong>&lt;toma&gt; &gt; &lt;end&gt; &gt; &lt;endNac&gt; &gt; &lt;cMun&gt;</strong>
          </p>
        </div>

        <div className="summary-block nfse-rule-card">
          <span>Correção</span>
          <p>
            Se for interestadual: <strong>5.xxx.xxx → 6.xxx.xxx</strong>
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
          titulo="Corrigir NFSe"
          descricao={mensagem}
          icone="🛠"
        >
          <button
            type="button"
            className="primary-button"
            onClick={corrigirNfses}
            disabled={status === "processando"}
          >
            {status === "processando" ? "Corrigindo..." : "Corrigir NFSe"}
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
          valor={arquivosInterestaduais}
          titulo="Interestaduais"
          descricao="NFSe com UF do tomador diferente do prestador."
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
          descricao="Total de códigos 5.xxx.xxx alterados."
          icone="⇄"
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
              <h3>NFSe processadas</h3>
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
                  <th>Alterações</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {resultados.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-cell">
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
                      <td>{resultado.ocorrencias}</td>
                      <td>
                        {resultado.erro ? (
                          <span className="badge badge-error">Erro</span>
                        ) : resultado.corrigido ? (
                          <span className="badge badge-success">Corrigido</span>
                        ) : resultado.interestadual ? (
                          <span className="badge badge-muted">Sem código 5</span>
                        ) : (
                          <span className="badge badge-muted">Operação interna</span>
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
            <span>Prestador</span>
            <p>Busca a UF dentro de emit &gt; enderNac &gt; UF.</p>
          </div>

          <div className="summary-block">
            <span>Tomador</span>
            <p>Identifica a UF pelos dois primeiros dígitos do cMun do tomador.</p>
          </div>

          <div className="summary-block">
            <span>Correção</span>
            <p>Quando for interestadual, altera 5.xxx.xxx para 6.xxx.xxx.</p>
          </div>

          <div className="summary-block">
            <span>Assinatura</span>
            <p>
              XML assinado pode ter a assinatura invalidada após alteração de
              conteúdo.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
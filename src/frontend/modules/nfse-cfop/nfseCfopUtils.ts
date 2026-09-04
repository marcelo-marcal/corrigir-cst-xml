import type {
  ArquivoNfseSelecionado,
  CategoriaSeparacaoNfse,
  FileSystemDirectoryHandleNfseFx,
  PastaDestinoElectronNfseFx,
  PastaDestinoNfseFx,
  ResultadoArquivoNfseCfop,
  WindowComFileSystemAccessNfse,
} from "./nfseCfopTypes";

const UF_POR_PREFIXO_IBGE: Record<string, string> = {
  "11": "RO",
  "12": "AC",
  "13": "AM",
  "14": "RR",
  "15": "PA",
  "16": "AP",
  "17": "TO",
  "21": "MA",
  "22": "PI",
  "23": "CE",
  "24": "RN",
  "25": "PB",
  "26": "PE",
  "27": "AL",
  "28": "SE",
  "29": "BA",
  "31": "MG",
  "32": "ES",
  "33": "RJ",
  "35": "SP",
  "41": "PR",
  "42": "SC",
  "43": "RS",
  "50": "MS",
  "51": "MT",
  "52": "GO",
  "53": "DF",
};

const PASTA_RAIZ_SEPARACAO = "nfse-separadas-questor";
const PASTA_INTERNAS = "internas-5-933-004";
const PASTA_INTERESTADUAIS = "interestaduais-6-933-004";
const PASTA_NAO_IDENTIFICADAS = "nao-identificados-conferir";

function pastaDestinoEhElectron(
  pastaDestino: PastaDestinoNfseFx,
): pastaDestino is PastaDestinoElectronNfseFx {
  return "tipo" in pastaDestino && pastaDestino.tipo === "electron";
}

export function converterFileListParaNfses(
  fileList: FileList | null,
): ArquivoNfseSelecionado[] {
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

export async function listarNfsesRecursivo(
  pasta: FileSystemDirectoryHandleNfseFx,
  caminhoBase = "",
): Promise<ArquivoNfseSelecionado[]> {
  const arquivos: ArquivoNfseSelecionado[] = [];

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
      const arquivosInternos = await listarNfsesRecursivo(item, caminhoAtual);
      arquivos.push(...arquivosInternos);
    }
  }

  return arquivos;
}

async function criarArquivoNfseNaPastaDoNavegador(
  pastaDestino: FileSystemDirectoryHandleNfseFx,
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

export async function criarArquivoNfseNoDestino(
  pastaDestino: PastaDestinoNfseFx,
  caminhoRelativo: string,
  conteudo: string,
): Promise<void> {
  if (pastaDestinoEhElectron(pastaDestino)) {
    const navegador = window as WindowComFileSystemAccessNfse;

    if (!navegador.fxElectron) {
      throw new Error("Integração Electron não encontrada.");
    }

    const resultado = await navegador.fxElectron.gravarArquivoTexto({
      pastaBase: pastaDestino.caminho,
      caminhoRelativo,
      conteudo,
    });

    if (!resultado.ok) {
      throw new Error(resultado.error ?? "Não foi possível gravar o arquivo.");
    }

    return;
  }

  await criarArquivoNfseNaPastaDoNavegador(
    pastaDestino,
    caminhoRelativo,
    conteudo,
  );
}

export function obterUfPrestador(conteudoXml: string): string | undefined {
  const resultado = conteudoXml.match(
    /<emit\b[\s\S]*?<enderNac\b[\s\S]*?<UF>\s*([A-Z]{2})\s*<\/UF>[\s\S]*?<\/enderNac>[\s\S]*?<\/emit>/i,
  );

  return resultado?.[1]?.toUpperCase();
}

export function obterCodigoLocalPrestacao(
  conteudoXml: string,
): string | undefined {
  const resultado = conteudoXml.match(
    /<locPrest\b[\s\S]*?<cLocPrestacao>\s*(\d{7})\s*<\/cLocPrestacao>[\s\S]*?<\/locPrest>/i,
  );

  return resultado?.[1];
}

export function obterCodigoMunicipioTomador(
  conteudoXml: string,
): string | undefined {
  const resultado = conteudoXml.match(
    /<toma\b[\s\S]*?<end\b[\s\S]*?<endNac\b[\s\S]*?<cMun>\s*(\d{7})\s*<\/cMun>[\s\S]*?<\/endNac>[\s\S]*?<\/end>[\s\S]*?<\/toma>/i,
  );

  return resultado?.[1];
}

export function obterUfPorCodigoMunicipio(
  codigoMunicipio: string | undefined,
): string | undefined {
  if (!codigoMunicipio || codigoMunicipio.length < 2) {
    return undefined;
  }

  const prefixo = codigoMunicipio.substring(0, 2);
  return UF_POR_PREFIXO_IBGE[prefixo];
}

export function classificarNfseParaQuestor(params: {
  ufPrestador?: string;
  ufLocalPrestacao?: string;
}): {
  categoria: CategoriaSeparacaoNfse;
  naturezaQuestor: "5.933.004" | "6.933.004" | "conferir";
  pastaDestino: string;
} {
  if (!params.ufPrestador || !params.ufLocalPrestacao) {
    return {
      categoria: "naoIdentificada",
      naturezaQuestor: "conferir",
      pastaDestino: PASTA_NAO_IDENTIFICADAS,
    };
  }

  if (
    params.ufPrestador.toUpperCase() ===
    params.ufLocalPrestacao.toUpperCase()
  ) {
    return {
      categoria: "interna",
      naturezaQuestor: "5.933.004",
      pastaDestino: PASTA_INTERNAS,
    };
  }

  return {
    categoria: "interestadual",
    naturezaQuestor: "6.933.004",
    pastaDestino: PASTA_INTERESTADUAIS,
  };
}

export function analisarNfseParaSeparacaoQuestor(conteudoXml: string): {
  ufPrestador?: string;
  ufLocalPrestacao?: string;
  cLocPrestacao?: string;
  ufTomador?: string;
  cMunTomador?: string;
  categoria: CategoriaSeparacaoNfse;
  naturezaQuestor: "5.933.004" | "6.933.004" | "conferir";
  pastaDestino: string;
} {
  const ufPrestador = obterUfPrestador(conteudoXml);

  const cLocPrestacao = obterCodigoLocalPrestacao(conteudoXml);
  const ufLocalPrestacao = obterUfPorCodigoMunicipio(cLocPrestacao);

  const cMunTomador = obterCodigoMunicipioTomador(conteudoXml);
  const ufTomador = obterUfPorCodigoMunicipio(cMunTomador);

  const classificacao = classificarNfseParaQuestor({
    ufPrestador,
    ufLocalPrestacao,
  });

  return {
    ufPrestador,
    ufLocalPrestacao,
    cLocPrestacao,
    ufTomador,
    cMunTomador,
    categoria: classificacao.categoria,
    naturezaQuestor: classificacao.naturezaQuestor,
    pastaDestino: classificacao.pastaDestino,
  };
}

export function montarCaminhoSeparado(params: {
  pastaDestino: string;
  caminhoOriginal: string;
}): string {
  return `${PASTA_RAIZ_SEPARACAO}/${params.pastaDestino}/${params.caminhoOriginal}`;
}

export function gerarRelatorioNfseCfop(params: {
  arquivosSelecionados: number;
  arquivosInternos: number;
  arquivosInterestaduais: number;
  arquivosNaoIdentificados: number;
  resultados: ResultadoArquivoNfseCfop[];
}): string {
  const linhas: string[] = [];

  linhas.push("CORRETOR FISCAL FX");
  linhas.push("Relatório de Separação NFSe para Importação no Questor");
  linhas.push("");
  linhas.push("Pasta principal gerada:");
  linhas.push(PASTA_RAIZ_SEPARACAO);
  linhas.push("");
  linhas.push("Objetivo:");
  linhas.push(
    "Separar automaticamente XMLs de NFSe em lotes internos e interestaduais antes da importação no Questor.",
  );
  linhas.push("");
  linhas.push("Regra aplicada:");
  linhas.push(
    "A separação considera a UF do prestador e a UF do local da prestação do serviço, identificada pela tag cLocPrestacao.",
  );
  linhas.push(
    "Quando a UF do prestador for igual à UF do local da prestação, o XML é separado para importação com Natureza 5.933.004.",
  );
  linhas.push(
    "Quando a UF do prestador for diferente da UF do local da prestação, o XML é separado para importação com Natureza 6.933.004.",
  );
  linhas.push("");
  linhas.push("Observação importante:");
  linhas.push(
    "O endereço do tomador é exibido apenas para conferência. Ele não decide a pasta de separação.",
  );
  linhas.push("");
  linhas.push(`Arquivos analisados: ${params.arquivosSelecionados}`);
  linhas.push(`Arquivos internos - Natureza 5.933.004: ${params.arquivosInternos}`);
  linhas.push(
    `Arquivos interestaduais - Natureza 6.933.004: ${params.arquivosInterestaduais}`,
  );
  linhas.push(`Arquivos não identificados: ${params.arquivosNaoIdentificados}`);
  linhas.push("");
  linhas.push("Pastas geradas:");
  linhas.push(`- ${PASTA_RAIZ_SEPARACAO}/${PASTA_INTERNAS}`);
  linhas.push(`- ${PASTA_RAIZ_SEPARACAO}/${PASTA_INTERESTADUAIS}`);
  linhas.push(`- ${PASTA_RAIZ_SEPARACAO}/${PASTA_NAO_IDENTIFICADAS}`);
  linhas.push("");
  linhas.push("Detalhamento:");
  linhas.push("");

  for (const resultado of params.resultados) {
    if (resultado.erro) {
      linhas.push(`[ERRO] ${resultado.caminho} - ${resultado.erro}`);
      continue;
    }

    const localizacao = `Prestador ${resultado.ufPrestador ?? "-"} / Local prestação ${
      resultado.ufLocalPrestacao ?? "-"
    } / cLocPrestacao ${resultado.cLocPrestacao ?? "-"} / Tomador ${
      resultado.ufTomador ?? "-"
    } / cMun tomador ${resultado.cMunTomador ?? "-"}`;

    if (resultado.categoria === "interna") {
      linhas.push(
        `[INTERNA] ${resultado.caminho} -> ${PASTA_RAIZ_SEPARACAO}/${resultado.pastaDestino} - Natureza Questor ${resultado.naturezaQuestor} - ${localizacao}`,
      );
      continue;
    }

    if (resultado.categoria === "interestadual") {
      linhas.push(
        `[INTERESTADUAL] ${resultado.caminho} -> ${PASTA_RAIZ_SEPARACAO}/${resultado.pastaDestino} - Natureza Questor ${resultado.naturezaQuestor} - ${localizacao}`,
      );
      continue;
    }

    linhas.push(
      `[CONFERIR] ${resultado.caminho} -> ${PASTA_RAIZ_SEPARACAO}/${resultado.pastaDestino} - Não foi possível identificar UF do prestador ou UF do local da prestação - ${localizacao}`,
    );
  }

  linhas.push("");
  linhas.push("Como importar no Questor:");
  linhas.push("");
  linhas.push(
    `1. Importe a pasta ${PASTA_RAIZ_SEPARACAO}/${PASTA_INTERNAS} usando Natureza 5.933.004.`,
  );
  linhas.push(
    `2. Importe a pasta ${PASTA_RAIZ_SEPARACAO}/${PASTA_INTERESTADUAIS} usando Natureza 6.933.004.`,
  );
  linhas.push(
    `3. Confira manualmente a pasta ${PASTA_RAIZ_SEPARACAO}/${PASTA_NAO_IDENTIFICADAS}, se houver arquivos nela.`,
  );
  linhas.push("");
  linhas.push("Observação:");
  linhas.push(
    "Os XMLs originais não foram alterados. O sistema apenas copiou cada arquivo para a pasta correta de importação.",
  );

  return linhas.join("\n");
}
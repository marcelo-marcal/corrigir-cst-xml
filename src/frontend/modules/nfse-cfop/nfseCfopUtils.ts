import type {
  ArquivoNfseSelecionado,
  FileSystemDirectoryHandleNfseFx,
  ResultadoArquivoNfseCfop,
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

export async function criarArquivoNfseNaPasta(
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

export function obterUfPrestador(conteudoXml: string): string | undefined {
  const resultado = conteudoXml.match(
    /<emit\b[\s\S]*?<enderNac\b[\s\S]*?<UF>\s*([A-Z]{2})\s*<\/UF>[\s\S]*?<\/enderNac>[\s\S]*?<\/emit>/i,
  );

  return resultado?.[1]?.toUpperCase();
}

export function obterCodigoMunicipioTomador(conteudoXml: string): string | undefined {
  const resultado = conteudoXml.match(
    /<toma\b[\s\S]*?<end\b[\s\S]*?<endNac\b[\s\S]*?<cMun>\s*(\d{7})\s*<\/cMun>[\s\S]*?<\/endNac>[\s\S]*?<\/end>[\s\S]*?<\/toma>/i,
  );

  return resultado?.[1];
}

export function obterUfTomadorPorCodigoMunicipio(
  codigoMunicipio: string | undefined,
): string | undefined {
  if (!codigoMunicipio || codigoMunicipio.length < 2) {
    return undefined;
  }

  const prefixo = codigoMunicipio.substring(0, 2);
  return UF_POR_PREFIXO_IBGE[prefixo];
}

export function verificarSeOperacaoInterestadual(params: {
  ufPrestador?: string;
  ufTomador?: string;
}): boolean {
  if (!params.ufPrestador || !params.ufTomador) {
    return false;
  }

  return params.ufPrestador.toUpperCase() !== params.ufTomador.toUpperCase();
}

export function contarCodigosNaturezaIniciandoCom5(conteudoXml: string): number {
  const ocorrencias = conteudoXml.match(/\b5\.\d{3}\.\d{3}\b/g);
  return ocorrencias?.length ?? 0;
}

export function corrigirNaturezaCfopInterestadual(conteudoXml: string): string {
  return conteudoXml.replace(/\b5(\.\d{3}\.\d{3})\b/g, "6$1");
}

export function analisarECorrigirNfseCfop(conteudoXml: string): {
  conteudoCorrigido: string;
  ufPrestador?: string;
  ufTomador?: string;
  cMunTomador?: string;
  interestadual: boolean;
  ocorrencias: number;
  corrigido: boolean;
} {
  const ufPrestador = obterUfPrestador(conteudoXml);
  const cMunTomador = obterCodigoMunicipioTomador(conteudoXml);
  const ufTomador = obterUfTomadorPorCodigoMunicipio(cMunTomador);

  const interestadual = verificarSeOperacaoInterestadual({
    ufPrestador,
    ufTomador,
  });

  if (!interestadual) {
    return {
      conteudoCorrigido: conteudoXml,
      ufPrestador,
      ufTomador,
      cMunTomador,
      interestadual,
      ocorrencias: 0,
      corrigido: false,
    };
  }

  const ocorrencias = contarCodigosNaturezaIniciandoCom5(conteudoXml);
  const conteudoCorrigido =
    ocorrencias > 0 ? corrigirNaturezaCfopInterestadual(conteudoXml) : conteudoXml;

  return {
    conteudoCorrigido,
    ufPrestador,
    ufTomador,
    cMunTomador,
    interestadual,
    ocorrencias,
    corrigido: ocorrencias > 0,
  };
}

export function gerarRelatorioNfseCfop(params: {
  arquivosSelecionados: number;
  arquivosCorrigidos: number;
  totalAlteracoes: number;
  resultados: ResultadoArquivoNfseCfop[];
}): string {
  const linhas: string[] = [];

  linhas.push("CORRETOR FISCAL FX");
  linhas.push("Relatório de Correção NFSe - CFOP/Natureza Interestadual");
  linhas.push("");
  linhas.push("Regra aplicada:");
  linhas.push(
    "Quando a UF do prestador for diferente da UF identificada pelo cMun do tomador, códigos no padrão 5.xxx.xxx são alterados para 6.xxx.xxx.",
  );
  linhas.push("");
  linhas.push(`Arquivos analisados: ${params.arquivosSelecionados}`);
  linhas.push(`Arquivos corrigidos: ${params.arquivosCorrigidos}`);
  linhas.push(`Total de alterações: ${params.totalAlteracoes}`);
  linhas.push("");
  linhas.push("Detalhamento:");
  linhas.push("");

  for (const resultado of params.resultados) {
    if (resultado.erro) {
      linhas.push(`[ERRO] ${resultado.caminho} - ${resultado.erro}`);
      continue;
    }

    const localizacao = `Prestador ${resultado.ufPrestador ?? "-"} / Tomador ${
      resultado.ufTomador ?? "-"
    } / cMun ${resultado.cMunTomador ?? "-"}`;

    if (!resultado.interestadual) {
      linhas.push(`[SEM ALTERAÇÃO] ${resultado.caminho} - Operação interna - ${localizacao}`);
      continue;
    }

    if (resultado.corrigido) {
      linhas.push(
        `[CORRIGIDO] ${resultado.caminho} - ${resultado.ocorrencias} alteração(ões) - ${localizacao}`,
      );
      continue;
    }

    linhas.push(
      `[SEM CÓDIGO 5.xxx.xxx] ${resultado.caminho} - Operação interestadual, mas nenhum código 5.xxx.xxx foi encontrado - ${localizacao}`,
    );
  }

  linhas.push("");
  linhas.push("Observação:");
  linhas.push(
    "Os arquivos originais não foram sobrescritos. Os XMLs corrigidos foram gravados na pasta de saída selecionada.",
  );
  linhas.push(
    "Atenção: XML assinado digitalmente pode ter a assinatura invalidada após qualquer alteração no conteúdo.",
  );

  return linhas.join("\n");
}
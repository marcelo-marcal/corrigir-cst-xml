import type {
  ArquivoXmlSelecionado,
  FileSystemDirectoryHandleFx,
  ResultadoArquivoXml,
} from "./xmlCorrecaoTypes";

function escaparRegex(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizarNomeTagXml(valor: string): string {
  return valor.trim().replace(/[<>/]/g, "");
}

export function normalizarValorTagXml(valor: string): string {
  return valor.trim();
}

export function nomeTagXmlEhValido(valor: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_.:-]*$/.test(valor);
}

export function montarTagXml(nomeTag: string, valor: string): string {
  return `<${nomeTag}>${valor}</${nomeTag}>`;
}

export function contarOcorrencias(conteudo: string, alvo: string): number {
  if (!alvo) {
    return 0;
  }

  const regex = new RegExp(escaparRegex(alvo), "g");
  return conteudo.match(regex)?.length ?? 0;
}

export function substituirTagExata(
  conteudo: string,
  nomeTag: string,
  valorAtual: string,
  valorNovo: string,
): string {
  const tagAtual = montarTagXml(nomeTag, valorAtual);
  const tagNova = montarTagXml(nomeTag, valorNovo);

  return conteudo.replaceAll(tagAtual, tagNova);
}

export function converterFileListParaXmls(
  fileList: FileList | null,
): ArquivoXmlSelecionado[] {
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

export async function listarXmlsRecursivo(
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

export async function criarArquivoNaPasta(
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

export function corrigirEstruturaCofins(conteudo: string): string {
  return conteudo;
}

export function gerarRelatorioXml(params: {
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
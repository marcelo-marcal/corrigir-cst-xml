export type StatusExecucaoNfseCfop = "parado" | "processando" | "concluido" | "erro";

export type CategoriaSeparacaoNfse =
  | "interna"
  | "interestadual"
  | "naoIdentificada";

export type ArquivoNfseSelecionado = {
  nome: string;
  caminho: string;
  arquivo: File;
};

export type ResultadoArquivoNfseCfop = {
  nome: string;
  caminho: string;
  ufPrestador?: string;
  ufTomador?: string;
  cMunTomador?: string;
  categoria: CategoriaSeparacaoNfse;
  naturezaQuestor: "5.933.004" | "6.933.004" | "conferir";
  pastaDestino: string;
  copiado: boolean;
  erro?: string;
};

export type FileSystemFileHandleNfseFx = {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
};

export type FileSystemDirectoryHandleNfseFx = {
  kind: "directory";
  name: string;
  entries: () => AsyncIterableIterator<
    [string, FileSystemFileHandleNfseFx | FileSystemDirectoryHandleNfseFx]
  >;
  getDirectoryHandle: (
    name: string,
    options?: { create?: boolean },
  ) => Promise<FileSystemDirectoryHandleNfseFx>;
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

export type PastaDestinoElectronNfseFx = {
  tipo: "electron";
  caminho: string;
  nome: string;
};

export type PastaDestinoNfseFx =
  | FileSystemDirectoryHandleNfseFx
  | PastaDestinoElectronNfseFx;

export type WindowComFileSystemAccessNfse = Window &
  typeof globalThis & {
    showDirectoryPicker?: (options?: {
      mode?: "read" | "readwrite";
    }) => Promise<FileSystemDirectoryHandleNfseFx>;
    fxElectron?: {
      selecionarPastaDestino: () => Promise<{
        canceled: boolean;
        filePath?: string;
        name?: string;
      }>;
      gravarArquivoTexto: (params: {
        pastaBase: string;
        caminhoRelativo: string;
        conteudo: string;
      }) => Promise<{
        ok: boolean;
        error?: string;
      }>;
    };
  };
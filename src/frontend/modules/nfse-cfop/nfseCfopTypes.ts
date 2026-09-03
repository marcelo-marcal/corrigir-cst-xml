export type StatusExecucaoNfseCfop = "parado" | "processando" | "concluido" | "erro";

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
  interestadual: boolean;
  ocorrencias: number;
  corrigido: boolean;
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

export type WindowComFileSystemAccessNfse = Window &
  typeof globalThis & {
    showDirectoryPicker?: (options?: {
      mode?: "read" | "readwrite";
    }) => Promise<FileSystemDirectoryHandleNfseFx>;
  };
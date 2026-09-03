export type StatusExecucaoXml = "parado" | "processando" | "concluido" | "erro";

export type ArquivoXmlSelecionado = {
  nome: string;
  caminho: string;
  arquivo: File;
};

export type ResultadoArquivoXml = {
  nome: string;
  caminho: string;
  ocorrencias: number;
  corrigido: boolean;
  erro?: string;
};

export type FileSystemFileHandleFx = {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
};

export type FileSystemDirectoryHandleFx = {
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

export type WindowComFileSystemAccess = Window &
  typeof globalThis & {
    showDirectoryPicker?: (options?: {
      mode?: "read" | "readwrite";
    }) => Promise<FileSystemDirectoryHandleFx>;
  };
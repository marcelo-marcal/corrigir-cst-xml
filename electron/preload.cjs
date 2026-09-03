const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fxElectron", {
  selecionarPastaDestino: () => ipcRenderer.invoke("fx:selecionar-pasta-destino"),

  gravarArquivoTexto: (params) =>
    ipcRenderer.invoke("fx:gravar-arquivo-texto", params),
});
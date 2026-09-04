const { app, BrowserWindow, Menu, dialog, ipcMain } = require("electron");
const fs = require("fs/promises");
const path = require("path");

const isDev = !app.isPackaged;

function createWindow() {
    Menu.setApplicationMenu(null);

    const mainWindow = new BrowserWindow({
        width: 1366,
        height: 820,
        minWidth: 1100,
        minHeight: 720,
        title: "Corretor Fiscal FX",
        backgroundColor: "#071317",
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.setMenuBarVisibility(false);

    mainWindow.once("ready-to-show", () => {
        mainWindow.maximize();
        mainWindow.show();
    });

    if (isDev) {
        mainWindow.loadURL("http://localhost:5173");
    } else {
        mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
}

ipcMain.handle("fx:selecionar-pasta-destino", async () => {
    const resultado = await dialog.showOpenDialog({
        title: "Escolha a pasta de saída",
        properties: ["openDirectory", "createDirectory"],
    });

    if (resultado.canceled || resultado.filePaths.length === 0) {
        return {
            canceled: true,
        };
    }

    const caminho = resultado.filePaths[0];

    return {
        canceled: false,
        filePath: caminho,
        name: path.basename(caminho),
    };
});

ipcMain.handle("fx:gravar-arquivo-texto", async (_event, params) => {
    try {
        if (
            !params ||
            typeof params.pastaBase !== "string" ||
            typeof params.caminhoRelativo !== "string" ||
            typeof params.conteudo !== "string"
        ) {
            throw new Error("Parâmetros inválidos para gravação do arquivo.");
        }

        const pastaBase = path.resolve(params.pastaBase);
        const caminhoFinal = path.resolve(pastaBase, params.caminhoRelativo);

        if (!caminhoFinal.startsWith(`${pastaBase}${path.sep}`)) {
            throw new Error("Caminho de saída inválido.");
        }

        await fs.mkdir(path.dirname(caminhoFinal), { recursive: true });
        await fs.writeFile(caminhoFinal, params.conteudo, "utf8");

        return {
            ok: true,
        };
    } catch (erro) {
        return {
            ok: false,
            error:
                erro instanceof Error
                    ? erro.message
                    : "Erro desconhecido ao gravar arquivo.",
        };
    }
});

app.whenReady().then(() => {
    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
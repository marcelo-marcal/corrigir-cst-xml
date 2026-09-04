import { useState } from "react";

import { AppFooter } from "./frontend/layout/AppFooter";
import { AppHeader } from "./frontend/layout/AppHeader";
import { AppSidebar } from "./frontend/layout/AppSidebar";
import { obterIconeAba } from "./frontend/layout/iconUtils";
import type {
  AbaSistema,
  ItemMenuSistema,
  TemaSistema,
} from "./frontend/layout/layoutTypes";
import { AtualizacaoPage } from "./frontend/modules/atualizacao/AtualizacaoPage";
import { ConfiguracoesPage } from "./frontend/modules/configuracoes/ConfiguracoesPage";
import { NfseCfopPage } from "./frontend/modules/nfse-cfop/NfseCfopPage";
import { ProdutosDominioPage } from "./frontend/modules/produtos-dominio/ProdutosDominioPage";
import { SpedFiscalPage } from "./frontend/modules/sped-fiscal/SpedFiscalPage";
import { ValidacaoPvaPage } from "./frontend/modules/validacao-pva/ValidacaoPvaPage";
import { XmlCorrecaoPage } from "./frontend/modules/xml-correcao/XmlCorrecaoPage";

const ABAS: ItemMenuSistema[] = [
  {
    id: "xml",
    titulo: "XML NFC-e/NF-e",
    subtitulo: "Correção em lote",
    icone: obterIconeAba("xml"),
    arquivoIcone: "arquivo-xml-white.png",
  },
  {
    id: "nfseCfop",
    titulo: "NFSe Questor",
    subtitulo: "Separar 5.933 / 6.933",
    icone: obterIconeAba("nfseCfop"),
    arquivoIcone: "esquerda-direita-white.png",
  },
  {
    id: "validacao",
    titulo: "Validação e Correção",
    subtitulo: "Regras PVA",
    icone: obterIconeAba("validacao"),
    arquivoIcone: "shield-white.png",
  },
  {
    id: "sped",
    titulo: "SPED Fiscal",
    subtitulo: "Análise fiscal",
    icone: obterIconeAba("sped"),
    arquivoIcone: "documentos_white.png",
  },
  {
    id: "dominio",
    titulo: "Produtos Domínio",
    subtitulo: "Ajustes de importação",
    icone: obterIconeAba("dominio"),
    arquivoIcone: "verified (1).png",
  },
  {
    id: "atualizacao",
    titulo: "Atualização",
    subtitulo: "Rotinas futuras",
    icone: obterIconeAba("atualizacao"),
    arquivoIcone: "cloud-computing_white.png",
  },
  {
    id: "configuracoes",
    titulo: "Configurações",
    subtitulo: "Empresas e parâmetros",
    icone: obterIconeAba("configuracoes"),
    arquivoIcone: "chave-inglesa_white.png",
  },
];

function App() {
  const [tema, setTema] = useState<TemaSistema>("dark");
  const [abaAtiva, setAbaAtiva] = useState<AbaSistema>("xml");
  const [sidebarRecolhida, setSidebarRecolhida] = useState(false);

  const temaClasse = tema === "dark" ? "theme-dark" : "theme-light";
  const sidebarClasse = sidebarRecolhida ? "sidebar-collapsed" : "";

  function alternarTema(): void {
    setTema((temaAtual) => (temaAtual === "dark" ? "light" : "dark"));
  }

  function alternarSidebar(): void {
    setSidebarRecolhida((estadoAtual) => !estadoAtual);
  }

  return (
    <div className={`app-shell ${temaClasse} ${sidebarClasse}`}>
      <AppSidebar
        abas={ABAS}
        abaAtiva={abaAtiva}
        recolhida={sidebarRecolhida}
        aoAlternarSidebar={alternarSidebar}
        aoSelecionarAba={setAbaAtiva}
      />

      <main className="app-main">
        <AppHeader tema={tema} aoAlternarTema={alternarTema} />

        <section className="app-content">
          <div style={{ display: abaAtiva === "xml" ? "block" : "none" }}>
            <XmlCorrecaoPage />
          </div>

          <div style={{ display: abaAtiva === "nfseCfop" ? "block" : "none" }}>
            <NfseCfopPage />
          </div>

          <div style={{ display: abaAtiva === "validacao" ? "block" : "none" }}>
            <ValidacaoPvaPage />
          </div>

          <div style={{ display: abaAtiva === "sped" ? "block" : "none" }}>
            <SpedFiscalPage />
          </div>

          <div style={{ display: abaAtiva === "dominio" ? "block" : "none" }}>
            <ProdutosDominioPage />
          </div>

          <div style={{ display: abaAtiva === "atualizacao" ? "block" : "none" }}>
            <AtualizacaoPage />
          </div>

          <div
            style={{ display: abaAtiva === "configuracoes" ? "block" : "none" }}
          >
            <ConfiguracoesPage />
          </div>
        </section>

        <AppFooter />
      </main>
    </div>
  );
}

export default App;
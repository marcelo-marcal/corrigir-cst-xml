import { FxIcon } from "../components/FxIcon";
import type { AbaSistema, ItemMenuSistema } from "./layoutTypes";

type AppSidebarProps = {
  abas: ItemMenuSistema[];
  abaAtiva: AbaSistema;
  recolhida: boolean;
  aoAlternarSidebar: () => void;
  aoSelecionarAba: (aba: AbaSistema) => void;
};

export function AppSidebar(props: AppSidebarProps) {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-top">
        <button
          type="button"
          className="brand-box brand-box-button"
          onClick={props.aoAlternarSidebar}
          title={props.recolhida ? "Expandir menu" : "Recolher menu"}
        >
          <div className="brand-mark">FX</div>

          <div className="brand-text">
            <strong>Corretor Fiscal</strong>
            <span>Automação XML/SPED</span>
          </div>
        </button>
      </div>

      <nav className="sidebar-nav">
        {props.abas.map((aba) => (
          <button
            key={aba.id}
            type="button"
            className={`sidebar-item ${props.abaAtiva === aba.id ? "active" : ""}`}
            onClick={() => props.aoSelecionarAba(aba.id)}
            title={aba.titulo}
          >
            <span className="sidebar-icon">
              <FxIcon
                arquivo={aba.arquivoIcone}
                textoAlternativo={aba.titulo}
                fallback={aba.icone}
                className="sidebar-icon-img"
              />
            </span>

            <span className="sidebar-label">
              <strong>{aba.titulo}</strong>
              <small>{aba.subtitulo}</small>
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
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
        <div className="brand-box">
          <div className="brand-mark">FX</div>

          <div className="brand-text">
            <strong>Corretor Fiscal</strong>
            <span>Automação XML/SPED</span>
          </div>
        </div>

        <button
          type="button"
          className="sidebar-toggle-button"
          onClick={props.aoAlternarSidebar}
          title={props.recolhida ? "Expandir menu" : "Recolher menu"}
        >
          {props.recolhida ? "›" : "‹"}
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
            <span className="sidebar-icon">{aba.icone}</span>

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
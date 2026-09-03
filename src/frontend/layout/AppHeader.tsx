import type { TemaSistema } from "./layoutTypes";
import { obterIconeTema } from "./iconUtils";

type AppHeaderProps = {
  tema: TemaSistema;
  aoAlternarTema: () => void;
};

export function AppHeader(props: AppHeaderProps) {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Sistema local</p>
        <h1>Corretor Fiscal FX</h1>
        <span>Correção fiscal em lote com segurança, conferência e relatório.</span>
      </div>

      <button
        type="button"
        className="theme-button"
        onClick={props.aoAlternarTema}
        title="Alternar tema"
      >
        {obterIconeTema(props.tema)}
      </button>
    </header>
  );
}
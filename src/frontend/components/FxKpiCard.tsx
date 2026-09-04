import { FxIcon } from "./FxIcon";

type FxKpiCardVariant = "orange" | "purple" | "blue" | "teal" | "red";

type FxKpiCardProps = {
  valor: string | number;
  titulo: string;
  descricao: string;
  icone: string;
  variante: FxKpiCardVariant;
  arquivoIcone?: string;
};

export function FxKpiCard(props: FxKpiCardProps) {
  return (
    <article className={`kpi-card kpi-${props.variante}`}>
      <div className="kpi-icon">
        <FxIcon
          arquivo={props.arquivoIcone}
          textoAlternativo={props.titulo}
          fallback={props.icone}
          className="kpi-icon-img"
        />
      </div>

      <div className="kpi-info">
        <strong>{props.valor}</strong>
        <span>{props.titulo}</span>
        <small>{props.descricao}</small>
      </div>
    </article>
  );
}
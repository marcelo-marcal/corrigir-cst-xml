type FxKpiCardVariant = "orange" | "purple" | "blue" | "teal" | "red";

type FxKpiCardProps = {
  valor: string | number;
  titulo: string;
  descricao: string;
  icone: string;
  variante: FxKpiCardVariant;
};

export function FxKpiCard(props: FxKpiCardProps) {
  return (
    <article className={`kpi-card kpi-${props.variante}`}>
      <div className="kpi-icon">{props.icone}</div>

      <div className="kpi-info">
        <strong>{props.valor}</strong>
        <span>{props.titulo}</span>
        <small>{props.descricao}</small>
      </div>
    </article>
  );
}
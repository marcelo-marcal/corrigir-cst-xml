import type { ReactNode } from "react";

type FxStepCardProps = {
  numero: number;
  titulo: string;
  descricao: string;
  icone: string;
  children: ReactNode;
};

export function FxStepCard(props: FxStepCardProps) {
  return (
    <article className="step-card">
      <div className="step-icon">{props.icone}</div>

      <div>
        <strong>
          {props.numero}. {props.titulo}
        </strong>
        <span>{props.descricao}</span>
      </div>

      <div className="step-actions">{props.children}</div>
    </article>
  );
}
import type { ReactNode } from "react";

import { FxIcon } from "./FxIcon";

type FxStepCardProps = {
  numero: number;
  titulo: string;
  descricao: string;
  icone: string;
  children: ReactNode;
  arquivoIcone?: string;
};

export function FxStepCard(props: FxStepCardProps) {
  return (
    <article className="step-card">
      <div className="step-icon">
        <FxIcon
          arquivo={props.arquivoIcone}
          textoAlternativo={props.titulo}
          fallback={props.icone}
          className="step-icon-img"
        />
      </div>

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
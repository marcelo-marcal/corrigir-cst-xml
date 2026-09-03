import type { ReactNode } from "react";

type FxPageHeaderProps = {
  eyebrow: string;
  titulo: string;
  descricao: string;
  children?: ReactNode;
};

export function FxPageHeader(props: FxPageHeaderProps) {
  return (
    <section className="page-hero">
      <div>
        <p className="eyebrow">{props.eyebrow}</p>
        <h2>{props.titulo}</h2>
        <p>{props.descricao}</p>
      </div>

      {props.children}
    </section>
  );
}
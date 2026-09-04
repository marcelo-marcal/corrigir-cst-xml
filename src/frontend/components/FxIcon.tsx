import { useState } from "react";

type FxIconProps = {
  arquivo?: string;
  textoAlternativo: string;
  fallback: string;
  className?: string;
};

export function FxIcon(props: FxIconProps) {
  const [erroImagem, setErroImagem] = useState(false);

  if (!props.arquivo || erroImagem) {
    return <span className={props.className}>{props.fallback}</span>;
  }

  return (
    <img
      className={props.className}
      src={`/icons/${props.arquivo}`}
      alt={props.textoAlternativo}
      draggable={false}
      onError={() => setErroImagem(true)}
    />
  );
}
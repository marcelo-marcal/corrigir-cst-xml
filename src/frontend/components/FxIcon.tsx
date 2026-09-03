type FxIconProps = {
  arquivo?: string;
  textoAlternativo: string;
  fallback: string;
  className?: string;
};

export function FxIcon(props: FxIconProps) {
  if (!props.arquivo) {
    return <span className={props.className}>{props.fallback}</span>;
  }

  return (
    <img
      className={props.className}
      src={`/icons/${props.arquivo}`}
      alt={props.textoAlternativo}
      onError={(evento) => {
        evento.currentTarget.style.display = "none";
      }}
    />
  );
}
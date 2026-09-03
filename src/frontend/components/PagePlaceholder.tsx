type PagePlaceholderItem = {
  texto: string;
};

type PagePlaceholderProps = {
  eyebrow: string;
  titulo: string;
  descricao: string;
  cardTitulo: string;
  itens: PagePlaceholderItem[];
};

export function PagePlaceholder(props: PagePlaceholderProps) {
  return (
    <section className="placeholder-page">
      <div className="page-hero placeholder-hero">
        <div>
          <p className="eyebrow">{props.eyebrow}</p>
          <h2>{props.titulo}</h2>
          <p>{props.descricao}</p>
        </div>

        <div className="status-pill status-parado">Em reconstrução</div>
      </div>

      <div className="placeholder-card placeholder-card-wide">
        <strong>{props.cardTitulo}</strong>

        <div className="placeholder-list">
          {props.itens.map((item) => (
            <span key={item.texto}>{item.texto}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
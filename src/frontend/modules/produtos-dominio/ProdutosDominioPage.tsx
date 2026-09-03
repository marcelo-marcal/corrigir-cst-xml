import { PagePlaceholder } from "../../components/PagePlaceholder";

export function ProdutosDominioPage() {
  return (
    <PagePlaceholder
      eyebrow="Produtos Domínio"
      titulo="Ajustes para importação no Domínio"
      descricao="Módulo reservado para corrigir situações específicas antes da importação no sistema Domínio, principalmente produtos de uso e consumo."
      cardTitulo="Regras que já tínhamos definido"
      itens={[
        { texto: "Produto com código 34893" },
        { texto: "Produto contendo USO ou USO E CONSUMO" },
        { texto: "CFOP 1556" },
        { texto: "Acumulador 1556" },
        { texto: "CST/CSOSN 090" },
      ]}
    />
  );
}
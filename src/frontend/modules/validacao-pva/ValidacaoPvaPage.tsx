import { PagePlaceholder } from "../../components/PagePlaceholder";

export function ValidacaoPvaPage() {
  return (
    <PagePlaceholder
      eyebrow="Validação e Correção"
      titulo="Validação PVA"
      descricao="Módulo reservado para reconstruirmos as rotinas de validação fiscal do SPED, incluindo conferências entre registros C100, C170 e C190."
      cardTitulo="Rotinas que vamos reconstruir"
      itens={[
        { texto: "C100 x C170" },
        { texto: "C170 x C190" },
        { texto: "Correções seguras para diferenças pequenas" },
        { texto: "Ignorar notas C100 sem itens C170" },
      ]}
    />
  );
}
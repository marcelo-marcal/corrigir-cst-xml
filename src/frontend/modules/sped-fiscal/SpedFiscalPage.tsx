import { PagePlaceholder } from "../../components/PagePlaceholder";

export function SpedFiscalPage() {
  return (
    <PagePlaceholder
      eyebrow="SPED Fiscal"
      titulo="Análise do SPED Fiscal"
      descricao="Módulo reservado para importação, leitura, análise e geração de relatórios do arquivo SPED Fiscal."
      cardTitulo="Rotinas previstas"
      itens={[
        { texto: "Importação do arquivo SPED Fiscal" },
        { texto: "Resumo por blocos e registros" },
        { texto: "Identificação de erros e avisos" },
        { texto: "Geração de arquivo corrigido quando a regra for segura" },
      ]}
    />
  );
}
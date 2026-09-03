import { PagePlaceholder } from "../../components/PagePlaceholder";

export function ConfiguracoesPage() {
  return (
    <PagePlaceholder
      eyebrow="Configurações"
      titulo="Empresas e parâmetros"
      descricao="Área reservada para cadastro de empresas, parâmetros fiscais e preferências gerais do sistema."
      cardTitulo="Configurações previstas"
      itens={[
        { texto: "Cadastro de empresas" },
        { texto: "UF da empresa" },
        { texto: "Parâmetros de correção XML" },
        { texto: "Preferências de layout e funcionamento" },
      ]}
    />
  );
}
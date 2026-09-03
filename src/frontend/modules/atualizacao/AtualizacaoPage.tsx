import { PagePlaceholder } from "../../components/PagePlaceholder";

export function AtualizacaoPage() {
  return (
    <PagePlaceholder
      eyebrow="Atualização"
      titulo="Atualizações do sistema"
      descricao="Área reservada para controle de versões, futuras atualizações e rotinas de manutenção do Corretor Fiscal FX."
      cardTitulo="Uso futuro"
      itens={[
        { texto: "Histórico de versões" },
        { texto: "Novas regras fiscais" },
        { texto: "Atualização de módulos" },
        { texto: "Controle de melhorias aplicadas" },
      ]}
    />
  );
}
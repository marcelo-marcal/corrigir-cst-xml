export type AbaSistema =
  | "xml"
  | "validacao"
  | "sped"
  | "dominio"
  | "atualizacao"
  | "configuracoes";

export type TemaSistema = "dark" | "light";

export type ItemMenuSistema = {
  id: AbaSistema;
  titulo: string;
  subtitulo: string;
  icone: string;
};
import type { AbaSistema, TemaSistema } from "./layoutTypes";

export function obterIconeAba(aba: AbaSistema): string {
  const icones: Record<AbaSistema, string> = {
    xml: "⌂",
    nfseCfop: "⇄",
    validacao: "🛡",
    sped: "▤",
    dominio: "⚖",
    atualizacao: "↻",
    configuracoes: "⚙",
  };

  return icones[aba];
}

export function obterIconeTema(tema: TemaSistema): string {
  return tema === "dark" ? "☀" : "◐";
}
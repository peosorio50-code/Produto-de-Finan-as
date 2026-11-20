/**
 * O site é estático (Cloudflare Pages). Tudo o que precisa de servidor
 * (pedido, Kiwify, IA, leads, e-mail) roda no servidor do Meu Santo Protetor,
 * em https://api.mapadaalma.online/api/folego/...
 */
export const API = (process.env.NEXT_PUBLIC_API || "https://api.mapadaalma.online").replace(/\/$/, "") + "/api/folego";

/** Configuração pública, fixada na hora do build (NEXT_PUBLIC_*). */
export const PUBLICO = {
  /** "0" fecha a venda (o resultado mostra "Em breve"). */
  vendaAberta: process.env.NEXT_PUBLIC_VENDA_ABERTA !== "0",
  /** "1" mostra o "receber o link por e-mail" (precisa do remetente do Fôlego na Resend). */
  reenvioPorEmail: process.env.NEXT_PUBLIC_REENVIO === "1",
};

export function postar(caminho: string, corpo: unknown, keepalive = false): Promise<Response> {
  return fetch(API + caminho, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo),
    keepalive,
  });
}

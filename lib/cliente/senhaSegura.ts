'use client';
// Confere a senha nova antes de criar a conta ou trocar a senha:
// mínimo de 8 caracteres, letras e números, e se ela já apareceu em vazamentos conhecidos.
// A consulta de vazamentos usa o serviço Pwned Passwords (haveibeenpwned.com) do jeito seguro:
// só os 5 primeiros caracteres do "resumo" (SHA-1) da senha saem do aparelho — a senha nunca é enviada.

async function sha1(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Quantas vezes a senha apareceu em vazamentos (0 = nunca). Devolve null se não deu para consultar. */
export async function vezesVazada(senha: string): Promise<number | null> {
  try {
    const h = await sha1(senha);
    const r = await fetch(`https://api.pwnedpasswords.com/range/${h.slice(0, 5)}`, { headers: { 'Add-Padding': 'true' } });
    if (!r.ok) return null;
    const resto = h.slice(5);
    for (const linha of (await r.text()).split('\n')) {
      const [suf, n] = linha.trim().split(':');
      if (suf === resto) return Number(n) || 0;
    }
    return 0;
  } catch { return null; }
}

/** Mensagem de erro se a senha não serve; vazio se está boa. */
export async function problemaNaSenha(senha: string): Promise<string> {
  if (senha.length < 8) return 'Use uma senha com pelo menos 8 caracteres.';
  if (!/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) return 'Use letras e números na senha.';
  const n = await vezesVazada(senha);
  if (n && n > 0) return 'Essa senha já apareceu em vazamentos de dados na internet e pode ser descoberta. Escolha outra.';
  return '';
}

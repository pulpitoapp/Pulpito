'use client';
// Foto do perfil: reduzida no aparelho (320×320, JPEG) e guardada nas preferências da conta.
import { useEffect, useState } from 'react';
import { pref } from './local';
import { gravarPreferencia, lerPreferencias } from './preferencias';

const ouvintes = new Set<(f: string) => void>();
const chave = (uid: string) => `foto:${uid}`;

export function useFoto(uid: string | undefined): string {
  const [foto, setFoto] = useState<string>(() => (uid ? pref.ler<string>(chave(uid), '') : ''));
  useEffect(() => {
    if (!uid) return;
    let vivo = true;
    void lerPreferencias(uid).then((d) => { const f = typeof d.foto === 'string' ? d.foto : ''; if (vivo) { setFoto(f); pref.gravar(chave(uid), f); } });
    const ouvir = (f: string) => setFoto(f);
    ouvintes.add(ouvir);
    return () => { vivo = false; ouvintes.delete(ouvir); };
  }, [uid]);
  return foto;
}

/** Recorta no centro e reduz a imagem escolhida. */
export async function prepararFoto(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith('image/')) throw new Error('Escolha uma imagem.');
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => erro(new Error('Não foi possível abrir esta imagem.')); i.src = url; });
    const lado = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement('canvas'); c.width = c.height = 320;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, 320, 320);
    return c.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(url); }
}

export async function gravarFoto(uid: string, foto: string): Promise<void> {
  pref.gravar(chave(uid), foto);
  ouvintes.forEach((o) => o(foto));
  await gravarPreferencia(uid, 'foto', foto);
}

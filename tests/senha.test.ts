import { afterEach, describe, expect, it, vi } from 'vitest';
import { problemaNaSenha } from '@/lib/cliente/senhaSegura';

afterEach(() => vi.unstubAllGlobals());

describe('senha segura', () => {
  it('pede 8 caracteres, com letras e números', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('')));
    expect(await problemaNaSenha('abc12')).toMatch(/8 caracteres/);
    expect(await problemaNaSenha('abcdefgh')).toMatch(/letras e números/);
    expect(await problemaNaSenha('pulpito2026x')).toBe('');
  });
  it('recusa senha que aparece em vazamentos (só o começo do resumo é enviado)', async () => {
    // SHA-1 de "password1" = E38AD214943DAAD1D64C102FAEC29DE4AFE9DA3D
    const f = vi.fn(async (url: string) => new Response(url.endsWith('/E38AD') ? '214943DAAD1D64C102FAEC29DE4AFE9DA3D:2413945\r\n0000000000000000000000000000000000A:0' : ''));
    vi.stubGlobal('fetch', f);
    expect(await problemaNaSenha('password1')).toMatch(/vazamentos/);
    expect(String(f.mock.calls[0][0])).toBe('https://api.pwnedpasswords.com/range/E38AD');
  });
  it('se não conseguir consultar, não trava o cadastro', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await problemaNaSenha('outra2026senha')).toBe('');
  });
});

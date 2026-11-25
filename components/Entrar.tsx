'use client';
import { problemaNaSenha } from '@/lib/cliente/senhaSegura';
import { useState } from 'react';
import { CARGOS, type Perfil } from '@/lib/tipos';
import { supa } from '@/lib/cliente/supabase';
import { useApp } from './contexto';
import { Logo } from './Logo';

const ERROS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme o seu e-mail (enviamos um link) antes de entrar.',
  'User already registered': 'Já existe uma conta com este e-mail. Use "Entrar".',
};
const traduzir = (m: string) => ERROS[m] || (/password/i.test(m) ? 'A senha precisa ter pelo menos 6 caracteres.' : /rate|seconds/i.test(m) ? 'Muitas tentativas. Aguarde um minuto.' : 'Não foi possível concluir: ' + m);

export function Entrar() {
  const [modo, setModo] = useState<'entrar' | 'criar' | 'esqueci'>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (modo === 'criar' && senha !== senha2) { setMsg('As duas senhas não são iguais. Digite de novo.'); return; }
    setOcupado(true);
    if (modo === 'criar') { const p = await problemaNaSenha(senha); if (p) { setMsg(p); setOcupado(false); return; } }
    try {
      const aqui = window.location.origin + window.location.pathname;
      if (modo === 'entrar') {
        const { error } = await supa().auth.signInWithPassword({ email: email.trim(), password: senha });
        if (error) setMsg(traduzir(error.message));
      } else if (modo === 'criar') {
        const { data, error } = await supa().auth.signUp({ email: email.trim(), password: senha, options: { data: { nome: nome.trim() }, emailRedirectTo: aqui } });
        if (error) setMsg(traduzir(error.message));
        else if (!data.session) {
          // se o projeto ainda exigir confirmação por e-mail, tenta entrar direto; se não der, avisa
          const r = await supa().auth.signInWithPassword({ email: email.trim(), password: senha });
          if (r.error) setMsg('Conta criada. Abra o link que enviamos para o seu e-mail para confirmar e depois entre.');
        }
      } else {
        const { error } = await supa().auth.resetPasswordForEmail(email.trim(), { redirectTo: aqui });
        setMsg(error ? traduzir(error.message) : 'Enviamos um link para o seu e-mail. Abra-o neste aparelho para definir uma nova senha.');
      }
    } finally { setOcupado(false); }
  }


  return (
    <main className="topo min-h-dvh px-5 pb-10 pt-[max(56px,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-sm">
        <p className="rot m-0">Igreja Cristã Maranata</p>
        <h1 className="mt-3"><Logo tamanho={40} /></h1>
        <div className="ornamento !mx-0" aria-hidden="true" />
        <p className="mb-6 mt-5">Bíblia, anotações e mensagens.</p>
        <form onSubmit={enviar} className="cartao flex flex-col gap-3">
          <h2 className="tit">{modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Recuperar senha'}</h2>
          {modo === 'criar' ? (
            <div><label className="rotulo" htmlFor="nome">Seu nome</label><input id="nome" className="campo" value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" /></div>
          ) : null}
          <div><label className="rotulo" htmlFor="email">E-mail</label><input id="email" type="email" className="campo" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" inputMode="email" /></div>
          {modo !== 'esqueci' ? (
            <div><label className="rotulo" htmlFor="senha">Senha</label><input id="senha" type="password" className="campo" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={modo === 'criar' ? 8 : 6} autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} /></div>
          ) : null}
          {modo === 'criar' ? (
            <div><label className="rotulo" htmlFor="senha2">Repita a senha</label><input id="senha2" type="password" className="campo" value={senha2} onChange={(e) => setSenha2(e.target.value)} required minLength={8} autoComplete="new-password" aria-invalid={!!senha2 && senha !== senha2} />
              {senha2 && senha !== senha2 ? <p className="ajuda" style={{ color: 'var(--red)' }}>As senhas ainda não são iguais.</p> : null}</div>
          ) : null}
          {msg ? <p className="aviso m-0" role="alert">{msg}</p> : null}
          <button type="submit" className="btn btn-pri" disabled={ocupado}>{ocupado ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Enviar link'}</button>
          <div className="flex flex-wrap justify-between gap-2 text-[14.5px]">
            <button type="button" className="underline" onClick={() => { setModo(modo === 'entrar' ? 'criar' : 'entrar'); setMsg(''); }}>{modo === 'entrar' ? 'Criar uma conta' : 'Já tenho conta'}</button>
            {modo === 'entrar' ? <button type="button" className="underline" onClick={() => { setModo('esqueci'); setMsg(''); }}>Esqueci a senha</button> : null}
          </div>
        </form>
        <p className="mt-4 text-center text-[13.5px]">Ao entrar, você concorda com a <a className="underline" href="#/privacidade">política de privacidade</a>.</p>
      </div>
    </main>
  );
}

/** Campos do perfil — usado no primeiro acesso e na tela de Perfil. */
export function CamposPerfil({ valor, mudar }: { valor: Pick<Perfil, 'nome' | 'cargo' | 'igreja' | 'cidade'>; mudar: (v: Partial<Perfil>) => void }) {
  return (
    <>
      <div><label className="rotulo" htmlFor="pNome">Nome</label><input id="pNome" className="campo" value={valor.nome} onChange={(e) => mudar({ nome: e.target.value })} required maxLength={120} /></div>
      <div><label className="rotulo" htmlFor="pCargo">Cargo</label>
        <select id="pCargo" className="campo" value={valor.cargo} onChange={(e) => mudar({ cargo: e.target.value })}>{CARGOS.map((c) => <option key={c}>{c}</option>)}</select></div>
      <div><label className="rotulo" htmlFor="pIgreja">Igreja</label><input id="pIgreja" className="campo" value={valor.igreja} onChange={(e) => mudar({ igreja: e.target.value })} maxLength={120} placeholder="Ex.: ICM de Vila Velha" /></div>
      <div><label className="rotulo" htmlFor="pCidade">Cidade</label><input id="pCidade" className="campo" value={valor.cidade} onChange={(e) => mudar({ cidade: e.target.value })} maxLength={120} /></div>
    </>
  );
}

/** Primeiro acesso: completa o cadastro e registra o aceite da política de privacidade. */
export function CompletarPerfil() {
  const { perfil, atualizarPerfil, avisar, sair } = useApp();
  const [v, setV] = useState({ nome: perfil.nome, cargo: perfil.cargo, igreja: perfil.igreja, cidade: perfil.cidade });
  const [aceito, setAceito] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    const mudancas = { ...v, nome: v.nome.trim(), aceite_privacidade: new Date().toISOString() };
    const { error } = await supa().from('perfis').update(mudancas).eq('id', perfil.id);
    setOcupado(false);
    if (error) { avisar('Não foi possível salvar. Confira a conexão.'); return; }
    atualizarPerfil({ ...perfil, ...mudancas });
  }

  return (
    <main className="mx-auto max-w-md p-5 pt-10">
      <h1 className="text-3xl">Complete o seu cadastro</h1>
      <p className="mb-4 mt-2 text-mute">Esses dados aparecem como autoria nas suas mensagens.</p>
      <form onSubmit={salvar} className="cartao flex flex-col gap-3">
        <CamposPerfil valor={v} mudar={(m) => setV({ ...v, ...m } as typeof v)} />
        <label className="flex items-start gap-2 text-[15px]">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={aceito} onChange={(e) => setAceito(e.target.checked)} required />
          <span>Li e aceito a <a className="underline" href="#/privacidade">política de privacidade</a>, inclusive o uso do meu cargo e da minha igreja (dados que indicam a minha religião) para identificar a autoria das mensagens.</span>
        </label>
        <button type="submit" className="btn btn-pri" disabled={ocupado || !aceito}>{ocupado ? 'Salvando…' : 'Salvar e continuar'}</button>
        <button type="button" className="btn" onClick={sair}>Sair</button>
      </form>
    </main>
  );
}

/** Depois de abrir o link de "esqueci a senha": define a nova senha. */
export function NovaSenha({ aoConcluir }: { aoConcluir: () => void }) {
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);
  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha !== senha2) { setMsg('As duas senhas não são iguais. Digite de novo.'); return; }
    setOcupado(true);
    const p = await problemaNaSenha(senha);
    if (p) { setMsg(p); setOcupado(false); return; }
    const { error } = await supa().auth.updateUser({ password: senha });
    setOcupado(false);
    if (error) setMsg(traduzir(error.message)); else aoConcluir();
  }
  return (
    <main className="mx-auto max-w-sm p-5 pt-16">
      <form onSubmit={salvar} className="cartao flex flex-col gap-3">
        <h1 className="tit">Definir nova senha</h1>
        <div><label className="rotulo" htmlFor="nSenha">Nova senha</label><input id="nSenha" type="password" className="campo" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} autoComplete="new-password" /></div>
        <div><label className="rotulo" htmlFor="nSenha2">Repita a nova senha</label><input id="nSenha2" type="password" className="campo" value={senha2} onChange={(e) => setSenha2(e.target.value)} required minLength={8} autoComplete="new-password" /></div>
        {msg ? <p className="aviso m-0" role="alert">{msg}</p> : null}
        <button type="submit" className="btn btn-pri" disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar nova senha'}</button>
        <button type="button" className="btn" onClick={aoConcluir}>Agora não</button>
      </form>
    </main>
  );
}

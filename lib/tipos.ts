// Tipos e listas usados em todo o app.

export const CARGOS = ['Pastor', 'Ungido', 'Diácono', 'Obreiro', 'Jovem', 'Senhora', 'Outros'] as const;
export const ESTILOS = ['Oração', 'Salvação', 'Renovo', 'Avivamento', 'Volta de Jesus', 'Entrega', 'Despertamento', 'Doutrina', 'Louvor'] as const;
export const SITUACOES = ['rascunho', 'pronta', 'pregada'] as const;
export const ROTULO_SITUACAO: Record<string, string> = { rascunho: 'Rascunho', pronta: 'Pronta', pregada: 'Já preguei' };

/** Cores do marca-texto. */
export const CORES: Record<string, string> = { am: '#f6dc7a', vd: '#a8dbab', az: '#a6cdf2', rs: '#f4b0c8', lj: '#f7c08a' };
export const NOME_COR: Record<string, string> = { am: 'amarelo', vd: 'verde', az: 'azul', rs: 'rosa', lj: 'laranja' };

export type Perfil = {
  id: string;
  email: string | null;
  nome: string;
  cargo: string;
  igreja: string;
  cidade: string;
  versao: string;
  papel: 'admin' | 'usuario';
  bloqueado: boolean;
  aceite_privacidade: string | null;
};

/** Um traço feito à mão: cor, espessura, ferramenta e pontos [x, y, pressão] em medidas de 0 a 1000 da largura. */
export type Traco = { c: string; e: number; f: 'caneta' | 'marca'; p: number[] };

/** Texto bíblico usado numa mensagem, com a cor do marca-texto. */
export type TextoUsado = { ref: string; cor: string };

export type Conteudo = {
  texto: string;          // mensagem digitada
  refs: TextoUsado[];     // textos bíblicos usados
  tracos: Traco[];        // mensagem escrita à mão
  altura: number;         // altura da folha de escrita (em medidas de 0 a 1000 da largura)
};

export type Mensagem = {
  id: string;
  autor_id: string;
  autor_linha: string;
  titulo: string;
  tema: string;
  serie: string;
  situacao: 'rascunho' | 'pronta' | 'pregada';
  visibilidade: 'privada' | 'publica';
  conteudo: Conteudo;
  criado_em: string;
  atualizado_em: string;
};

export type Pregacao = { id: string; mensagem_id: string; autor_id: string; data: string; igreja: string; ocasiao: string };
export type Nota = { texto: string; tracos: Traco[]; atualizado_em: string };
export type Trecho = { id: number; apostila: string; titulo: string; texto: string };

export const conteudoVazio = (): Conteudo => ({ texto: '', refs: [], tracos: [], altura: 1400 });

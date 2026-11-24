// Ícones simples em SVG.
type P = { className?: string };
const traco = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24', 'aria-hidden': true } as const;
const cheio = { fill: 'currentColor', viewBox: '0 0 24 24', 'aria-hidden': true } as const;

export const IcoInicio = (p: P) => <svg {...traco} {...p}><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>;
export const IcoMensagens = (p: P) => <svg {...traco} {...p}><path d="M5 4h11l3 3v13H5z" /><path d="M9 9h6M9 13h6M9 17h4" /></svg>;
export const IcoBiblia = (p: P) => <svg {...traco} {...p}><path d="M11.4 6.2C9 4.8 5.8 4.8 3 5.7v11.6c2.8-.9 6-.9 8.4.5z" /><path d="M12.6 6.2C15 4.8 18.2 4.8 21 5.7v11.6c-2.8-.9-6-.9-8.4.5z" /></svg>;
export const IcoPerfil = (p: P) => <svg {...traco} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>;
export const IcoMais = (p: P) => <svg {...traco} strokeWidth={2.2} {...p}><path d="M12 5v14M5 12h14" /></svg>;
export const IcoVoltar = (p: P) => <svg {...traco} strokeWidth={2.4} {...p}><path d="M14.5 6.5L9 12l5.5 5.5" /></svg>;
export const IcoAvancar = (p: P) => <svg {...traco} strokeWidth={2.4} {...p}><path d="M9.5 6.5L15 12l-5.5 5.5" /></svg>;
export const IcoMenu = (p: P) => <svg {...traco} strokeWidth={2.4} {...p}><path d="M5 8h14M11 15h8" /></svg>;
export const IcoBusca = (p: P) => <svg {...traco} {...p}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg>;
export const IcoFechar = (p: P) => <svg {...traco} strokeWidth={2.2} {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const IcoCadeado = (p: P) => <svg {...traco} {...p}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></svg>;
export const IcoGlobo = (p: P) => <svg {...traco} {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" /></svg>;
export const IcoSair = (p: P) => <svg {...traco} {...p}><path d="M10 4H5v16h5" /><path d="M14 8l4 4-4 4M18 12H9" /></svg>;
export const IcoAdmin = (p: P) => <svg {...traco} {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></svg>;
// barra de ações do versículo (cheios, como na referência)
export const IcoLapis = (p: P) => <svg {...cheio} {...p}><path d="M15.2 4.3a2 2 0 012.8 0l1.7 1.7a2 2 0 010 2.8L9.5 19 4 20l1-5.5z" /></svg>;
export const IcoMarca = (p: P) => <svg {...cheio} {...p}><path d="M14.5 3.5l6 6-8.2 8.2-6-6zM5.4 12.6l6 6L9 21H3.5l-.5-.5 3-3z" /></svg>;
export const IcoRefs = (p: P) => <svg {...traco} strokeWidth={2.2} {...p}><path d="M9.5 14.5l5-5" /><path d="M11 6.5l1.2-1.2a4.2 4.2 0 016 6L17 12.5M13 17.5l-1.2 1.2a4.2 4.2 0 01-6-6L7 11.5" /></svg>;
export const IcoApostila = (p: P) => <svg {...cheio} {...p}><path d="M5 3h10l4 4v14H5zM8 10h8v1.6H8zm0 3.4h8V15H8zm0 3.4h5v1.6H8z" fillRule="evenodd" /></svg>;
export const IcoMensagemAdd = (p: P) => <svg {...cheio} {...p}><path d="M7 3h10a1 1 0 011 1v17l-6-3.6L6 21V4a1 1 0 011-1z" /></svg>;
export const IcoOriginal = (p: P) => <svg viewBox="0 0 24 24" aria-hidden="true" {...p}><text x="12" y="17" textAnchor="middle" fontSize="15" fontWeight="700" fill="currentColor" fontFamily="Georgia, serif">אα</text></svg>;
export const IcoEnviar = (p: P) => <svg {...cheio} {...p}><path d="M21 3L3 10.5l6.5 2.6L19 5l-7.4 9.6L14 21z" /></svg>;
export const IcoCompartilhar = (p: P) => <svg {...traco} {...p}><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5" /><path d="M8 11H6v9h12v-9h-2" /></svg>;
export const IcoSalvar = (p: P) => <svg {...traco} {...p}><path d="M7 3h10a1 1 0 011 1v17l-6-3.6L6 21V4a1 1 0 011-1z" /></svg>;

import { Abertura } from '@/components/Abertura';
import { App } from '@/components/App';

// O Púlpito é uma única página; as telas trocam dentro dela (isso é o que
// permite abrir o app sem internet).
export default function Pagina() {
  return (
    <>
      <App />
      <Abertura />
    </>
  );
}

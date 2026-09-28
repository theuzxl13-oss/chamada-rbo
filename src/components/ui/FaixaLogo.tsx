/** Faixa superior com a logo da igreja (versão branca sobre fundo preto). */
export function FaixaLogo({ compacta = false }: { compacta?: boolean }) {
  return (
    <header className="bg-faixa">
      <div className={`mx-auto flex max-w-6xl items-center justify-center px-4 ${compacta ? "py-2" : "py-4 sm:py-5"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-branca.png"
          alt="Igreja Evangélica Assembleia de Deus em São Paulo — Ministério do Belém — Setor 46 Embu-Guaçu"
          className={compacta ? "h-10 w-auto sm:h-12" : "h-14 w-auto sm:h-20"}
        />
      </div>
    </header>
  );
}

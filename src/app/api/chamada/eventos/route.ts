import { obterServico } from "@/server/servico";
import type { EstadoCompartilhado } from "@/domain/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Canal em tempo real (Server-Sent Events).
 * Cada aparelho mantém esta conexão aberta e recebe o estado completo
 * sempre que qualquer outro aparelho altera a chamada.
 */
export async function GET(request: Request) {
  const servico = obterServico();
  const codificador = new TextEncoder();
  let cancelar: () => void = () => {};

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fechado = false;
      const enviar = (texto: string) => {
        if (fechado) return;
        try {
          controller.enqueue(codificador.encode(texto));
        } catch {
          encerrar();
        }
      };
      const enviarEstado = (estado: EstadoCompartilhado) =>
        enviar(`data: ${JSON.stringify(estado)}\n\n`);

      const desinscrever = servico.inscrever(enviarEstado);
      // Mantém a conexão viva em redes Wi-Fi que derrubam conexões ociosas.
      const batimento = setInterval(() => enviar(`: ping\n\n`), 15000);

      function encerrar() {
        if (fechado) return;
        fechado = true;
        clearInterval(batimento);
        desinscrever();
        try {
          controller.close();
        } catch {
          // já fechado
        }
      }
      cancelar = encerrar;
      request.signal.addEventListener("abort", encerrar);

      enviar(`retry: 2000\n\n`);
      enviarEstado(await servico.obterEstado());
    },
    cancel() {
      cancelar();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

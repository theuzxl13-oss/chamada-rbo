"use client";

/**
 * Sincroniza a chamada entre este aparelho e o servidor local.
 *
 * - Recebe o estado compartilhado em tempo real (Server-Sent Events).
 * - Envia as alterações em fila, na ordem em que foram feitas.
 * - Mostra contagens imediatamente (atualização otimista), sem esperar a rede.
 * - Se a rede cair, as contagens ficam guardadas na fila e são reenviadas;
 *   o servidor ignora reenvios duplicados (cada operação tem um id único).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  aplicarOperacao,
  ehOperacaoOtimista,
  type ContextoOperacao,
  type Operacao,
} from "@/domain/operacoes";
import { montarEstadoPublico } from "@/domain/estado";
import type { Chamada, DadosCompartilhados, EstadoCompartilhado } from "@/domain/types";
import { lerBackup, limparBackup, salvarBackup } from "@/lib/backupLocal";
import { MODO_SUPABASE, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import { gerarId } from "@/lib/id";

export type StatusConexao = "conectando" | "online" | "offline";

export type ResultadoEnvio =
  | { ok: true; estado: EstadoCompartilhado }
  | { ok: false; erro: string; codigo?: string };

interface ItemFila {
  id: string;
  op: Operacao;
  resolver: (r: ResultadoEnvio) => void;
}

const URL_ESTADO = "/api/chamada";
const URL_EVENTOS = "/api/chamada/eventos";
/** Operações não otimistas (criar, finalizar...) desistem após algumas tentativas. */
const TENTATIVAS_OPERACAO_BLOQUEANTE = 3;

const contextoLocal: ContextoOperacao = {
  agora: () => new Date().toISOString(),
  novoId: () => gerarId(),
};

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useChamadaSincronizada() {
  const [estado, setEstado] = useState<EstadoCompartilhado | null>(null);
  const [pendentes, setPendentes] = useState<ItemFila[]>([]);
  const [conexao, setConexao] = useState<StatusConexao>("conectando");
  const [erroRecente, setErroRecente] = useState<{ id: string; mensagem: string } | null>(null);
  const [backup, setBackup] = useState<Chamada | null>(null);

  const estadoRef = useRef<EstadoCompartilhado | null>(null);
  const filaRef = useRef<ItemFila[]>([]);
  const processandoRef = useRef(false);

  const aceitarEstado = useCallback((novo: EstadoCompartilhado) => {
    const atual = estadoRef.current;
    if (atual && atual.servidorId === novo.servidorId && novo.versao <= atual.versao) return;
    estadoRef.current = novo;
    setEstado(novo);
  }, []);

  const buscarEstado = useCallback(async () => {
    try {
      const resp = await fetch(URL_ESTADO, { cache: "no-store" });
      if (!resp.ok) throw new Error(String(resp.status));
      aceitarEstado((await resp.json()) as EstadoCompartilhado);
      setConexao("online");
    } catch {
      setConexao("offline");
    }
  }, [aceitarEstado]);

  // ------------------------------------------------------------------ tempo real
  useEffect(() => {
    if (!MODO_SUPABASE) return;
    // Modo hospedado: o Supabase Realtime avisa cada alteração da linha de estado.
    let encerrado = false;
    let removerCanal: (() => void) | null = null;

    void import("@supabase/supabase-js").then(({ createClient }) => {
      if (encerrado) return;
      const cliente = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const canal = cliente
        .channel("estado-compartilhado")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "estado_compartilhado", filter: "id=eq.1" },
          (payload) => {
            const linha = payload.new as { versao?: number; dados?: Record<string, unknown> };
            if (linha?.dados && typeof linha.versao === "number") {
              aceitarEstado(montarEstadoPublico("supabase", linha.versao, linha.dados));
            } else {
              void buscarEstado(); // conteúdo grande demais para o aviso: busca completo
            }
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setConexao("online");
            void buscarEstado(); // garante que nada foi perdido durante a reconexão
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setConexao("offline");
          }
        });
      removerCanal = () => void cliente.removeChannel(canal);
    });

    const aoVoltar = () => {
      if (document.visibilityState === "visible") void buscarEstado();
    };
    void buscarEstado();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("online", aoVoltar);
    // Segurança extra: atualiza a cada 20s caso algum aviso em tempo real se perca.
    const intervalo = setInterval(aoVoltar, 20000);
    return () => {
      encerrado = true;
      removerCanal?.();
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("online", aoVoltar);
    };
  }, [aceitarEstado, buscarEstado]);

  useEffect(() => {
    if (MODO_SUPABASE) return;
    // Modo local: canal de eventos do próprio servidor (Server-Sent Events).
    let fonte: EventSource | null = null;
    let encerrado = false;

    const conectar = () => {
      if (encerrado) return;
      fonte?.close();
      fonte = new EventSource(URL_EVENTOS);
      fonte.onopen = () => setConexao("online");
      fonte.onmessage = (ev) => {
        try {
          aceitarEstado(JSON.parse(ev.data) as EstadoCompartilhado);
          setConexao("online");
        } catch {
          // mensagem inválida: ignorada
        }
      };
      fonte.onerror = () => {
        setConexao("offline");
        // O navegador tenta reconectar sozinho; se desistir, reconectamos manualmente.
        if (fonte?.readyState === EventSource.CLOSED) setTimeout(conectar, 3000);
      };
    };

    // Celular desbloqueado / aba volta ao primeiro plano: garante dados atualizados.
    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      void buscarEstado();
      if (!fonte || fonte.readyState === EventSource.CLOSED) conectar();
    };

    void buscarEstado();
    conectar();
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("online", aoVoltar);
    return () => {
      encerrado = true;
      fonte?.close();
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("online", aoVoltar);
    };
  }, [aceitarEstado, buscarEstado]);

  // ------------------------------------------------------------------ fila de envio
  const processarFila = useCallback(async () => {
    if (processandoRef.current) return;
    processandoRef.current = true;
    try {
      while (filaRef.current.length > 0) {
        const item = filaRef.current[0];
        let resultado: ResultadoEnvio | null = null;

        for (let tentativa = 0; resultado === null; tentativa++) {
          try {
            const resp = await fetch(URL_ESTADO, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: item.id, op: item.op }),
            });
            const json = (await resp.json()) as {
              ok: boolean;
              erro?: string;
              codigo?: string;
              estado?: EstadoCompartilhado;
            };
            if (json.estado) aceitarEstado(json.estado);
            setConexao("online");
            resultado =
              json.ok && json.estado
                ? { ok: true, estado: json.estado }
                : { ok: false, erro: json.erro ?? "Operação recusada.", codigo: json.codigo };
          } catch {
            setConexao("offline");
            const bloqueante = !ehOperacaoOtimista(item.op);
            if (bloqueante && tentativa + 1 >= TENTATIVAS_OPERACAO_BLOQUEANTE) {
              resultado = {
                ok: false,
                codigo: "SEM_CONEXAO",
                erro: "Sem conexão com o servidor. Verifique a internet e tente novamente.",
              };
            } else {
              await esperar(Math.min(1000 * 2 ** tentativa, 5000));
            }
          }
        }

        filaRef.current = filaRef.current.slice(1);
        setPendentes(filaRef.current);
        if (!resultado.ok && ehOperacaoOtimista(item.op)) {
          setErroRecente({ id: item.id, mensagem: resultado.erro });
        }
        item.resolver(resultado);
      }
    } finally {
      processandoRef.current = false;
    }
  }, [aceitarEstado]);

  const enviar = useCallback(
    (op: Operacao): Promise<ResultadoEnvio> =>
      new Promise((resolver) => {
        const item: ItemFila = { id: gerarId(), op, resolver };
        filaRef.current = [...filaRef.current, item];
        setPendentes(filaRef.current);
        void processarFila();
      }),
    [processarFila],
  );

  // ------------------------------------------------------------------ estado exibido
  /** Estado do servidor + alterações deste aparelho ainda não confirmadas. */
  const dados = useMemo<DadosCompartilhados | null>(() => {
    if (!estado) return null;
    let resultado: DadosCompartilhados = { chamada: estado.chamada, obreiros: estado.obreiros };
    for (const item of pendentes) {
      if (!ehOperacaoOtimista(item.op) || estado.opsAplicadas.includes(item.id)) continue;
      try {
        resultado = aplicarOperacao(resultado, item.op, contextoLocal);
      } catch {
        // será rejeitada pelo servidor; não altera a tela
      }
    }
    return resultado;
  }, [estado, pendentes]);
  const chamada = dados?.chamada ?? null;
  const obreiros = useMemo(() => dados?.obreiros ?? [], [dados]);

  // ------------------------------------------------------------------ backup local
  useEffect(() => {
    if (!estado) return;
    if (estado.chamada) {
      salvarBackup(estado.chamada);
      setBackup(null);
      return;
    }
    const salvo = lerBackup();
    if (salvo && estado.chamadasEncerradas.includes(salvo.reuniao?.id)) {
      // A chamada foi encerrada/descartada de propósito: o backup não é mais necessário.
      limparBackup();
      setBackup(null);
    } else {
      setBackup(salvo);
    }
  }, [estado]);

  const restaurarBackup = useCallback(async (): Promise<ResultadoEnvio> => {
    const salvo = lerBackup();
    if (!salvo) return { ok: false, erro: "Nenhuma chamada salva neste aparelho." };
    return enviar({ tipo: "restaurar", chamada: salvo });
  }, [enviar]);

  const descartarBackup = useCallback(() => {
    limparBackup();
    setBackup(null);
  }, []);

  const limparErro = useCallback(() => setErroRecente(null), []);

  return {
    /** true depois de receber o primeiro estado do servidor */
    pronto: estado !== null,
    estado,
    chamada,
    obreiros,
    conexao,
    alteracoesPendentes: pendentes.filter((p) => ehOperacaoOtimista(p.op)).length,
    enviar,
    erroRecente,
    limparErro,
    backup,
    restaurarBackup,
    descartarBackup,
  };
}

export type ChamadaSincronizada = ReturnType<typeof useChamadaSincronizada>;

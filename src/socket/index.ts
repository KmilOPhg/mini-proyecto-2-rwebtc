import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { AppError } from "../utils/AppError.js";
import {
  logMediaUpdate,
  logSalaJoin,
  logSalaLeave,
  logScreenStart,
  logScreenStop,
} from "../utils/signalingLogger.js";
import { socketRoomName, verifySocketJwt } from "./auth.js";

type SocketData = {
  uid: string;
  nombre: string;
};

type PeerEnSala = {
  peerId: string;
  uid: string;
  nombre: string;
  audioMuted: boolean;
  videoMuted: boolean;
  sharingScreen: boolean;
};

type MediaState = {
  audioMuted: boolean;
  videoMuted: boolean;
};

const peersPorSala = new Map<string, Map<string, PeerEnSala>>();

let ioInstance: Server | null = null;

function normalizarOrigen(valor?: string): string {
  return (valor || "").replace(/\/$/, "").toLowerCase();
}

function obtenerOrigenesPermitidos(): string[] {
  return [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:5176",
    "http://127.0.0.1:5176",
    "http://localhost:1206",
    "http://127.0.0.1:1206",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
  ]
    .filter(Boolean)
    .map((origen) => normalizarOrigen(origen));
}

function obtenerErrorMensaje(err: unknown): string {
  if (err instanceof AppError) return err.message;
  if (err instanceof Error) return err.message;
  return "Error inesperado en el servidor.";
}

function obtenerMapaSala(salaId: string): Map<string, PeerEnSala> {
  let mapa = peersPorSala.get(salaId);
  if (!mapa) {
    mapa = new Map();
    peersPorSala.set(salaId, mapa);
  }
  return mapa;
}

function listarPeersSala(salaId: string): PeerEnSala[] {
  return Array.from(obtenerMapaSala(salaId).values());
}

function quitarPeerDeSala(salaId: string, uid: string): PeerEnSala | null {
  const mapa = peersPorSala.get(salaId);
  if (!mapa) return null;
  const peer = mapa.get(uid) ?? null;
  mapa.delete(uid);
  if (mapa.size === 0) {
    peersPorSala.delete(salaId);
  }
  return peer;
}

export function obtenerEstadoSalas(): { salaId: string; peers: PeerEnSala[] }[] {
  return Array.from(peersPorSala.entries()).map(([salaId, mapa]) => ({
    salaId,
    peers: Array.from(mapa.values()),
  }));
}

export function initSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const permitidos = new Set(obtenerOrigenesPermitidos());
        if (permitidos.has(normalizarOrigen(origin))) return callback(null, true);
        return callback(new Error("No permitido por CORS"));
      },
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      const token =
        (typeof socket.handshake.auth?.token === "string" && socket.handshake.auth.token) ||
        (typeof socket.handshake.headers.authorization === "string" &&
        socket.handshake.headers.authorization.startsWith("Bearer ")
          ? socket.handshake.headers.authorization.slice(7)
          : "");

      if (!token) {
        return next(new Error("Token no proporcionado."));
      }

      const user = verifySocketJwt(token);
      socket.data = { uid: user.id, nombre: user.nombre } satisfies SocketData;
      next();
    } catch (err) {
      next(new Error(obtenerErrorMensaje(err)));
    }
  });

  io.on("connection", (socket: Socket) => {
    const data = socket.data as SocketData;
    const salasActivas = new Set<string>();

    socket.on(
      "sala:join",
      (
        payload: { salaId?: string; peerId?: string },
        ack?: (res: unknown) => void
      ) => {
        try {
          const salaId = typeof payload?.salaId === "string" ? payload.salaId.trim() : "";
          const peerId = typeof payload?.peerId === "string" ? payload.peerId.trim() : "";

          if (!salaId) {
            throw new AppError("El id de la sala es obligatorio.", 400);
          }
          if (!peerId) {
            throw new AppError("El peerId es obligatorio.", 400);
          }

          const mapa = obtenerMapaSala(salaId);
          const existentes = listarPeersSala(salaId).filter((p) => p.uid !== data.uid);

          const registro: PeerEnSala = {
            peerId,
            uid: data.uid,
            nombre: data.nombre,
            audioMuted: false,
            videoMuted: false,
            sharingScreen: false,
          };

          mapa.set(data.uid, registro);
          socket.join(socketRoomName(salaId));
          salasActivas.add(salaId);

          logSalaJoin(salaId, peerId, data.uid, data.nombre);

          socket.to(socketRoomName(salaId)).emit("peer:joined", {
            peerId,
            uid: data.uid,
            nombre: data.nombre,
          });

          ack?.({
            ok: true,
            salaId,
            peerId,
            peers: existentes,
          });
        } catch (err) {
          ack?.({ ok: false, error: obtenerErrorMensaje(err) });
        }
      }
    );

    socket.on(
      "sala:leave",
      (payload: { salaId?: string }, ack?: (res: unknown) => void) => {
        const salaId = typeof payload?.salaId === "string" ? payload.salaId.trim() : "";
        if (!salaId) {
          ack?.({ ok: false, error: "El id de la sala es obligatorio." });
          return;
        }

        const peer = quitarPeerDeSala(salaId, data.uid);
        socket.leave(socketRoomName(salaId));
        salasActivas.delete(salaId);

        if (peer) {
          logSalaLeave(salaId, peer.peerId, data.uid, data.nombre);
          socket.to(socketRoomName(salaId)).emit("peer:left", {
            peerId: peer.peerId,
            uid: data.uid,
          });
        }

        ack?.({ ok: true, salaId });
      }
    );

    socket.on(
      "media:update",
      (
        payload: { salaId?: string; audioMuted?: boolean; videoMuted?: boolean },
        ack?: (res: unknown) => void
      ) => {
        try {
          const salaId = typeof payload?.salaId === "string" ? payload.salaId.trim() : "";
          if (!salaId) {
            throw new AppError("El id de la sala es obligatorio.", 400);
          }

          const mapa = obtenerMapaSala(salaId);
          const peer = mapa.get(data.uid);
          if (!peer) {
            throw new AppError("Debes unirte a la sala antes de actualizar el media.", 400);
          }

          const audioMuted = Boolean(payload?.audioMuted);
          const videoMuted = Boolean(payload?.videoMuted);

          peer.audioMuted = audioMuted;
          peer.videoMuted = videoMuted;

          logMediaUpdate(salaId, data.uid, audioMuted, videoMuted);

          io.to(socketRoomName(salaId)).emit("media:state-changed", {
            uid: data.uid,
            audioMuted,
            videoMuted,
          } satisfies MediaState & { uid: string });

          ack?.({ ok: true });
        } catch (err) {
          ack?.({ ok: false, error: obtenerErrorMensaje(err) });
        }
      }
    );

    socket.on(
      "screen:start",
      (payload: { salaId?: string }, ack?: (res: unknown) => void) => {
        try {
          const salaId = typeof payload?.salaId === "string" ? payload.salaId.trim() : "";
          if (!salaId) {
            throw new AppError("El id de la sala es obligatorio.", 400);
          }

          const mapa = obtenerMapaSala(salaId);
          const peer = mapa.get(data.uid);
          if (!peer) {
            throw new AppError("Debes unirte a la sala antes de compartir pantalla.", 400);
          }

          peer.sharingScreen = true;
          logScreenStart(salaId, data.uid);

          socket.to(socketRoomName(salaId)).emit("screen:started", { uid: data.uid });
          ack?.({ ok: true });
        } catch (err) {
          ack?.({ ok: false, error: obtenerErrorMensaje(err) });
        }
      }
    );

    socket.on(
      "screen:stop",
      (payload: { salaId?: string }, ack?: (res: unknown) => void) => {
        try {
          const salaId = typeof payload?.salaId === "string" ? payload.salaId.trim() : "";
          if (!salaId) {
            throw new AppError("El id de la sala es obligatorio.", 400);
          }

          const mapa = obtenerMapaSala(salaId);
          const peer = mapa.get(data.uid);
          if (peer) {
            peer.sharingScreen = false;
          }

          logScreenStop(salaId, data.uid);
          socket.to(socketRoomName(salaId)).emit("screen:stopped", { uid: data.uid });
          ack?.({ ok: true });
        } catch (err) {
          ack?.({ ok: false, error: obtenerErrorMensaje(err) });
        }
      }
    );

    socket.on("disconnect", () => {
      for (const salaId of salasActivas) {
        const peer = quitarPeerDeSala(salaId, data.uid);
        if (peer) {
          logSalaLeave(salaId, peer.peerId, data.uid, data.nombre);
          io.to(socketRoomName(salaId)).emit("peer:left", {
            peerId: peer.peerId,
            uid: data.uid,
          });
        }
      }
    });
  });

  ioInstance = io;
  return io;
}

export function getIoInstance(): Server | null {
  return ioInstance;
}

import type { Server as HttpServer } from "node:http";
import type { Application } from "express";
import { ExpressPeerServer } from "peer";
import type { IClient, IMessage } from "peer";
import {
  logIceError,
  logPeerConnect,
  logPeerDisconnect,
  logPeerError,
  logPeerMessage,
} from "../utils/signalingLogger.js";

export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

/** Configuración ICE (STUN + ExpressTURN) para los clientes WebRTC. */
export function obtenerIceServers(): IceServerConfig[] {
  const turnServer = process.env.TURN_SERVER?.trim() || "free.expressturn.com:3478";
  const turnUsername = process.env.TURN_USERNAME?.trim() || "";
  const turnCredential = process.env.TURN_CREDENTIAL?.trim() || "";

  return [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: [
        `turn:${turnServer}?transport=udp`,
        `turn:${turnServer}?transport=tcp`,
      ],
      username: turnUsername,
      credential: turnCredential,
    },
  ];
}

export function initPeerServer(httpServer: HttpServer, app: Application) {
  const peerServer = ExpressPeerServer(httpServer, {
    path: "/",
    allow_discovery: true,
  });

  app.use("/peerjs", peerServer);

  peerServer.on("connection", (client: IClient) => {
    logPeerConnect(client.getId());
  });

  peerServer.on("message", (client: IClient, message: IMessage) => {
    const peerId = client.getId();
    const type = message.type;
    logPeerMessage(peerId, type);

    if (type === "OFFER" || type === "ANSWER" || type === "CANDIDATE") {
      console.log(`[Peer] Signaling ${type} intercambiado para peer ${peerId}`);
    }

    if (type === "ERROR") {
      const payload = message.payload ?? "Error desconocido";
      logPeerError(peerId, String(payload));
      if (/ice|candidate|stun|turn/i.test(String(payload))) {
        logIceError(peerId, String(payload));
      }
    }
  });

  peerServer.on("disconnect", (client: IClient) => {
    logPeerDisconnect(client.getId());
  });

  peerServer.on("error", (error: Error) => {
    logPeerError("server", error.message);
  });

  return peerServer;
}

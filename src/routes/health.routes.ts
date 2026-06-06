import { Router, type Request, type Response, type NextFunction } from "express";
import { obtenerIceServers } from "../peer/index.js";
import { obtenerEstadoSalas } from "../socket/index.js";

const router = Router();

function requireInternalKey(req: Request, res: Response, next: NextFunction) {
  const key = process.env.INTERNAL_API_KEY?.trim();
  if (!key) return next();
  if (req.headers["x-internal-api-key"] !== key) {
    res.status(401).json({ status: "error", msg: "Clave interna no válida." });
    return;
  }
  next();
}

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    server: "webrtc-signaling",
    peerjsPath: "/peerjs",
    socketPath: "/socket.io",
  });
});

router.get("/ice-servers", (_req, res) => {
  res.json({
    status: "success",
    data: {
      iceServers: obtenerIceServers(),
    },
  });
});

router.get("/internal/status", requireInternalKey, (_req, res) => {
  res.json({
    status: "success",
    data: {
      salas: obtenerEstadoSalas(),
      iceServers: obtenerIceServers(),
    },
  });
});

export default router;

import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError.js";
import { ROL_ESTUDIANTE_ID, type JwtUserPayload } from "../types/auth.types.js";

export function verifySocketJwt(token: string): JwtUserPayload {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("JWT_SECRET no está configurado en el servidor", 500);
  }

  const decoded = jwt.verify(token, secret) as Record<string, unknown>;
  const user: JwtUserPayload = {
    id: decoded.id != null ? String(decoded.id) : "",
    nombre: typeof decoded.nombre === "string" ? decoded.nombre : "",
    email: decoded.email == null ? null : String(decoded.email),
    rolId: decoded.rolId != null ? String(decoded.rolId) : "",
    estado: (decoded.estado as JwtUserPayload["estado"]) ?? "ACTIVO",
    clienteId:
      decoded.clienteId === null || decoded.clienteId === undefined
        ? null
        : String(decoded.clienteId),
  };

  if (!user.id) {
    throw new AppError("Token inválido.", 401);
  }
  if (user.rolId !== ROL_ESTUDIANTE_ID) {
    throw new AppError("Solo los estudiantes pueden usar WebRTC.", 403);
  }
  if (user.estado !== "ACTIVO") {
    throw new AppError("Tu cuenta está inactiva.", 403);
  }

  return user;
}

export function socketRoomName(salaId: string): string {
  return `webrtc:sala:${salaId}`;
}

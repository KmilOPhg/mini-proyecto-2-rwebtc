import colors from "colors";

export function logPeerConnect(peerId: string, uid?: string): void {
  const user = uid ? ` (${uid})` : "";
  console.log(colors.green(`[Peer] Conectado: ${peerId}${user}`));
}

export function logPeerDisconnect(peerId: string, uid?: string): void {
  const user = uid ? ` (${uid})` : "";
  console.log(colors.yellow(`[Peer] Desconectado: ${peerId}${user}`));
}

export function logPeerError(peerId: string, message: string): void {
  console.log(colors.red(`[Peer] Error en ${peerId}: ${message}`));
}

export function logPeerMessage(peerId: string, type: string): void {
  console.log(colors.gray(`[Peer] Mensaje ${type} desde ${peerId}`));
}

export function logSalaJoin(
  salaId: string,
  peerId: string,
  uid: string,
  nombre: string
): void {
  const visible = nombre.trim() || uid;
  console.log(
    colors.blue(`[Sala] ${visible} (${uid}) se unió a ${salaId} con peerId ${peerId}`)
  );
}

export function logSalaLeave(
  salaId: string,
  peerId: string,
  uid: string,
  nombre: string
): void {
  const visible = nombre.trim() || uid;
  console.log(
    colors.blue(`[Sala] ${visible} (${uid}) salió de ${salaId} (peerId ${peerId})`)
  );
}

export function logMediaUpdate(
  salaId: string,
  uid: string,
  audioMuted: boolean,
  videoMuted: boolean
): void {
  const audio = audioMuted ? "mute" : "unmute";
  const video = videoMuted ? "cámara off" : "cámara on";
  console.log(colors.cyan(`[Media] ${uid} en ${salaId}: audio=${audio}, video=${video}`));
}

export function logScreenStart(salaId: string, uid: string): void {
  console.log(colors.magenta(`[Screen] ${uid} inició compartir pantalla en ${salaId}`));
}

export function logScreenStop(salaId: string, uid: string): void {
  console.log(colors.magenta(`[Screen] ${uid} detuvo compartir pantalla en ${salaId}`));
}

export function logIceError(peerId: string, message: string): void {
  console.log(colors.red(`[ICE] Error en peer ${peerId}: ${message}`));
}

export function logSignalingServerStart(port: number | string): void {
  console.log(colors.cyan.bold(`[Signaling] Servidor WebRTC escuchando en puerto ${port}`));
  console.log(colors.cyan(`[Signaling] PeerJS disponible en /peerjs`));
  console.log(colors.cyan(`[Signaling] ICE servers en GET /ice-servers`));
}

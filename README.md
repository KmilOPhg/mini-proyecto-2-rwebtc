# mini-proyecto-2-webrtc

Servidor de **Signaling WebRTC** para mini-proyecto-2. Implementa **TS-03** (intercambio SDP/ICE vía PeerJS) y sincroniza estados de media para **US-12**, **US-13** y **US-14**.

## Ubicación del Signaling Server

| Componente | URL / Puerto |
|---|---|
| **Servidor principal** | `http://localhost:3002` |
| **PeerJS (SDP + ICE)** | `http://localhost:3002/peerjs` |
| **Socket.io (estado AV)** | `http://localhost:3002` (path `/socket.io`) |
| **ICE servers (STUN/TURN)** | `GET http://localhost:3002/ice-servers` |
| **Health check** | `GET http://localhost:3002/health` |

El código del signaling está en:

- **PeerJS**: [`src/peer/index.ts`](src/peer/index.ts)
- **Socket.io (salas, mute, cámara, pantalla)**: [`src/socket/index.ts`](src/socket/index.ts)
- **Entry point**: [`src/index.ts`](src/index.ts)

## Requisitos

- Node.js 18+
- Mismo `JWT_SECRET` que el backend principal (`mini-proyecto-2-backend`)

## Instalación

```bash
npm install
cp .env.example .env
# Editar .env con JWT_SECRET e INTERNAL_API_KEY
```

## Desarrollo

```bash
npm run dev
```

## Producción

```bash
npm run build
npm run prod
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (default: `3002`) |
| `FRONTEND_URL` | Origen permitido por CORS |
| `JWT_SECRET` | Secreto JWT compartido con el backend |
| `INTERNAL_API_KEY` | Clave para endpoints internos |
| `TURN_SERVER` | Servidor TURN ExpressTURN |
| `TURN_USERNAME` | Usuario TURN |
| `TURN_CREDENTIAL` | Contraseña TURN |

## Eventos Socket.io

### Cliente → Servidor

| Evento | Payload | Descripción |
|---|---|---|
| `sala:join` | `{ salaId, peerId }` | Unirse a sala WebRTC |
| `sala:leave` | `{ salaId }` | Salir de la sala |
| `media:update` | `{ salaId, audioMuted, videoMuted }` | Mute micrófono / apagar cámara (US-13) |
| `screen:start` | `{ salaId }` | Iniciar compartir pantalla (US-14) |
| `screen:stop` | `{ salaId }` | Detener compartir pantalla (US-14) |

### Servidor → Cliente

| Evento | Payload | Descripción |
|---|---|---|
| `peer:joined` | `{ peerId, uid, nombre }` | Nuevo participante para llamar |
| `peer:left` | `{ peerId, uid }` | Participante salió |
| `media:state-changed` | `{ uid, audioMuted, videoMuted }` | Estado AV actualizado |
| `screen:started` | `{ uid }` | Alguien comparte pantalla |
| `screen:stopped` | `{ uid }` | Alguien dejó de compartir |

## Autenticación

Todas las conexiones Socket.io requieren JWT de estudiante:

```js
const socket = io("http://localhost:3002", {
  auth: { token: "JWT_DEL_BACKEND" },
});
```

## Cliente PeerJS (ejemplo)

```js
import Peer from "peerjs";

const iceRes = await fetch("http://localhost:3002/ice-servers");
const { data } = await iceRes.json();

const peer = new Peer({
  host: "localhost",
  port: 3002,
  path: "/peerjs",
  config: { iceServers: data.iceServers },
});
```

## Logs

El servidor imprime logs con prefijos de color:

- `[Peer]` — conexiones PeerJS, ofertas/respuestas/ICE
- `[Sala]` — join/leave de salas
- `[Media]` — mute/unmute y cámara on/off
- `[Screen]` — compartir pantalla
- `[ICE]` — errores de conectividad ICE/TURN
- `[Signaling]` — arranque del servidor

## Ramas Git

| Rama | Uso |
|---|---|
| `master` | Producción — solo el propietario puede hacer push |
| `dev` | Desarrollo — colaboradores trabajan aquí |

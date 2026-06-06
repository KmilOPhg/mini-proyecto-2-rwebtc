import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import { initPeerServer } from "./peer/index.js";
import { initSocketServer } from "./socket/index.js";
import { logSignalingServerStart } from "./utils/signalingLogger.js";

const port = process.env.PORT || 3002;

async function start() {
  const httpServer = createServer(app);
  initPeerServer(httpServer, app);
  initSocketServer(httpServer);

  httpServer.listen(port, () => {
    logSignalingServerStart(port);
  });
}

start();

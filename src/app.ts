import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import morgan from "morgan";
import healthRouter from "./routes/health.routes.js";
import { origenPermitido } from "./utils/corsOrigins.js";

const app = express();

app.use(morgan("combined"));

const localOrigins = [
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
  "http://10.222.185.24:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (origenPermitido(origin, localOrigins)) return callback(null, true);
      return callback(new Error("No permitido por CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(healthRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const msg = err instanceof Error ? err.message : "Error interno del servidor";
  res.status(500).json({ status: "error", msg });
});

export default app;

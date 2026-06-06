/** Payload del JWT del estudiante (mismo formato que el backend principal). */
export type JwtUserPayload = {
  id: string;
  nombre: string;
  email: string | null;
  rolId: string;
  estado: "ACTIVO" | "INACTIVO";
  clienteId: string | null;
};

export const ROL_ESTUDIANTE_ID = "estudiante";

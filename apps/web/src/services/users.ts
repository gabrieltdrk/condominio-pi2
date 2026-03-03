const BASE_URL = import.meta.env.VITE_API_URL;

export type UserRecord = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "MORADOR";
  created_at: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "MORADOR";
};

export async function listUsers(token: string): Promise<UserRecord[]> {
  const res = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erro ao carregar usuários.");
  return res.json();
}

export async function createUser(token: string, payload: CreateUserPayload): Promise<UserRecord> {
  const res = await fetch(`${BASE_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Erro ao criar usuário.");
  }
  return res.json();
}

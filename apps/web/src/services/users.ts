const BASE_URL = import.meta.env.VITE_API_URL;

export type UserRecord = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "MORADOR";
  created_at: string;
};

export async function listUsers(token: string): Promise<UserRecord[]> {
  const res = await fetch(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Erro ao carregar usuários.");
  return res.json();
}

export type UserRole = "ADMIN" | "MORADOR";

export type User = {
  name: string;
  role: UserRole;
  email: string;
};

type LoginResponse = {
  token: string;
  user: User;
};



const BASE_URL = import.meta.env.VITE_API_URL;

async function requestLogin(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Erro no login.");
  }

  return res.json();
}
export async function login(email: string, password: string): Promise<User> {
  const { token, user } = await requestLogin(email.trim(), password);
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  return user;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getUser(): User | null {
  const raw = localStorage.getItem("user");
  return raw ? (JSON.parse(raw) as User) : null;
}
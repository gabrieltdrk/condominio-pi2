# Página: Perfil (`/perfil`)

Edição dos dados pessoais do usuário logado.

---

## Fluxo

1. Carrega os dados do perfil via Supabase (`profiles` tabela).
2. Usuário pode alterar nome, telefone, e-mail, placa e quantidade de pets.
3. Alteração de e-mail dispara confirmação no Supabase Auth.
4. Upload de foto de perfil salvo no bucket `profile-avatars` do Supabase Storage.

---

## Peculiaridades

- Foto de perfil: aceita JPG, PNG e WEBP até 5 MB. A foto anterior é removida do storage ao fazer upload de uma nova.
- Alteração de e-mail requer confirmação no novo endereço antes de ser efetivada.
- Acesso para todos os roles autenticados.

/**
 * Utilitários de arquivo compartilhados — validação e path de storage.
 */

export type ValidateFileOptions = {
  maxMb: number;
  types?: string[]; // ex: ["image/jpeg", "image/png", "image/webp", "application/pdf"]
};

/** Lança um Error se o arquivo não passar nas validações de tipo ou tamanho. */
export function validateFile(file: File, opts: ValidateFileOptions): void {
  if (opts.types && opts.types.length > 0 && !opts.types.includes(file.type)) {
    const labels = opts.types
      .map((t) => t.split("/")[1]?.toUpperCase() ?? t)
      .join(", ");
    throw new Error(`Formato inválido. Envie: ${labels}.`);
  }
  if (file.size > opts.maxMb * 1024 * 1024) {
    throw new Error(`O arquivo deve ter no máximo ${opts.maxMb} MB.`);
  }
}

/**
 * Extrai o storage path relativo a partir de uma URL pública do Supabase Storage.
 * Ex: "https://.../storage/v1/object/public/profile-avatars/uid/file.jpg" →
 *     "uid/file.jpg"
 */
export function getStoragePathFromPublicUrl(
  url: string | null | undefined,
  bucket: string,
): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const marker = `/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

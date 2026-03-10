type BadgeProps = { text: string; cls: string };
export function Badge({ text, cls }: BadgeProps) {
  return (
    <span className={`text-xs font-semibold border px-2.5 py-0.5 rounded-full whitespace-nowrap ${cls}`}>
      {text}
    </span>
  );
}

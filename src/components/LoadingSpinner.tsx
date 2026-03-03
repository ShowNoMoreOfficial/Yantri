export default function LoadingSpinner({
  size = "md",
  label,
}: {
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-10 h-10 border-3",
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} border-zinc-700 border-t-zinc-200 rounded-full animate-spin`}
      />
      {label && <span className="text-sm text-zinc-400">{label}</span>}
    </div>
  );
}

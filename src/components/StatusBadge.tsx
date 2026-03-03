const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  selected: "bg-blue-100 text-blue-800",
  skipped: "bg-gray-100 text-gray-600",
  monitoring: "bg-purple-100 text-purple-800",
  planned: "bg-blue-100 text-blue-800",
  researching: "bg-indigo-100 text-indigo-800",
  producing: "bg-orange-100 text-orange-800",
  published: "bg-green-100 text-green-800",
  killed: "bg-red-100 text-red-800",
};

export default function StatusBadge({ status }: { status: string }) {
  const color = statusColors[status] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

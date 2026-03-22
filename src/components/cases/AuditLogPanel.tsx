"use client";

interface AuditEntry {
  id: string;
  createdAt: string;
  action: string;
  userName: string | null;
  userRole: string | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  notes: string | null;
}

export default function AuditLogPanel({ auditLogs }: { auditLogs: AuditEntry[] }) {
  if (!auditLogs.length) {
    return <p className="text-sm text-neutral-mid">No audit entries recorded.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 pr-4 font-medium text-neutral-mid">Timestamp</th>
            <th className="text-left py-2 pr-4 font-medium text-neutral-mid">User</th>
            <th className="text-left py-2 pr-4 font-medium text-neutral-mid">Action</th>
            <th className="text-left py-2 pr-4 font-medium text-neutral-mid">Detail</th>
          </tr>
        </thead>
        <tbody>
          {auditLogs.map((log) => (
            <tr key={log.id} className="border-b border-border">
              <td className="py-2 pr-4 font-mono text-neutral-mid whitespace-nowrap">
                {new Date(log.createdAt).toLocaleString()}
              </td>
              <td className="py-2 pr-4">
                <div className="font-medium">{log.userName || "System"}</div>
                {log.userRole && <div className="text-neutral-mid">{log.userRole}</div>}
              </td>
              <td className="py-2 pr-4">
                <span className="badge bg-neutral-light text-neutral-dark">{log.action}</span>
              </td>
              <td className="py-2 pr-4 text-neutral-mid">
                {log.notes || (log.fieldName ? `${log.fieldName}: ${log.oldValue || ""} → ${log.newValue || ""}` : "")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

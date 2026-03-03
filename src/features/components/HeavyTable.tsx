import React, { useState, useMemo } from "react";

interface Row {
  id: number;
  name: string;
  value: number;
  status: "active" | "inactive" | "pending";
}

function generateData(count: number): Row[] {
  const statuses: Row["status"][] = ["active", "inactive", "pending"];
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Item ${i + 1}`,
    value: Math.round(Math.random() * 10000) / 100,
    status: statuses[i % 3],
  }));
}

const STATUS_COLORS: Record<Row["status"], string> = {
  active: "#4caf50",
  inactive: "#f44336",
  pending: "#ff9800",
};

export default function HeavyTable() {
  const [count, setCount] = useState(50);
  const data = useMemo(() => generateData(count), [count]);

  return (
    <div>
      <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ color: "#999", fontSize: 12 }}>Rows:</label>
        <input
          type="range"
          min={10}
          max={200}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ color: "#aaa", fontSize: 12, minWidth: 30 }}>{count}</span>
      </div>

      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #333" }}>
              <th style={{ padding: "6px 8px", textAlign: "left", color: "#888" }}>ID</th>
              <th style={{ padding: "6px 8px", textAlign: "left", color: "#888" }}>Name</th>
              <th style={{ padding: "6px 8px", textAlign: "right", color: "#888" }}>Value</th>
              <th style={{ padding: "6px 8px", textAlign: "center", color: "#888" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: "4px 8px", color: "#666" }}>{row.id}</td>
                <td style={{ padding: "4px 8px" }}>{row.name}</td>
                <td style={{ padding: "4px 8px", textAlign: "right" }}>
                  ${row.value.toFixed(2)}
                </td>
                <td style={{ padding: "4px 8px", textAlign: "center" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 10,
                      fontSize: 11,
                      background: STATUS_COLORS[row.status] + "22",
                      color: STATUS_COLORS[row.status],
                    }}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

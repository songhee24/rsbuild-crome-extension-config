import React, { useState, useMemo } from "react";
import { useShadowStyles } from "../../utils/shadow-style";
import css from "./HeavyTable.css?raw";

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
  useShadowStyles(css);

  const [count, setCount] = useState(50);
  const data = useMemo(() => generateData(count), [count]);

  return (
    <div>
      <div className="controls">
        <label className="label">Rows:</label>
        <input
          type="range"
          min={10}
          max={200}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="range"
        />
        <span className="count">{count}</span>
      </div>

      <div className="scrollWrapper">
        <table className="table">
          <thead>
            <tr className="headerRow">
              <th className="thLeft">ID</th>
              <th className="thLeft">Name</th>
              <th className="thRight">Value</th>
              <th className="thCenter">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="bodyRow">
                <td className="tdId">{row.id}</td>
                <td className="td">{row.name}</td>
                <td className="tdRight">${row.value.toFixed(2)}</td>
                <td className="tdCenter">
                  <span
                    className="badge"
                    style={{
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

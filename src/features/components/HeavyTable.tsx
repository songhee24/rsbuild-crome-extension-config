import React, { useState, useMemo } from "react";
import styles from "./HeavyTable.module.css";

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
      <div className={styles.controls}>
        <label className={styles.label}>Rows:</label>
        <input
          type="range"
          min={10}
          max={200}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className={styles.range}
        />
        <span className={styles.count}>{count}</span>
      </div>

      <div className={styles.scrollWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={styles.thLeft}>ID</th>
              <th className={styles.thLeft}>Name</th>
              <th className={styles.thRight}>Value</th>
              <th className={styles.thCenter}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className={styles.bodyRow}>
                <td className={styles.tdId}>{row.id}</td>
                <td className={styles.td}>{row.name}</td>
                <td className={styles.tdRight}>${row.value.toFixed(2)}</td>
                <td className={styles.tdCenter}>
                  <span
                    className={styles.badge}
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

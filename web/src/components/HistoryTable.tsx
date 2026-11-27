export interface HistoryRecord { id: string; activity_date: string; quantity: number; }
export const HistoryTable = ({ records, unit }: { records: HistoryRecord[]; unit?: string }) => records.length
  ? <div className="table-wrap"><table aria-label="Activity history"><thead><tr><th>Date</th><th className="num">Activity{unit ? ` (${unit})` : ''}</th></tr></thead>
    <tbody>{records.map((record) => <tr key={record.id}><td>{record.activity_date}</td><td className="num">{record.quantity}</td></tr>)}</tbody></table></div>
  : <p className="empty">No activity recorded yet — 0%.</p>;

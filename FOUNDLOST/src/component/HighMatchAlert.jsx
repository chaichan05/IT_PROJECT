const fieldLabels = {
  item_name: "ชื่อสิ่งของ",
  description: "รายละเอียด",
  location: "สถานที่",
};

const HighMatchAlert = ({ source, match, type, onClose }) => {
  const sourceLocation = type === "lost" ? source.lost_location : source.found_location;
  const candidateLocation = type === "lost" ? match.found_location : match.lost_location;
  const candidateLabel = type === "lost" ? "รายการของที่พบ" : "รายการของหาย";

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-teal-200 bg-white shadow-lg">
      <div className="flex items-start justify-between gap-4 bg-teal-700 p-5 text-white">
        <div>
          <p className="text-xs font-semibold tracking-wider text-teal-100">✓ MATCH FOUND</p>
          <h3 className="mt-1 text-xl font-bold">พบรายการที่อาจเป็นชิ้นเดียวกัน</h3>
          <p className="mt-1 text-sm text-teal-100">ระบบแจ้งเตือนเฉพาะคู่ที่มีคะแนนตรงกันตั้งแต่ 90% ขึ้นไป</p>
        </div>
        <div className="shrink-0 rounded-full border-4 border-teal-300 px-3 py-2 text-center">
          <strong className="block text-2xl leading-none">{Math.round(match.score)}%</strong>
          <span className="text-xs">คะแนนตรงกัน</span>
        </div>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-2">
        <article className="rounded-lg border-l-4 border-red-400 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-red-500">รายการที่คุณแจ้ง</p>
          <h4 className="mt-1 font-bold text-slate-800">{source.item_name}</h4>
          <p className="mt-1 text-sm text-slate-600">รายละเอียด: {source.description || "-"}</p>
          <p className="text-sm text-slate-600">สถานที่: {sourceLocation || "-"}</p>
        </article>
        <article className="rounded-lg border-l-4 border-teal-500 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-teal-600">{candidateLabel}</p>
          <h4 className="mt-1 font-bold text-slate-800">{match.item_name}</h4>
          <p className="mt-1 text-sm text-slate-600">รายละเอียด: {match.description || "-"}</p>
          <p className="text-sm text-slate-600">สถานที่: {candidateLocation || "-"}</p>
        </article>
      </div>

      <div className="mx-5 rounded-lg bg-teal-50 p-4">
        <h4 className="font-semibold text-teal-900">ข้อมูลที่ตรงกัน</h4>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {Object.entries(match.field_scores).map(([field, score]) => (
            <div key={field} className="rounded bg-white px-3 py-2 text-center shadow-sm">
              <p className="text-xs text-slate-500">{fieldLabels[field]}</p>
              <p className="font-bold text-teal-700">{score}%</p>
            </div>
          ))}
        </div>
        <ul className="mt-3 list-disc pl-5 text-sm text-teal-900">
          {match.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      </div>

      <div className="p-5 text-center">
        <button type="button" onClick={onClose} className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          ปิดการแจ้งเตือน
        </button>
      </div>
    </section>
  );
};

export default HighMatchAlert;

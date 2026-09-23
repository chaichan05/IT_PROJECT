import { useState } from "react";
import axios from "axios";

const MatchResults = ({ item, type }) => {
  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const findMatches = async () => {
    // เรียก API ตามชนิดของรายการปัจจุบัน เพื่อค้นหาในตารางฝั่งตรงข้าม
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(`http://localhost:3000/matching/${type}/${item.item_id}`);
      setMatches(response.data.matches);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "ไม่สามารถค้นหารายการที่ใกล้เคียงได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t pt-4">
      <button type="button" onClick={findMatches} disabled={loading} className="rounded bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:bg-slate-400">
        {loading ? "กำลังจับคู่..." : "ค้นหารายการที่ใกล้เคียง"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {matches && (
        <div className="mt-3 space-y-3">
          {/* API คืนเฉพาะรายการที่ผ่านเกณฑ์คะแนนขั้นต่ำแล้ว */}
          {matches.length === 0 ? <p className="text-sm text-slate-500">ยังไม่พบรายการที่ตรงกันตั้งแต่ 90%</p> : matches.map((match) => {
            const location = type === "lost" ? match.found_location : match.lost_location;
            return (
              <article key={match.item_id} className="rounded-md border border-teal-100 bg-teal-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="font-semibold text-slate-800">{match.item_name}</h3><p className="text-sm text-slate-600">สถานที่: {location || "-"}</p></div>
                  <span className="shrink-0 rounded-full bg-teal-600 px-2 py-1 text-sm font-bold text-white">{Math.round(match.score)}%</span>
                </div>
                {match.description && <p className="mt-1 text-sm text-slate-600">{match.description}</p>}
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
                  <span>ชื่อ: {match.field_scores.item_name}%</span>
                  <span>รายละเอียด: {match.field_scores.description}%</span>
                  <span>สถานที่: {match.field_scores.location}%</span>
                </div>
                <ul className="mt-2 list-disc pl-5 text-sm text-teal-800">{match.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MatchResults;

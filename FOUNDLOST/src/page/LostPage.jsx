import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../component/Navbar";

const LostPage = () => {
  const [lostItem, setLostItem] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get("http://localhost:3000/dataLost")
      .then((response) => {
        console.log(response.data);
        setLostItem(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.log("Error fetching lost item: ", error);
        setError("Unable to load lost items. Please try again shortly.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-6">กำลังโหลดข้อมูล...</div>;
  }
  if (error) {
    return <div className="app-page-with-navbar"><Navbar /><main className="p-6"><p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{error}</p></main></div>;
  }


  return (
    <div className="app-page-with-navbar">
      <Navbar />
      <main className="max-w-5xl mx-auto p-6">
      <h3 className="text-2xl font-semibold mb-6">รายการของหาย</h3>

      {lostItem.length === 0 ? (
        <p className="text-slate-500">ยังไม่มีรายการของหาย</p>
      ) : (
        <div className="space-y-4">
          {lostItem.map((item) => (
            <div
              key={item.item_id}
              className="border rounded-lg p-4 shadow-sm bg-white"
            >
              <h2 className="text-red-400 text-xl font-bold">
                {item.item_name}
              </h2>
              <p>หมวดหมู่: {item.category}</p>
              <p>สี: {item.item_color || "-"}</p>
              <p>สถานที่พบ: {item.lost_location}</p>
              <p>รายละเอียด: {item.description || "-"}</p>
              <p>จุดฝากของ: {item.deposit_location}</p>
              {item.image_url && (
                <img
                  src={`http://localhost:3000${item.image_url}`}
                  alt={item.item_name}
                  className="mt-3 max-h-60 rounded-md object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              )}
              {/* ส่งรายการของหายไปค้นหารายการของพบที่ใกล้เคียง */}
            </div>
          ))}
        </div>
      )}
      </main>
    </div>
  );
};

export default LostPage;

import React, { useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { campusLocations } from "../data/campusLocations";
import { colorOptions } from "../data/colorOptions";
import { addMatchNotification } from "../data/matchNotifications";
import LocationSuggestions from "./LocationSuggestions";

const markerIcon = L.icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [20, 31],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const selectedMarkerIcon = L.icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  iconSize: [20, 31],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = markerIcon;

const categories = [
  "กระเป๋า",
  "เครื่องประดับ",
  "อุปกรณ์อิเล็กทรอนิกส์",
  "เอกสาร",
  "อื่น ๆ",
];

const FormFoundItem = () => {
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    image: null,
    found_date: "",
    item_name: "",
    category: "",
    item_color: "",
    found_location: "",
    found_latitude: "",
    found_longitude: "",
    description: "",
    deposit_location: "",
  });
  const [status, setStatus] = useState("");
  const [foundSearchText, setFoundSearchText] = useState("สนามกีฬากลาง");
  const [depositSearchText, setDepositSearchText] = useState("");
  const [foundSuggestions, setFoundSuggestions] = useState([]);
  const [depositSuggestions, setDepositSuggestions] = useState([]);
  const [selectedFoundLocation, setSelectedFoundLocation] =
    useState("สนามกีฬากลาง");

  const getLocationSuggestions = (value) => {
    const query = value.trim().toLowerCase();
    if (!query) return [];

    if (query.includes("มหาวิทยาลัย") || query.includes("เกษตรศาสตร์")) {
      return campusLocations;
    }

    return campusLocations.filter((location) =>
      location.name.toLowerCase().includes(query),
    );
  };

  const openMarkerPopup = (location) => {
    const marker = markerRefs.current[location.name];
    if (marker && typeof marker.openPopup === "function") {
      marker.openPopup();
    }
  };

  const handleFoundLocationSelect = (location) => {
    // เมื่อเลือกหมุด ให้เก็บทั้งชื่อสถานที่และพิกัดไว้สำหรับคำนวณระยะในระบบจับคู่
    setFormData((prev) => ({ ...prev, found_location: location.name, found_latitude: location.position[0], found_longitude: location.position[1] }));
    setStatus(`เลือกสถานที่: ${location.name}`);
    setFoundSearchText(location.name);
    setFoundSuggestions([]);
    setSelectedFoundLocation(location.name);

    if (mapRef.current) {
      mapRef.current.flyTo(location.position, 17, {
        duration: 1.2,
      });
    }
    openMarkerPopup(location);
  };

  const handleDepositLocationSelect = (location) => {
    setFormData((prev) => ({ ...prev, deposit_location: location.name }));
    setDepositSearchText(location.name);
    setDepositSuggestions([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "found_location") {
      // หากพิมพ์ชื่อเอง พิกัดเดิมอาจไม่ตรงกับชื่อใหม่ จึงล้างพิกัดออก
      setFoundSearchText(value);
      setFoundSuggestions(getLocationSuggestions(value));
      setFormData((prev) => ({ ...prev, found_latitude: "", found_longitude: "" }));
    }
    if (name === "deposit_location") {
      setDepositSearchText(value);
      setDepositSuggestions(getLocationSuggestions(value));
    }
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, image: e.target.files?.[0] || null }));
  };

  const resetForm = () => {
    setFormData({
      image: null,
      found_date: "",
      item_name: "",
      category: "",
      item_color: "",
      found_location: "",
      found_latitude: "",
      found_longitude: "",
      description: "",
      deposit_location: "",
    });
    setFoundSearchText("");
    setDepositSearchText("");
    setFoundSuggestions([]);
    setDepositSuggestions([]);
    setSelectedFoundLocation("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("กำลังส่งข้อมูล...");

    // เก็บข้อมูลก่อน reset form เพื่อใช้เปรียบเทียบในกล่องแจ้งเตือน หากพบคู่ที่มากกว่า 90%
    const submittedItem = { ...formData };

    const data = new FormData();
    data.append("image", formData.image);
    data.append("found_date", formData.found_date);
    data.append("item_name", formData.item_name);
    data.append("category", formData.category);
    data.append("item_color", formData.item_color);
    data.append("found_location", formData.found_location);
    // ส่งพิกัดไปพร้อมข้อมูลรายการ (จะเป็นค่าว่างหากไม่ได้เลือกหมุด)
    data.append("found_latitude", formData.found_latitude);
    data.append("found_longitude", formData.found_longitude);
    data.append("description", formData.description);
    data.append("deposit_location", formData.deposit_location);

    try {
      const response = await fetch("http://localhost:3000/foundItem", {
        method: "POST",
        body: data,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.matches?.length) {
          addMatchNotification({ source: { ...submittedItem, item_id: result.item_id }, match: result.matches[0], type: "found" });
          setStatus(`บันทึกสำเร็จ และพบรายการที่ตรงกัน ${Math.round(result.matches[0].score)}%`);
        } else {
          setStatus(`บันทึกสำเร็จ หมายเลขรายการ ${result.item_id}`);
        }
        resetForm();
      } else {
        const error = await response.json();
        setStatus(`เกิดข้อผิดพลาด: ${error.error || response.statusText}`);
      }
    } catch (error) {
      setStatus(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };
  return (
    <div>
      <h3 className="text-2xl font-semibold mb-6">แจ้งพบสิ่งของ</h3>

      <div className="mb-6">
        <p className="mb-3 text-sm text-slate-600">
          คลิกบนแผนที่เพื่อเลือกสถานที่พบของใน ม.เกษตร กำแพงแสน
        </p>
        {/* แผนที่แสดงพื้นที่มหาวิทยาลัยเกษตรศาสตร์ กำแพงแสน */}
        <MapContainer
          // กำหนดตำแหน่งตรงกลางของแผนที่ (lat, lng) สนามกีฬากลาง
          center={[14.022788, 99.978337]}
          // ระดับการซูม: 16 = มุมมองใกล้ชิด
          zoom={16}
          // ขีดจำกัดการซูม - ขยายได้ขั้นต่ำ 15 ขั้นสูง 19
          minZoom={15}
          maxZoom={19}
          // บันทึกอ้างอิง map object เพื่อใช้ในการ animate เมื่อคลิกมาร์กเกอร์
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
          }}
          // เปิดใช้งานการเลื่อนด้วยล้อเมาส์
          scrollWheelZoom={true}
          className="w-full h-155 rounded-lg border"
        >
          {/* ชั้นแผนที่พื้นฐาน - ใช้ Esri Satellite imagery เพื่อให้เห็นรูปแบบพื้นที่ชัดเจน */}
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          {/* แสดงมาร์กเกอร์สำหรับทุกตำแหน่งในห้องเรียน */}
          {campusLocations.map((location) => (
            <Marker
              key={location.name}
              position={location.position}
              // เปลี่ยนสีมาร์กเกอร์เป็นแดงเมื่อเลือก ปกติสีน้ำเงิน
              icon={
                location.name === selectedFoundLocation
                  ? selectedMarkerIcon
                  : markerIcon
              }
              // จัดการเมื่อคลิกมาร์กเกอร์
              eventHandlers={{
                click: () => handleFoundLocationSelect(location),
              }}
              // เก็บอ้างอิง marker เพื่อเปิด popup เมื่อจำเป็น
              ref={(ref) => {
                if (ref) {
                  markerRefs.current[location.name] = ref;
                }
              }}
            >
              {/* แสดงชื่อตำแหน่งเมื่อคลิกมาร์กเกอร์ */}
              <Popup>{location.name}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div className="mb-4">
          <label htmlFor="found-image" className="block mb-2 font-medium">รูปภาพสิ่งของ</label>
          <input
            id="found-image"
            ref={fileInputRef}
            type="file"
            name="image"
            accept="image/*"
            onChange={handleFileChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="mb-4">
            <label htmlFor="found-date" className="block mb-2 font-medium">วันที่พบ</label>
            <input
              id="found-date"
              type="date"
              name="found_date"
              value={formData.found_date}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="found-item-name" className="block mb-2 font-medium">ชื่อสิ่งของ</label>
            <input
              id="found-item-name"
              type="text"
              name="item_name"
              value={formData.item_name}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="found-category" className="block mb-2 font-medium">หมวดหมู่</label>
            <select
              id="found-category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            >
              <option value="">เลือกหมวดหมู่</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="mb-4 md:col-span-2">
            <legend className="block mb-2 font-medium">สีสิ่งของ</legend>
            <div className="flex items-center gap-3 flex-wrap">
              {colorOptions.map((color) => {
                const isSelected = formData.item_color === color.name;
                const isWhite = color.value === "#ffffff";

                return (
                  <button
                    key={color.value}
                    type="button"
                    title={color.name}
                    aria-label={color.name}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        item_color: color.name,
                      }))
                    }
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "scale-110 ring-2 ring-slate-300"
                        : "border-white"
                    }`}
                    style={{ backgroundColor: color.value }}
                  >
                    {isSelected && (
                      <span
                        className={`text-xs font-bold ${
                          isWhite ? "text-slate-800" : "text-white"
                        }`}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="mb-4 relative">
            <label htmlFor="found-location" className="block mb-2 font-medium">สถานที่พบ</label>
            <input
              id="found-location"
              type="text"
              name="found_location"
              value={foundSearchText}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="เลือกสถานที่จากแผนที่ หรือพิมพ์เอง"
              autoComplete="off"
              required
            />
            <LocationSuggestions
              locations={foundSuggestions}
              onSelect={handleFoundLocationSelect}
            />
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="found-description" className="block mb-2 font-medium">รายละเอียดเพิ่มเติม</label>
          <textarea
            id="found-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 h-28"
            placeholder="เช่น สี รูปแบบ หรือลักษณะพิเศษ"
          />
        </div>

        <div className="mb-6 relative">
          <label htmlFor="found-deposit-location" className="block mb-2 font-medium">สถานที่ฝากของ</label>
          <input
            id="found-deposit-location"
            type="text"
            name="deposit_location"
            value={depositSearchText}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            placeholder="พิมพ์เพื่อเลือกสถานที่ฝากของ"
            autoComplete="off"
            required
          />
          <LocationSuggestions
            locations={depositSuggestions}
            onSelect={handleDepositLocationSelect}
          />
        </div>

        <button
          type="submit"
          className="bg-teal-600 text-white px-5 py-2 rounded hover:bg-teal-700"
        >
          บันทึกข้อมูล
        </button>
      </form>

      {status && <p className="mt-4 text-sm text-slate-700">{status}</p>}
    </div>
  );
};

export default FormFoundItem;

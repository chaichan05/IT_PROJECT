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

const FormLostItem = () => {
  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    image: null,
    lost_date: "",
    item_name: "",
    category: "",
    item_color: "",
    lost_location: "",
    lost_latitude: "",
    lost_longitude: "",
    description: "",
    deposit_location: "",
  });
  const [status, setStatus] = useState("");
  const [lostSearchText, setLostSearchText] = useState("");
  const [depositSearchText, setDepositSearchText] = useState("");
  const [lostSuggestions, setLostSuggestions] = useState([]);
  const [depositSuggestions, setDepositSuggestions] = useState([]);
  const [selectedLostLocation, setSelectedLostLocation] = useState("");

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

  const handleLostLocationSelect = (location) => {
    // เมื่อเลือกหมุด ให้เก็บทั้งชื่อสถานที่และพิกัดไว้สำหรับคำนวณระยะในระบบจับคู่
    setFormData((prev) => ({ ...prev, lost_location: location.name, lost_latitude: location.position[0], lost_longitude: location.position[1] }));
    setStatus(`เลือกสถานที่: ${location.name}`);
    setLostSearchText(location.name);
    setLostSuggestions([]);
    setSelectedLostLocation(location.name);

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
    if (name === "lost_location") {
      // หากพิมพ์ชื่อเอง พิกัดเดิมอาจไม่ตรงกับชื่อใหม่ จึงล้างพิกัดออก
      setLostSearchText(value);
      setLostSuggestions(getLocationSuggestions(value));
      setFormData((prev) => ({ ...prev, lost_latitude: "", lost_longitude: "" }));
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
      lost_date: "",
      item_name: "",
      category: "",
      item_color: "",
      lost_location: "",
      lost_latitude: "",
      lost_longitude: "",
      description: "",
      deposit_location: "",
    });
    setLostSearchText("");
    setDepositSearchText("");
    setLostSuggestions([]);
    setDepositSuggestions([]);
    setSelectedLostLocation("");

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
    data.append("lost_date", formData.lost_date);
    data.append("item_name", formData.item_name);
    data.append("category", formData.category);
    data.append("item_color", formData.item_color);
    data.append("lost_location", formData.lost_location);
    // ส่งพิกัดไปพร้อมข้อมูลรายการ (จะเป็นค่าว่างหากไม่ได้เลือกหมุด)
    data.append("lost_latitude", formData.lost_latitude);
    data.append("lost_longitude", formData.lost_longitude);
    data.append("description", formData.description);
    data.append("deposit_location", formData.deposit_location);

    try {
      const response = await fetch("http://localhost:3000/lostItem", {
        method: "POST",
        body: data,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.matches?.length) {
          addMatchNotification({ source: { ...submittedItem, item_id: result.item_id }, match: result.matches[0], type: "lost" });
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
      <h3 className="text-2xl font-semibold mb-6">แจ้งของหาย</h3>

      <div className="mb-6">
        <p className="mb-3 text-sm text-slate-600">
          คลิกบนแผนที่เพื่อเลือกสถานที่พบของใน ม.เกษตร กำแพงแสน
        </p>
        <MapContainer
          center={[14.022788, 99.978337]}
          zoom={16}
          minZoom={15}
          maxZoom={19}
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
          }}
          scrollWheelZoom={true}
          className="w-full h-[620px] rounded-lg border"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
          {campusLocations.map((location) => (
            <Marker
              key={location.name}
              position={location.position}
              icon={
                location.name === selectedLostLocation
                  ? selectedMarkerIcon
                  : markerIcon
              }
              eventHandlers={{
                click: () => handleLostLocationSelect(location),
              }}
              ref={(ref) => {
                if (ref) {
                  markerRefs.current[location.name] = ref;
                }
              }}
            >
              <Popup>{location.name}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div className="mb-4">
          <label htmlFor="lost-image" className="block mb-2 font-medium">รูปภาพสิ่งของ</label>
          <input
            id="lost-image"
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
            <label htmlFor="lost-date" className="block mb-2 font-medium">วันที่พบ</label>
            <input
              id="lost-date"
              type="date"
              name="lost_date"
              value={formData.lost_date}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="lost-item-name" className="block mb-2 font-medium">ชื่อสิ่งของ</label>
            <input
              id="lost-item-name"
              type="text"
              name="item_name"
              value={formData.item_name}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="lost-category" className="block mb-2 font-medium">หมวดหมู่</label>
            <select
              id="lost-category"
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
            <label htmlFor="lost-location" className="block mb-2 font-medium">สถานที่พบ</label>
            <input
              id="lost-location"
              type="text"
              name="lost_location"
              value={lostSearchText}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              placeholder="เลือกสถานที่จากแผนที่ หรือพิมพ์เอง"
              autoComplete="off"
              required
            />
            <LocationSuggestions
              locations={lostSuggestions}
              onSelect={handleLostLocationSelect}
            />
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="lost-description" className="block mb-2 font-medium">รายละเอียดเพิ่มเติม</label>
          <textarea
            id="lost-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2 h-28"
            placeholder="เช่น สี รูปแบบ หรือลักษณะพิเศษ"
          />
        </div>

        <div className="mb-6 relative">
          <label htmlFor="lost-deposit-location" className="block mb-2 font-medium">
            สถานที่ที่สามารถไปรับของได้
          </label>
          <input
            id="lost-deposit-location"
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

export default FormLostItem;

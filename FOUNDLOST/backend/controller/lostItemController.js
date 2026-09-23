const db = require("../db");
const { validateItem } = require("../validation");
const { findMatchesForItem } = require("./matchingController");

const coordinate = (value) => {
  // ผู้ใช้พิมพ์สถานที่เองอาจไม่มีพิกัด จึงเก็บเป็น null แทนพิกัด 0,0
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

// เพิ่มข้อมูล Lost Item ลงในฐานข้อมูล
const createLostItems = async (req, res) => {
  const validation = validateItem(req.body, "lost_date", "lost_location");
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const {
    lost_date,
    item_name,
    category,
    item_color,
    lost_location,
    description,
    deposit_location,
  } = validation.value;
  const image_url = req.file
    ? `/assets/lostUploads/${req.file.filename}`
    : null;
  const lost_latitude = coordinate(req.body.lost_latitude);
  const lost_longitude = coordinate(req.body.lost_longitude);

  try {
    const result = await db.query(
      // บันทึกพิกัดร่วมกับชื่อสถานที่ เพื่อใช้คำนวณระยะตอนจับคู่
      `INSERT INTO lost_items (image_url, lost_date, item_name, category, item_color, lost_location, lost_latitude, lost_longitude, description, deposit_location)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING item_id`,
      [
        image_url,
        lost_date,
        item_name,
        category,
        item_color,
        lost_location,
        lost_latitude,
        lost_longitude,
        description,
        deposit_location,
      ],
    );

    const itemId = result.rows[0].item_id;
    let matches = [];
    try {
      // ตรวจจับคู่ทันทีหลังบันทึก เพื่อส่งการแจ้งเตือนกลับไปยังหน้าฟอร์ม
      matches = (await findMatchesForItem("lost", itemId)).matches;
    } catch (matchingError) {
      // การจับคู่ล้มเหลวไม่ควรทำให้การแจ้งของหายที่บันทึกสำเร็จแล้วผิดพลาด
      console.error("Error matching lost item:", matchingError);
    }
    res.status(201).json({ item_id: itemId, matches });
  } catch (error) {
    console.error("Error inserting lost item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// เรียกดูข้อมูล Lost Items ทั้งหมดจากฐานข้อมูล
const getLostItems = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM lost_items ORDER BY item_id DESC `,
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching lost items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
module.exports = { createLostItems, getLostItems };

const db = require("../db");
const { validateItem } = require("../validation");
const { findMatchesForItem } = require("./matchingController");

const coordinate = (value) => {
  // ผู้ใช้พิมพ์สถานที่เองอาจไม่มีพิกัด จึงเก็บเป็น null แทนพิกัด 0,0
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const createFoundItems = async (req, res) => {
  const validation = validateItem(req.body, "found_date", "found_location");
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const {
    found_date,
    item_name,
    category,
    item_color,
    found_location,
    description,
    deposit_location,
  } = validation.value;
  const image_url = req.file ? `/assets/foundUploads/${req.file.filename}` : null;
  const found_latitude = coordinate(req.body.found_latitude);
  const found_longitude = coordinate(req.body.found_longitude);

  try {
    const result = await db.query(
      // บันทึกพิกัดร่วมกับชื่อสถานที่ เพื่อใช้คำนวณระยะตอนจับคู่
      `INSERT INTO found_items (image_url, found_date, item_name, category, item_color, found_location, found_latitude, found_longitude, description, deposit_location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING item_id`,
      [
        image_url,
        found_date,
        item_name,
        category,
        item_color,
        found_location,
        found_latitude,
        found_longitude,
        description,
        deposit_location,
      ],
    );

    const itemId = result.rows[0].item_id;
    let matches = [];
    try {
      // ตรวจจับคู่ทันทีหลังบันทึก เพื่อส่งการแจ้งเตือนกลับไปยังหน้าฟอร์ม
      matches = (await findMatchesForItem("found", itemId)).matches;
    } catch (matchingError) {
      // การจับคู่ล้มเหลวไม่ควรทำให้การแจ้งของพบที่บันทึกสำเร็จแล้วผิดพลาด
      console.error("Error matching found item:", matchingError);
    }
    res.status(201).json({ item_id: itemId, matches });
  } catch (error) {
    console.error("Error inserting found item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getFoundItems = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM found_items ORDER BY item_id DESC `
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching found items:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { createFoundItems, getFoundItems };

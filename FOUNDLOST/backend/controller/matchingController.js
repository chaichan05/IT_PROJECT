const db = require("../db");
const { aiEnabled, evaluateItemMatch } = require("../services/aiMatcher");
const MATCH_THRESHOLD = 90;

// ปรับข้อความให้เปรียบเทียบได้สม่ำเสมอ: ไม่สนตัวพิมพ์ ช่องว่าง และเครื่องหมายพิเศษ
const cleanText = (value) =>
  (value || "")
    .toString()
    .normalize("NFC")
    .toLocaleLowerCase("th-TH")
    .replace(/[\s\p{P}\p{S}_]+/gu, "");

// เปรียบเทียบด้วยคู่ตัวอักษร (Dice coefficient) จึงใช้ได้กับภาษาไทยที่มักไม่มีช่องว่างคั่นคำ
const textSimilarity = (left, right) => {
  const a = cleanText(left);
  const b = cleanText(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  if (a.length === 1 || b.length === 1) return 0;

  const pairs = (text) => {
    const result = new Map();
    for (let index = 0; index < text.length - 1; index += 1) {
      const pair = text.slice(index, index + 2);
      result.set(pair, (result.get(pair) || 0) + 1);
    }
    return result;
  };

  const aPairs = pairs(a);
  const bPairs = pairs(b);
  let common = 0;
  for (const [pair, count] of aPairs) common += Math.min(count, bPairs.get(pair) || 0);
  return (2 * common) / (a.length - 1 + b.length - 1);
};

const haversineMeters = (firstLat, firstLng, secondLat, secondLng) => {
  const values = [firstLat, firstLng, secondLat, secondLng].map(Number);
  if (values.some((value) => !Number.isFinite(value))) return null;
  const [lat1, lng1, lat2, lng2] = values;
  const radians = (value) => (value * Math.PI) / 180;
  const latDelta = radians(lat2 - lat1);
  const lngDelta = radians(lng2 - lng1);
  const area = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(lngDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(area), Math.sqrt(1 - area));
};

// แปลงระยะทางเป็นคะแนนความใกล้เคียงของสถานที่ โดยให้จุดที่อยู่ไม่เกิน 100 ม. ได้คะแนนเต็ม
const geoSimilarity = (distance) => {
  if (distance === null) return 0;
  if (distance <= 100) return 1;
  if (distance <= 500) return 0.85;
  if (distance <= 1000) return 0.65;
  if (distance <= 2000) return 0.4;
  return 0;
};

const scoreMatch = (source, candidate, sourceType) => {
  // เลือกฟิลด์สถานที่/พิกัดให้ถูกฝั่ง: ของหายจะเทียบกับของที่พบ และกลับกัน
  const sourceLocation = sourceType === "lost" ? source.lost_location : source.found_location;
  const candidateLocation = sourceType === "lost" ? candidate.found_location : candidate.lost_location;
  const sourceLat = sourceType === "lost" ? source.lost_latitude : source.found_latitude;
  const sourceLng = sourceType === "lost" ? source.lost_longitude : source.found_longitude;
  const candidateLat = sourceType === "lost" ? candidate.found_latitude : candidate.lost_latitude;
  const candidateLng = sourceType === "lost" ? candidate.found_longitude : candidate.lost_longitude;
  const name = textSimilarity(source.item_name, candidate.item_name);
  const description = textSimilarity(source.description, candidate.description);
  const locationByName = textSimilarity(sourceLocation, candidateLocation);
  const distanceMeters = haversineMeters(sourceLat, sourceLng, candidateLat, candidateLng);
  const location = Math.max(locationByName, geoSimilarity(distanceMeters));
  // คะแนนรวม: ชื่อสิ่งของ 45% + รายละเอียด 25% + สถานที่ 30%
  const score = Math.round((name * 45 + description * 25 + location * 30) * 100) / 100;
  const reasons = [];

  if (name >= 0.35) reasons.push(`ชื่อสิ่งของคล้ายกัน ${Math.round(name * 100)}%`);
  if (description >= 0.3) reasons.push(`รายละเอียดคล้ายกัน ${Math.round(description * 100)}%`);
  if (distanceMeters !== null && distanceMeters <= 2000) {
    reasons.push(`ตำแหน่งบนแผนที่ห่างประมาณ ${Math.round(distanceMeters)} เมตร`);
  } else if (locationByName >= 0.35) {
    reasons.push(`ชื่อสถานที่คล้ายกัน ${Math.round(locationByName * 100)}%`);
  }
  // ส่งคะแนนแยกแต่ละหัวข้อกลับไปด้วย เพื่อให้หน้าจอแจ้งชัดว่าตรงกันที่ข้อมูลใด
  return {
    score,
    reasons,
    distance_meters: distanceMeters === null ? null : Math.round(distanceMeters),
    field_scores: {
      item_name: Math.round(name * 100),
      description: Math.round(description * 100),
      location: Math.round(location * 100),
    },
  };
};

// ใช้ร่วมกันทั้ง endpoint ค้นหาด้วยตนเอง และการตรวจอัตโนมัติหลังบันทึกรายการใหม่
const scoreCandidate = async (source, candidate, sourceType) => {
  const baseline = scoreMatch(source, candidate, sourceType);
  if (!aiEnabled()) return baseline;

  try {
    const aiResult = await evaluateItemMatch(source, candidate, sourceType);
    if (!aiResult) return baseline;
    return {
      ...baseline,
      score: Math.round((baseline.score * 0.35 + aiResult.score * 0.65) * 100) / 100,
      ai_score: aiResult.score,
      text_score: aiResult.text_score,
      visual_score: aiResult.visual_score,
      used_images: aiResult.used_images,
      reasons: [...baseline.reasons, ...aiResult.reasons],
    };
  } catch (error) {
    console.error("AI matching fallback:", error.message);
    return baseline;
  }
};

const findMatchesForItem = async (sourceType, itemId) => {
  // ชนิด lost จะค้นหาในตาราง found_items; ชนิด found จะค้นหาในตาราง lost_items
  const sourceTable = sourceType === "lost" ? "lost_items" : "found_items";
  const candidateTable = sourceType === "lost" ? "found_items" : "lost_items";

  const [sourceResult, candidatesResult] = await Promise.all([
    db.query(`SELECT * FROM ${sourceTable} WHERE item_id = $1`, [itemId]),
    db.query(`SELECT * FROM ${candidateTable} ORDER BY item_id DESC`),
  ]);
  if (sourceResult.rowCount === 0) return null;
  const source = sourceResult.rows[0];
  // แจ้งเตือนเฉพาะคู่ที่มีคะแนนตั้งแต่ 90% และคืนลำดับคะแนนสูงสุดไม่เกิน 5 รายการ
  const matches = (await Promise.all(
    candidatesResult.rows.map(async (candidate) => ({ ...candidate, ...(await scoreCandidate(source, candidate, sourceType)) })),
  ))
    .filter((candidate) => candidate.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  return { source, matches };
};

const getMatches = async (req, res) => {
  const sourceType = req.params.type;
  const itemId = Number(req.params.itemId);
  if (!Number.isSafeInteger(itemId) || !["lost", "found"].includes(sourceType)) {
    return res.status(400).json({ error: "Invalid match request" });
  }

  try {
    const result = await findMatchesForItem(sourceType, itemId);
    if (!result) return res.status(404).json({ error: "Item not found" });
    return res.status(200).json({ source_item_id: itemId, matches: result.matches });
  } catch (error) {
    console.error("Error matching items:", error);
    return res.status(500).json({ error: "Unable to match items" });
  }
};

const getAllMatches = async (req, res) => {
  try {
    const [lostResult, foundResult] = await Promise.all([
      db.query("SELECT * FROM lost_items ORDER BY item_id DESC"),
      db.query("SELECT * FROM found_items ORDER BY item_id DESC"),
    ]);

    const matches = [];
    for (const source of lostResult.rows) {
      for (const candidate of foundResult.rows) {
        const analysis = await scoreCandidate(source, candidate, "lost");
        if (analysis.score >= MATCH_THRESHOLD) {
          matches.push({ source, match: { ...candidate, ...analysis }, type: "lost" });
        }
      }
    }

    matches.sort((first, second) => second.match.score - first.match.score);
    return res.status(200).json({ matches: matches.slice(0, 100) });
  } catch (error) {
    console.error("Error scanning saved items for matches:", error);
    return res.status(500).json({ error: "Unable to scan saved items" });
  }
};

module.exports = { MATCH_THRESHOLD, findMatchesForItem, getMatches, getAllMatches };

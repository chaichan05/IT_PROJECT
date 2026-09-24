const fs = require("node:fs/promises");
const path = require("node:path");

const API_URL = "https://api.openai.com/v1/responses";
const MODEL = process.env.OPENAI_MATCH_MODEL || "gpt-4.1-mini";
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 500;
const assetsRoot = path.resolve(__dirname, "..", "assets");
const resultCache = new Map();

const MIME_TYPES = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const responseText = (response) => {
  if (typeof response.output_text === "string") return response.output_text;
  return (response.output || []).flatMap((item) => item.content || []).map((content) => content.text || "").join("");
};

const parseJson = (value) => {
  let cleaned = value.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7).trimStart();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3).trimStart();
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3).trimEnd();
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI matching response did not contain JSON");
  return JSON.parse(cleaned.slice(start, end + 1));
};

const itemSummary = (item, type) => ({
  name: item.item_name,
  category: item.category,
  color: item.item_color,
  description: item.description,
  location: type === "lost" ? item.lost_location : item.found_location,
  date: type === "lost" ? item.lost_date : item.found_date,
});

const aiEnabled = () => Boolean(process.env.OPENAI_API_KEY);

const toImageDataUrl = async (imageUrl) => {
  if (typeof imageUrl !== "string" || !imageUrl.startsWith("/assets/")) return null;

  let relativePath;
  try {
    relativePath = decodeURIComponent(imageUrl.split("?")[0]).replace(/^\/+/, "");
  } catch {
    return null;
  }

  const absolutePath = path.resolve(__dirname, "..", relativePath);
  if (!absolutePath.startsWith(`${assetsRoot}${path.sep}`)) return null;

  const mimeType = MIME_TYPES[path.extname(absolutePath).toLowerCase()];
  if (!mimeType) return null;

  try {
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile() || stat.size > MAX_IMAGE_BYTES) return null;
    const image = await fs.readFile(absolutePath);
    return `data:${mimeType};base64,${image.toString("base64")}`;
  } catch {
    return null;
  }
};

const numberInRange = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : null;
};

const cacheKeyFor = (source, candidate, sourceType) =>
  JSON.stringify({
    sourceType,
    source: { ...itemSummary(source, sourceType), id: source.item_id, image: source.image_url },
    candidate: {
      ...itemSummary(candidate, sourceType === "lost" ? "found" : "lost"),
      id: candidate.item_id,
      image: candidate.image_url,
    },
  });

const remember = (key, value) => {
  if (resultCache.size >= MAX_CACHE_ENTRIES) {
    resultCache.delete(resultCache.keys().next().value);
  }
  resultCache.set(key, value);
};

const evaluateItemMatch = async (source, candidate, sourceType) => {
  if (!aiEnabled()) return null;

  const cacheKey = cacheKeyFor(source, candidate, sourceType);
  if (resultCache.has(cacheKey)) return resultCache.get(cacheKey);

  const candidateType = sourceType === "lost" ? "found" : "lost";
  const [sourceImage, candidateImage] = await Promise.all([
    toImageDataUrl(source.image_url),
    toImageDataUrl(candidate.image_url),
  ]);
  const usedImages = Boolean(sourceImage && candidateImage);

  const prompt = `You match lost-property reports with found-property reports.
Compare REPORT A (${sourceType}) with REPORT B (${candidateType}).

REPORT A:
${JSON.stringify(itemSummary(source, sourceType))}

REPORT B:
${JSON.stringify(itemSummary(candidate, candidateType))}

Evaluate whether both reports refer to the same physical object. Use text facts and, when both images are supplied, compare visible object type, shape, color, material, markings, damage, stickers, accessories, and other distinctive features. Allow for different angle, crop, lighting, background, and image quality. Do not treat a similar background as evidence that the object is the same. Conflicting category or distinctive features must reduce the score strongly.

Return only JSON in this exact shape:
{"score":0,"text_score":0,"visual_score":null,"reasons":["short reason"]}

All scores are integers from 0 to 100. score is the overall probability that it is the same object. visual_score must be null unless both images are present. Give 1-4 concise reasons.`;

  const content = [{ type: "input_text", text: prompt }];
  if (sourceImage) {
    content.push(
      { type: "input_text", text: "IMAGE A - photo attached to REPORT A" },
      { type: "input_image", image_url: sourceImage, detail: "high" }
    );
  }
  if (candidateImage) {
    content.push(
      { type: "input_text", text: "IMAGE B - photo attached to REPORT B" },
      { type: "input_image", image_url: candidateImage, detail: "high" }
    );
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: [{ role: "user", content }],
      max_output_tokens: 240,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI matching failed (${response.status}): ${message.slice(0, 300)}`);
  }

  const parsed = parseJson(responseText(await response.json()));
  const score = numberInRange(parsed.score);
  if (score === null) throw new Error("AI matching response did not contain a valid score");

  const result = {
    score,
    text_score: numberInRange(parsed.text_score),
    visual_score: usedImages ? numberInRange(parsed.visual_score) : null,
    used_images: usedImages,
    reasons: Array.isArray(parsed.reasons)
      ? parsed.reasons.filter((reason) => typeof reason === "string").slice(0, 4)
      : [],
  };

  remember(cacheKey, result);
  return result;
};

module.exports = {
  aiEnabled,
  evaluateItemMatch,
  numberInRange,
  parseJson,
  responseText,
};

// backend/controllers/galleryController.js
const fs = require("fs");
const path = require("path");
const GalleryImage = require("../models/GalleryImage");

function formatMongooseError(err) {
  if (err && err.name === "ValidationError" && err.errors) {
    return Object.values(err.errors).map((e) => e.message || String(e));
  }
  return null;
}

// Create single
exports.create = async (req, res) => {
  try {
    const { title = "", titleAr = "", alt = "", isActive } = req.body;
    const imagePath = req.file
      ? `/uploads/gallery/${req.file.filename}`
      : req.body.image;

    const errors = [];
    if (!imagePath) errors.push("Image is required");
    if (errors.length)
      return res.status(400).json({ message: "Validation failed", errors });

    const doc = await GalleryImage.create({
      title: String(title || ""),
      titleAr: String(titleAr || ""),
      image: imagePath,
      alt: String(alt || ""),
      isActive: typeof isActive === "boolean" ? isActive : true,
    });

    return res.status(201).json({ message: "Created", item: doc });
  } catch (err) {
    const formatted = formatMongooseError(err);
    if (formatted)
      return res
        .status(400)
        .json({ message: "Validation failed", errors: formatted });
    console.error("Gallery.create error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// (bulkCreate removed)

// List
exports.getAll = async (req, res) => {
  try {
    const { q } = req.query;
    const includeInactive =
      String(req.query.includeInactive || "false").toLowerCase() === "true";
    const filter = {};
    if (!includeInactive) filter.isActive = { $ne: false };
    if (q) filter.title = { $regex: String(q), $options: "i" };

    const items = await GalleryImage.find(filter).sort({ createdAt: -1 });
    return res.json(items);
  } catch (err) {
    console.error("Gallery.getAll error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Get by id
exports.getById = async (req, res) => {
  try {
    const item = await GalleryImage.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Not found" });
    return res.json(item);
  } catch (err) {
    console.error("Gallery.getById error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Update
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await GalleryImage.findById(id);
    if (!existing) return res.status(404).json({ message: "Not found" });

    const allowed = ["title", "titleAr", "alt", "isActive", "image"];
    const updates = {};
    for (const k of allowed) if (k in req.body) updates[k] = req.body[k];

    // normalize primitives
    if ("isActive" in updates)
      updates.isActive =
        String(updates.isActive) === "false"
          ? false
          : Boolean(updates.isActive);

    // replace image
    if (req.file) {
      try {
        const oldImage = existing.image;
        if (oldImage && /^\/uploads\/gallery\//.test(oldImage)) {
          const rel = oldImage.replace(/^\//, "");
          const abs = path.join(__dirname, "..", rel);
          if (fs.existsSync(abs)) fs.unlinkSync(abs);
        }
      } catch (_) {}
      updates.image = `/uploads/gallery/${req.file.filename}`;
    } else if ("image" in updates && !updates.image) {
      delete updates.image;
    }

    const updated = await GalleryImage.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    return res.json({ message: "Updated", item: updated });
  } catch (err) {
    const formatted = formatMongooseError(err);
    if (formatted)
      return res
        .status(400)
        .json({ message: "Validation failed", errors: formatted });
    console.error("Gallery.update error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Delete
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await GalleryImage.findById(id);
    if (!existing) return res.status(404).json({ message: "Not found" });

    try {
      const oldImage = existing.image;
      if (oldImage && /^\/uploads\/gallery\//.test(oldImage)) {
        const rel = oldImage.replace(/^\//, "");
        const abs = path.join(__dirname, "..", rel);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      }
    } catch (_) {}

    await GalleryImage.findByIdAndDelete(id);
    return res.json({ message: "Deleted" });
  } catch (err) {
    console.error("Gallery.remove error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

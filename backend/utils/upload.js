const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads/clients directory exists
const uploadsRoot = path.join(__dirname, "..", "uploads");
const clientsDir = path.join(uploadsRoot, "clients");
const awardsCertDir = path.join(uploadsRoot, "awards-certificates");
const projectsDir = path.join(uploadsRoot, "projects");
const directorsDir = path.join(uploadsRoot, "directors");
const galleryDir = path.join(uploadsRoot, "gallery");
try {
  if (!fs.existsSync(uploadsRoot))
    fs.mkdirSync(uploadsRoot, { recursive: true });
  if (!fs.existsSync(clientsDir)) fs.mkdirSync(clientsDir, { recursive: true });
  if (!fs.existsSync(awardsCertDir))
    fs.mkdirSync(awardsCertDir, { recursive: true });
  if (!fs.existsSync(projectsDir))
    fs.mkdirSync(projectsDir, { recursive: true });
  if (!fs.existsSync(directorsDir))
    fs.mkdirSync(directorsDir, { recursive: true });
  if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });
} catch (e) {
  // If another process created it between the checks, ignore
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    try {
      // Choose subdir based on a hint set by route handler
      let subdir = clientsDir;
      if (req.uploadSubdir === "awards-certificates") subdir = awardsCertDir;
      else if (req.uploadSubdir === "projects") subdir = projectsDir;
      else if (req.uploadSubdir === "directors") subdir = directorsDir;
      else if (req.uploadSubdir === "gallery") subdir = galleryDir;
      if (!fs.existsSync(subdir)) fs.mkdirSync(subdir, { recursive: true });
      cb(null, subdir);
    } catch (e) {
      // ignore if already exists
      let fallback = clientsDir;
      if (req.uploadSubdir === "awards-certificates") fallback = awardsCertDir;
      else if (req.uploadSubdir === "projects") fallback = projectsDir;
      else if (req.uploadSubdir === "directors") fallback = directorsDir;
      else if (req.uploadSubdir === "gallery") fallback = galleryDir;
      cb(null, fallback);
    }
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, "-")
      .toLowerCase();
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${unique}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const allowed = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Only image files are allowed"));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}); // 5MB

// Expect field name 'logo'
const uploadClientLogo = upload.single("logo");
// Expect field name 'image' for awards
const uploadAwardImage = function (req, res, next) {
  // hint storage to use awards folder
  req.uploadSubdir = "awards-certificates";
  return upload.single("image")(req, res, next);
};

// Expect field name 'image' for projects
const uploadProjectImage = function (req, res, next) {
  req.uploadSubdir = "projects";
  return upload.single("image")(req, res, next);
};

// Expect field name 'image' for directors
const uploadDirectorImage = function (req, res, next) {
  req.uploadSubdir = "directors";
  return upload.single("image")(req, res, next);
};

// Single gallery image: expect field name 'image'
const uploadSingleGalleryImage = function (req, res, next) {
  req.uploadSubdir = "gallery";
  return upload.single("image")(req, res, next);
};

// Bulk images for BulkImages resource: accept 'images' and 'images[]'
const uploadBulkImages = function (req, res, next) {
  req.uploadSubdir = "gallery";
  return upload.fields([
    { name: "images", maxCount: 50 },
    { name: "images[]", maxCount: 50 },
  ])(req, res, next);
};

module.exports = {
  uploadClientLogo,
  uploadAwardImage,
  uploadProjectImage,
  uploadDirectorImage,
  uploadSingleGalleryImage,
  uploadBulkImages,
};

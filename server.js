require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const mongoose = require("mongoose");
const FormData = require("form-data");

const Verification = require("./models/verificationModel");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (optional)
app.use(express.static(path.join(__dirname, "public")));

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  mimetype && extname ? cb(null, true) : cb(new Error("Invalid file type"));
};

const upload = multer({ storage, fileFilter });

// Upload and verify file
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }

  try {
    const filePath = req.file.path;
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    const apiURL = `${process.env.BASE_URL}/callback/verification`;

    const response = await axios.post(apiURL, formData, {
      headers: formData.getHeaders()
    });

    if (response.data.success === "true") {
      const verification = new Verification({
        transactionGuid: response.data.data.transactionGuid,
        shortGuid: response.data.data.shortGuid,
        verified: response.data.data.verified === "TRUE",
        person: response.data.data.person
      });

      await verification.save();

      return res.json({
        success: true,
        message: "File uploaded and verified",
        verificationData: response.data.data
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Verification failed",
        data: response.data
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Verification error",
      error: error.message
    });
  }
});

// Admin: get all verification records
app.get("/admin/results", async (req, res) => {
  try {
    const verifications = await Verification.find();
    res.status(200).json({ success: true, verifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: approve by transactionGuid
app.post("/admin/approve/:transactionGuid", async (req, res) => {
  try {
    const verification = await Verification.findOne({ transactionGuid: req.params.transactionGuid });
    if (!verification) {
      return res.status(404).json({ success: false, message: "Verification not found" });
    }

    verification.approved = true;
    await verification.save();

    res.status(200).json({ success: true, message: "Verification approved" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin: reject by transactionGuid
app.post("/admin/reject/:transactionGuid", async (req, res) => {
  try {
    const verification = await Verification.findOne({ transactionGuid: req.params.transactionGuid });
    if (!verification) {
      return res.status(404).json({ success: false, message: "Verification not found" });
    }

    verification.approved = false;
    await verification.save();

    res.status(200).json({ success: true, message: "Verification rejected" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// External callback route (if your API calls this)
app.post("/callback/verification", async (req, res) => {
  const { transactionGuid, shortGuid, verified, person } = req.body;

  if (!transactionGuid || !shortGuid || !person) {
    return res.status(400).json({ success: false, message: "Incomplete verification data" });
  }

  try {
    const verification = new Verification({
      transactionGuid,
      shortGuid,
      verified: verified === "TRUE",
      person
    });

    await verification.save();

    return res.status(200).json({ success: true, message: "Verification saved" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Database error" });
  }
});

// Error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
});

// Optional frontend fallback - only enable if React is built into client/build
// const clientBuildPath = path.join(__dirname, 'client', 'build');
// if (fs.existsSync(clientBuildPath)) {
//   app.use(express.static(clientBuildPath));
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(clientBuildPath, 'index.html'));
//   });
// }

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

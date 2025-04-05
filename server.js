require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const mongoose = require("mongoose");

const app = express(); // Add this line to initialize the app

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve the index.html file when visiting the root URL
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 5000;  // This allows for dynamic port usage
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// CORS Middleware
app.use(cors());

// MongoDB connection
const mongoURI = process.env.MONGODB_URI;
mongoose.connect(mongoURI)
    .then(() => console.log("✅ MongoDB connected successfully"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

// File type filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    mimetype && extname ? cb(null, true) : cb(new Error("Invalid file type. Only jpeg, jpg, png, or pdf allowed."));
};

// Create upload instance
const upload = multer({ storage, fileFilter });

// API endpoint for file upload
app.post("/upload", upload.single("file"), async (req, res) => {
    console.log("📥 File received:", req.file);

    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    try {
        const filePath = req.file.path;
        const formData = new FormData();
        formData.append("file", fs.createReadStream(filePath));

        const apiURL = `${process.env.BASE_URL}/callback/verification`;
        console.log("🔗 API URL being used for verification:", apiURL);

        const response = await axios.post(apiURL, formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });

        console.log("✅ Verification API Response:", response.data);

        if (response.data.success === "true") {
            // Define the Verification model here
            const Verification = mongoose.model("Verification", new mongoose.Schema({
                transactionGuid: String,
                shortGuid: String,
                verified: Boolean,
                person: Object
            }));

            const verification = new Verification({
                transactionGuid: response.data.data.transactionGuid,
                shortGuid: response.data.data.shortGuid,
                verified: response.data.data.verified === "TRUE",
                person: response.data.data.person
            });

            await verification.save();

            return res.json({
                success: true,
                message: "File uploaded and verified successfully",
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
        console.error("❌ Verification error:");
        if (error.response) {
            console.error("👉 Server responded with:", error.response.status, error.response.data);
        } else if (error.request) {
            console.error("👉 No response received from server:", error.request);
        } else {
            console.error("👉 Axios error:", error.message);
        }
        return res.status(500).json({
            success: false,
            message: "Error during verification",
            error: error.message
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
});

// Verification callback route
app.post("/callback/verification", async (req, res) => {
    console.log("🔄 Received callback verification request:", req.body);
    const { transactionGuid, shortGuid, verified, person } = req.body;

    if (!transactionGuid || !shortGuid || !person) {
        return res.status(400).json({ success: false, message: "Incomplete verification data" });
    }

    // Define the Verification model here as well
    const Verification = mongoose.model('Verification', new mongoose.Schema({
        transactionGuid: String,
        shortGuid: String,
        verified: Boolean,
        person: Object
    }));

    const verification = new Verification({
        transactionGuid,
        shortGuid,
        verified: verified === "TRUE",
        person
    });

    try {
        await verification.save();
        return res.status(200).json({ success: true, message: "Verification saved successfully" });
    } catch (err) {
        console.error("❌ Error saving verification:", err);
        return res.status(500).json({ success: false, message: "Error saving verification" });
    }
});

// Express can parse JSON/Form Body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

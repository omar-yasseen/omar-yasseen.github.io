// Import the necessary packages
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const multer = require('multer'); // <-- ADD THIS LINE
const path = require('path');   // <-- ADD THIS LINE

// --- MULTER CONFIGURATION FOR FILE UPLOADS ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // This saves the files in the 'public/images' directory
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        // Use the original filename
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });
// --- END OF MULTER CONFIGURATION ---




// Create an Express application
const app = express();
const PORT = 3001; // Using a different port than the typical 3000 to avoid conflicts

// --- Middleware ---
// Enable CORS for all routes, so your front-end can make requests to this API
app.use(cors());

// Middleware to parse JSON bodies
app.use(express.json());

//Serve static files (like images) from the 'public' directory
app.use(express.static('public'));

// --- Database Connection ---
// Connect to the SQLite database file
const db = new sqlite3.Database(
    "../database/straps.db",
    (err) => {
        if (err) {
            console.error(err.message);
        }
        console.log("Connected to the straps database.");
    }
);

// --- API Endpoints ---
// Create a GET endpoint to fetch ALL straps
app.get("/api/straps", (req, res) => {
    // This SQL query joins the Straps and Brands tables to get all necessary info
    const sql = `
        SELECT 
            s.id, 
            s.material, 
            s.color, 
            s.image_url, 
            b.name AS brandName 
        FROM Straps s
        JOIN Brands b ON s.brand_id = b.id
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            // If there's an error, send a 500 status code
            res.status(500).json({ "error": err.message });
            return;
        }
        // If successful, send the data back in the format the front-end expects
        res.json({
            "message": "success",
            "data": rows
        });
    });
});





// GET endpoint to fetch all strap data for a specific brand
app.get('/api/brands/:brandName/gallery', (req, res) => {
    const { brandName } = req.params;
    const sql = `
        SELECT s.material, s.color, s.price, s.image_url 
        FROM Straps s
        JOIN Brands b ON s.brand_id = b.id
        WHERE b.name = ?
    `;

    db.all(sql, [brandName], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        // Group the flat list of straps by material
        const galleryData = {};
        rows.forEach(strap => {
            if (!galleryData[strap.material]) {
                galleryData[strap.material] = [];
            }
            galleryData[strap.material].push(strap);
        });
        res.json({ "message": "success", "data": galleryData });
    });
});
// POST endpoint to create a new strap
app.post("/api/straps", (req, res) => {
    // Get the data from the request body
    const { name, description, material, price, color, image_url, brand_id } = req.body;

    // Basic validation: ensure required fields are present
    if (!name || !brand_id) {
        return res
            .status(400)
            .json({ error: "Missing required fields: name and brand_id" });
    }

    const sql = `INSERT INTO Straps (material, price,  color, image_url, brand_id) VALUES (?, ?, ?, ?, ?)`;
    const params = [material, price,  color, image_url, brand_id];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        // Send back the newly created strap's ID
        res.json({
            message: "success",
            data: { id: this.lastID, ...req.body },
        });
    });
});
// DELETE endpoint to remove a strap by ID
app.delete("/api/straps/:id", (req, res) => {
    const { id } = req.params; // Get the ID from the URL parameter
    const sql = "DELETE FROM Straps WHERE id = ?";

    db.run(sql, id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        // Check if any row was actually deleted
        if (this.changes === 0) {
            res.status(404).json({ message: `No strap found with id ${id}` });
        } else {
            res.json({ message: `Successfully deleted strap with id ${id}` });
        }
    });
});

// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

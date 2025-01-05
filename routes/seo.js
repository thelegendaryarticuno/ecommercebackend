// routes/seoRoutes.js
const express = require("express");
const router = express.Router();
const SEO = require("../models/seo");

// POST /fetchSEOComponents
router.post("/fetchSEOComponents", async (req, res) => {
  try {
    const { pageName } = req.body;
    if (!pageName) return res.status(400).json({ error: "Page name is required" });

    const formattedPageName = pageName.toLowerCase().replace(/\s+/g, "");
    const seoData = await SEO.findOne({ pageName: formattedPageName });

    if (!seoData) {
      return res.status(404).json({ error: "SEO data not found" });
    }

    res.json(seoData);
  } catch (error) {
    console.error("Error fetching SEO components:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /getSEOComponents
router.get("/getSEOComponents", async (req, res) => {
  try {
    const seoData = await SEO.find({});
    res.json(seoData);
  } catch (error) {
    console.error("Error fetching all SEO components:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /saveSEOComponents
router.post("/saveSEOComponents", async (req, res) => {
  try {
    const { pageName, ...seoDetails } = req.body;

    if (!pageName) return res.status(400).json({ error: "Page name is required" });

    const formattedPageName = pageName.toLowerCase().replace(/\s+/g, "");
    const existingSEO = await SEO.findOne({ pageName: formattedPageName });

    if (existingSEO) {
      return res.status(400).json({ error: "SEO data already exists for this page" });
    }

    const newSEO = new SEO({ pageName: formattedPageName, ...seoDetails });
    await newSEO.save();

    res.status(201).json(newSEO);
  } catch (error) {
    console.error("Error saving SEO components:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /editSEOComponents
router.put("/editSEOComponents", async (req, res) => {
  try {
    const { pageName, ...seoDetails } = req.body;

    if (!pageName) return res.status(400).json({ error: "Page name is required" });

    const formattedPageName = pageName.toLowerCase().replace(/\s+/g, "");
    const updatedSEO = await SEO.findOneAndUpdate(
      { pageName: formattedPageName },
      { $set: seoDetails },
      { new: true }
    );

    if (!updatedSEO) {
      return res.status(404).json({ error: "SEO data not found for this page" });
    }

    res.json(updatedSEO);
  } catch (error) {
    console.error("Error editing SEO components:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /deleteSEOComponents
router.delete("/deleteSEOComponents", async (req, res) => {
  try {
    const { pageName } = req.body;

    if (!pageName) return res.status(400).json({ error: "Page name is required" });

    const formattedPageName = pageName.toLowerCase().replace(/\s+/g, "");
    const deletedSEO = await SEO.findOneAndDelete({ pageName: formattedPageName });

    if (!deletedSEO) {
      return res.status(404).json({ error: "SEO data not found for this page" });
    }

    res.json({ message: "SEO data deleted successfully" });
  } catch (error) {
    console.error("Error deleting SEO components:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

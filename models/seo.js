const mongoose = require("mongoose");

const SEOSchema = new mongoose.Schema({
  pageName: { type: String, required: true, unique: true, trim: true },
  title: { type: String, default: "" },
  description: { type: String, default: "" },
  keywords: { type: String, default: "" },
  author: { type: String, default: "" },
  robots: { type: String, default: "" },
  canonical: { type: String, default: "" },
  ogTitle: { type: String, default: "" },
  ogDescription: { type: String, default: "" },
  ogImage: { type: String, default: "" },
  ogUrl: { type: String, default: "" },
  twitterTitle: { type: String, default: "" },
  twitterDescription: { type: String, default: "" },
  twitterImage: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("SEO", SEOSchema);
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const connectDB = require("../mongo-connection");
const Yardim = require("../models/yardimModel");
const cache = require("../cache");


router.get("/", function (req, res) {
  res.send("depremio backend");
});

router.get("/yardim", async function (req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    let data ;

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const results = {};

    const cacheKey = `yardim_${page}_${limit}`;
  
    if (cache.getCache().has(cacheKey)) {
      data = cache.getCache().get(cacheKey);
      res.send(data);
    }

    if (endIndex < (await Yardim.countDocuments().exec())) {
      results.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      results.previous = {
        page: page - 1,
        limit
      };
    }

    results.data = await Yardim.find().limit(limit).skip(startIndex).exec();

    cache.getCache().set(cacheKey, results);

    if(!data){res.json(results);}
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "Could not retrieve the Yardim documents." });
  }
});

router.post('/yardim', async function (req, res) {
  try {

  const { yardimTipi, adSoyad, adres, acilDurum } = req.body;  

  // Validate required fields
  if (!yardimTipi || !adSoyad || !adres || !acilDurum) {
    return res.status(400).json({ error: "yardimTipi, adSoyad, adres and acilDurum alanları gerekli" });
  }

  // check exist
  const existingYardim = await Yardim.findOne({ adSoyad, adres });
  if (existingYardim) {
    return res.status(409).json({ error: "Bu yardım bildirimi daha önce veritabanımıza eklendi." });
  }

    // Create a new Yardim document
    const newYardim = new Yardim({
      yardimTipi,
      adSoyad,
      telefon: req.body.telefon || "",  // optional fields
      adres,
      adresTarifi: req.body.adresTarifi || "",
      acilDurum,
      fizikiDurum: req.body.fizikiDurum || "",
      tweetLink: req.body.tweetLink || ""
    });

    cache.getCache().flushAll();
    const savedYardim = await newYardim.save();

    res.send(savedYardim);

  } catch (error) {
    res.status(500).json({ error: "Hata! Yardım dökümanı kaydedilemedi!" });
  }

});

async function checkConnection() {
  if (mongoose.connection.readyState != 1) {
    await connectDB();
  }
}

module.exports = router;
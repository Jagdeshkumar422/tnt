const Banner = require("../models/Banner");

// Get all 4 banners
exports.getBanners = async (req, res) => {
  try {
    let banners = await Banner.find().sort({ order: 1 });

    // If no banners exist, seed with default ones
    if (banners.length === 0) {
      const defaultBanners = [
        {
          order: 1,
          imageUrl:
            "https://res.cloudinary.com/di0qbhv97/image/upload/v1747808846/80c9a562a3caca740432ac4666611df6_bqn4rb.png",
        },
        {
          order: 2,
          imageUrl:
            "https://res.cloudinary.com/di0qbhv97/image/upload/v1747808846/24a20e2e2a9c4681f27f4fb81f2cb5a0_mqdads.png",
        },
        {
          order: 3,
          imageUrl:
            "https://res.cloudinary.com/di0qbhv97/image/upload/v1747808846/32a89d8d29fd478d9f04c7c8dbf1c8a6_juhida.png",
        },
        {
          order: 4,
          imageUrl:
            "https://res.cloudinary.com/di0qbhv97/image/upload/v1746530122/nfts/vye5f4giajcpy3lebm9c.png",
        },
      ];

      await Banner.insertMany(defaultBanners);
      banners = await Banner.find().sort({ order: 1 }); // Re-fetch after insert
    }

    res.json(banners);
  } catch (err) {
    console.error("Error fetching banners:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// Seed default 4 banners (can be triggered manually)
exports.seedBanners = async (req, res) => {
  try {
    const count = await Banner.countDocuments();
    if (count >= 4)
      return res.status(400).json({ message: "Banners already seeded" });

    const defaultBanners = [
      {
        order: 1,
        imageUrl:
          "https://res.cloudinary.com/di0qbhv97/image/upload/v1747808846/80c9a562a3caca740432ac4666611df6_bqn4rb.png",
      },
      {
        order: 2,
        imageUrl:
          "https://res.cloudinary.com/di0qbhv97/image/upload/v1747808846/24a20e2e2a9c4681f27f4fb81f2cb5a0_mqdads.png",
      },
      {
        order: 3,
        imageUrl:
          "https://res.cloudinary.com/di0qbhv97/image/upload/v1747808846/32a89d8d29fd478d9f04c7c8dbf1c8a6_juhida.png",
      },
      {
        order: 4,
        imageUrl:
          "https://res.cloudinary.com/di0qbhv97/image/upload/v1746530122/nfts/vye5f4giajcpy3lebm9c.png",
      },
    ];

    await Banner.insertMany(defaultBanners);
    res.status(201).json({ message: "Default banners created" });
  } catch (err) {
    console.error("Error seeding banners:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update banner image by order
exports.updateBanner = async (req, res) => {
  try {
    const { order } = req.params;
    const bannerOrder = parseInt(order);

    if (![1, 2, 3, 4].includes(bannerOrder)) {
      return res
        .status(400)
        .json({ message: "Invalid order (must be 1-4)" });
    }

    const image = req.file?.path;
    if (!image) {
      return res.status(400).json({ message: "Image is required" });
    }

    const updatedBanner = await Banner.findOneAndUpdate(
      { order: bannerOrder },
      { imageUrl: image },
      { new: true }
    );

    if (!updatedBanner) {
      return res.status(404).json({ message: "Banner not found" });
    }

    res.status(200).json({
      message: "Banner updated successfully",
      banner: updatedBanner,
    });
  } catch (err) {
    console.error("Error updating banner:", err);
    res.status(500).json({ message: "Server error" });
  }
};

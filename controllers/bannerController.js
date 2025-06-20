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
            "https://res.cloudinary.com/di0qbhv97/image/upload/v1750413425/Untitled_design_20250620_111913_0000_ytsuzg.jpg",
        },
        {
          order: 2,
          imageUrl:
            "https://res.cloudinary.com/di0qbhv97/image/upload/v1750413425/20250620_110915_0000_hhcf4o.jpg",
        },
        {
          order: 3,
          imageUrl:
            "https://res.cloudinary.com/di0qbhv97/image/upload/v1750413427/Untitled_design_20250620_105926_0000_mmqrfa.jpg",
        },
        {
          order: 4,
          imageUrl:
            "https://res.cloudinary.com/di0qbhv97/image/upload/v1750413433/Untitled_design_20250620_114500_0000_xvvr9v.jpg",
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
    if (count >= 5)
      return res.status(400).json({ message: "Banners already seeded" });

    const defaultBanners = [
      {
          order: 1,
          imageUrl:
            "https://res.cloudinary.com/di0qbhv97/image/upload/v1750413425/Untitled_design_20250620_111913_0000_ytsuzg.jpg",
        },
        {
          order: 2,
          imageUrl:
            "https://res.cloudinary.com/di0qbhv97/image/upload/v1750413425/20250620_110915_0000_hhcf4o.jpg",
        },
        {
          order: 3,
          imageUrl:
            "https://res.cloudinary.com/di0qbhv97/image/upload/v1750413427/Untitled_design_20250620_105926_0000_mmqrfa.jpg",
        },
        {
          order: 4,
          imageUrl:
            "https://res.cloudinary.com/di0qbhv97/image/upload/v1750413433/Untitled_design_20250620_114500_0000_xvvr9v.jpg",
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

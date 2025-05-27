const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: "di0qbhv97",
  api_key: "982758443916262",
  api_secret: "stS6wnvNOb-TThdwg5oTTaTSp9U",
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "nfts", // Cloudinary folder name
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
  },
});


module.exports = {
  cloudinary,
  storage,
};

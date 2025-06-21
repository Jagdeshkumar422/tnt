const mongoose = require('mongoose');
const axios = require('axios');
const Nft = require('./models/Nft'); // Adjust path if needed

const MONGODB_URI = 'mongodb+srv://treasusrexnft:admin@cluster0.j1yqv8y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // Replace with your DB

const TOTAL_NFTS = 1500; // Set between 1000 to 3000
const START_PRICE = 48;
const NFTS_PER_PRICE = 3;

const generateRandomString = (length = 10) =>
  Math.random().toString(36).substring(2, 2 + length);

const generateDummyNFT = (price, index) => ({
  name: `NFT_${price}_${index}_${generateRandomString(3)}`,
  hash: generateRandomString(64),
  price,
  image: `https://api.dicebear.com/6.x/pixel-art/svg?seed=${generateRandomString(8)}`
});

async function seedNFTs() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to DB");

  let created = 0;
  let price = START_PRICE;

  while (created < TOTAL_NFTS) {
    for (let i = 0; i < NFTS_PER_PRICE && created < TOTAL_NFTS; i++) {
      const nft = generateDummyNFT(price, i + 1);
      await Nft.create(nft);
      created++;
    }
    price++; // Increase price for next group
  }

  console.log(`✅ Successfully created ${created} NFTs`);
  mongoose.disconnect();
}

seedNFTs().catch(err => {
  console.error("Seeding failed:", err);
  mongoose.disconnect();
});

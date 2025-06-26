const mongoose = require('mongoose');
const Nft = require('./models/Nft'); // Adjust path

const MONGODB_URI = 'mongodb+srv://treasusrexnft:admin@cluster0.j1yqv8y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const TOTAL_NFTS = 1500;
const START_PRICE = 48;
const NFTS_PER_PRICE = 3;

const customImages = [
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616950/7748166_cxhcha.jpg',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616948/Five-NFT-Challenges-1_dkbnkv.jpg',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616949/th_f5wfk5.jpg',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616948/bayc-8817-1024x1024_c9rgwm.jpg',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616948/boredape_ooqmnk.jpg',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616948/nft-monkey-4k7xu9wjiuy4say2_o8qvlb.jpg',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616948/nft-background-l8fq4jdq324hhoek_zohtgm.jpg',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616948/th_1_njxghh.jpg',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616929/boredape_1_bglvd6.jpg',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616928/61254c10-c4e2-11ec-b6eb-8947bb0d6d4e.cf_rrw36t.jpg',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616928/mutant-ape-yacht-club-nft-artwork-collection-set-unique-bored-monkey-character-nfts-variant_361671-259_sezzff.avif',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616929/bored_ape_1200x800_2022_wqwy37.webp',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616927/tpxvny1fbdv61_zhryqf.png',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616928/8cbbaf683da595be433f6342a1fab0c1_kunpe6.png',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616929/wp10537285_xtnm1i.webp',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616928/ape-007_wqtzk7.webp',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616927/bored-ape-sad-gID_7_bijk9c.png',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616929/Bored-Ape-Yacht-Club-NFT-numero-8585-_r8ttr4.webp',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616929/boredapeyachtclub_nft_image_158_diaqhi.webp',
  'https://res.cloudinary.com/di0qbhv97/image/upload/v1750616928/wp10578770_bz8iji.webp',

];

const generateRandomString = (length = 10) =>
  Math.random().toString(36).substring(2, 2 + length);

const generateDummyNFT = (price, index) => {
  const randomImage = customImages[Math.floor(Math.random() * customImages.length)];

  return {
    name: `NFT_${price}_${index}_${generateRandomString(3)}`,
    hash: generateRandomString(64),
    price,
    image: randomImage,
  };
};

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
    price++;
  }

  console.log(`✅ Successfully created ${created} NFTs`);
  mongoose.disconnect();
}

seedNFTs().catch(err => {
  console.error("Seeding failed:", err);
  mongoose.disconnect();
});

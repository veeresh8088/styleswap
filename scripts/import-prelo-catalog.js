require('dotenv').config();

const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const User = require('../models/User');
const Category = require('../models/Category');

// Product images and names selected from Prelo's public catalog on 10 Sep 2026.
const women = [
  ['Saloni Blue Sleeveless Dress', 'https://www.prelo.in/cdn/shop/files/Saloni_Dress.jpg?v=1779641707&width=360', 'https://www.prelo.in/products/saloni-blue-sleeveless-dress'],
  ['Alice + Olivia Blue Patterned Dress', 'https://www.prelo.in/cdn/shop/files/AliceOliviaDress.jpg?v=1779641957&width=360', 'https://www.prelo.in/products/alice-olivia-blue-patterned-dress'],
  ['Malini Ramani Wine Sequin Dress', 'https://www.prelo.in/cdn/shop/files/sequin_dress.png?v=1787203857&width=360', 'https://www.prelo.in/products/malini-ramani-wine-sequin-dress'],
  ['Oska Blue Maxi Dress', 'https://www.prelo.in/cdn/shop/files/OskaBlueDress.png?v=1779642283&width=360', 'https://www.prelo.in/products/oska-blue-maxi-dress'],
  ['Mehaka Mirapuri Couture Brown Ruffle Dress', 'https://www.prelo.in/cdn/shop/files/download_75eba0ac-ddea-4b6a-a1d8-f2bf56975e76.jpg?v=1786873818&width=360', 'https://www.prelo.in/products/mehaka-mirapuri-couture-brown-ruffle-dress'],
  ['Miss Ord Beige Sequin Gown', 'https://www.prelo.in/cdn/shop/files/download_cad11986-caaa-46d0-92ca-07e2d9227d82.jpg?v=1785738371&width=360', 'https://www.prelo.in/products/miss-ord-beige-sequin-gown'],
  ['Forever New Teal Satin Dress', 'https://www.prelo.in/cdn/shop/files/download_d00b6e97-fbb5-48c9-9ee0-77a17fdfef82.jpg?v=1785503891&width=360', 'https://www.prelo.in/products/forever-new-blue-satin-dress'],
  ['Iyla Beige Sleeveless Dress', 'https://www.prelo.in/cdn/shop/files/download_7469c7f7-0bb1-49f9-b769-6818db0c7692.jpg?v=1787115261&width=360', 'https://www.prelo.in/products/iyla-beige-sleeveless-dress'],
  ['New Look Brown Embellished Dress', 'https://www.prelo.in/cdn/shop/files/brown_sequin.png?v=1787204501&width=360', 'https://www.prelo.in/products/new-look-brown-embellished-dress'],
  ['Khara Kapas Beige Halter Dress', 'https://www.prelo.in/cdn/shop/files/download_6b76826d-c897-443a-a1c6-c89b66dee457.jpg?v=1786873822&width=360', 'https://www.prelo.in/products/khara-kapas-beige-halter-dress'],
  ['Translate Red Buttoned Kurta', 'https://www.prelo.in/cdn/shop/files/download_4e504f27-5528-4fc9-97b5-2876e8e6dbea.jpg?v=1786873730&width=360', 'https://www.prelo.in/products/translate-red-buttoned-kurta'],
  ['Forever New Green Ribbed Dress', 'https://www.prelo.in/cdn/shop/files/download_024d768d-0406-49bf-8bb2-4d461c02a81b.jpg?v=1786617465&width=360', 'https://www.prelo.in/products/forever-new-green-ribbed-dress'],
  ['Dibiskle Red Maxi Dress', 'https://www.prelo.in/cdn/shop/files/download_748f3c1e-8f39-495d-80e6-450eebb22829.jpg?v=1785738370&width=360', 'https://www.prelo.in/products/dibiskle-red-maxi-dress'],
  ['Forever New Blue Satin Dress', 'https://www.prelo.in/cdn/shop/files/download_c8396c09-582f-4e28-8d27-0d6938709f84.jpg?v=1785738373&width=360', 'https://www.prelo.in/products/forever-new-blue-satin-dress-1'],
  ['Zara Green Shirt Dress', 'https://www.prelo.in/cdn/shop/files/download_deb158f6-cee0-44b8-9844-46ccecb3195b.jpg?v=1785503863&width=360', 'https://www.prelo.in/products/zara-green-shirt-dress'],
  ['Muji Black T-Shirt Dress', 'https://www.prelo.in/cdn/shop/files/BlackMujiDress_1.jpg?v=1779673795&width=533', 'https://www.prelo.in/products/muji-black-t-shirt-dress'],
  ['Black Floral Dress', 'https://www.prelo.in/cdn/shop/files/Gemini_Generated_Image_o7x04mo7x04mo7x0.png?v=1776962471&width=533', 'https://www.prelo.in/products/black-floral-dress'],
  ['Mango Black Wrap Dress', 'https://www.prelo.in/cdn/shop/files/download_77c58aa4-a606-4ce9-8781-9ba0c8648d69.jpg?v=1786040033&width=533', 'https://www.prelo.in/products/mango-black-wrap-dress'],
  ['B+ Vestry Purple Sequin Gown', 'https://www.prelo.in/cdn/shop/files/download_d7119c40-8b4f-4c21-b4f8-07b48038b6b0.jpg?v=1786039999&width=533', 'https://www.prelo.in/products/b-vestry-purple-sequin-gown'],
  ['Lov Green Tiered Maxi', 'https://www.prelo.in/cdn/shop/files/download_944b42d0-5e7c-40d4-893d-7c1335f27205.jpg?v=1783093510&width=533', 'https://www.prelo.in/products/lov-green-tiered-maxi'],
  ['Na-Kd Black Ribbed Dress', 'https://www.prelo.in/cdn/shop/files/download_b5c0ae9c-5e66-4fae-8dff-34a1d353e5a8.jpg?v=1788521258&width=533', 'https://www.prelo.in/products/na-kd-black-ribbed-dress'],
  ['Zara Black Embroidered Dress', 'https://www.prelo.in/cdn/shop/files/download_342cd64a-8136-4efd-b520-00312f3c7e1e.jpg?v=1785738317&width=533', 'https://www.prelo.in/products/zara-black-embroidered-dress'],
  ['Zara White Cutout Dress', 'https://www.prelo.in/cdn/shop/files/download_06cff498-7511-49bb-bf32-32a4f42a4a71.jpg?v=1785503957&width=533', 'https://www.prelo.in/products/zara-white-cutout-dress'],
  ['Forever New Wine Wrap Dress', 'https://www.prelo.in/cdn/shop/files/download_e6e4c060-d5f4-4175-bc4a-eb1b152885b8.jpg?v=1785157379&width=533', 'https://www.prelo.in/products/forever-new-wine-wrap-dress'],
  ['Forever New Beige Satin Dress', 'https://www.prelo.in/cdn/shop/files/download_6874af14-163b-49cb-98e5-f8c79427c17a.jpg?v=1785157337&width=533', 'https://www.prelo.in/products/forever-new-beige-satin-dress'],
  ['Bombay Catsey Pink Tiered Dress', 'https://www.prelo.in/cdn/shop/files/download_3be64f59-997d-4da0-a0e3-286013fcb776.jpg?v=1783093510&width=533', 'https://www.prelo.in/products/bombay-catsey-pink-tiered-dress'],
  ['Alaya Blue Striped Dress', 'https://www.prelo.in/cdn/shop/files/download_68249fc3-3780-46eb-9b3e-8fd3ee7bac20.jpg?v=1783093484&width=533', 'https://www.prelo.in/products/alaya-blue-striped-jumpsuit'],
  ['Bombay Catsey Beige Jumpsuit Romper', 'https://www.prelo.in/cdn/shop/files/download_afc6d519-afcd-4ab2-9d56-3f936aec8391.jpg?v=1783093485&width=533', 'https://www.prelo.in/products/bombay-catsey-beige-jumpsuit-romper'],
  ['Mango Black Dress', 'https://www.prelo.in/cdn/shop/files/2302_Model.png?v=1784292449&width=533', 'https://www.prelo.in/products/mango-black-dress'],
  ['Superdry Black Strapless Dress', 'https://www.prelo.in/cdn/shop/files/download_966baa2d-75aa-45be-87d2-f4f264863283.jpg?v=1782533320&width=533', 'https://www.prelo.in/products/superdry-black-strapless-dress'],
  ['Mango Black Cocktail Dress', 'https://www.prelo.in/cdn/shop/files/Gemini_Generated_Image_xaeg3lxaeg3lxaeg_1.png?v=1776963952&width=533', 'https://www.prelo.in/products/mango-black-cocktail-dress'],
  ['Cover Story Wine Floral Dress', 'https://www.prelo.in/cdn/shop/files/download_c6e9beba-9986-44a8-b2cb-db8290f4b414.jpg?v=1788521196&width=533', 'https://www.prelo.in/products/cover-story-wine-floral-dress'],
  ['Zara Beige Knit Dress', 'https://www.prelo.in/cdn/shop/files/download_f54878fd-79c0-4efd-a879-3fa9cbb88184.jpg?v=1786039998&width=533', 'https://www.prelo.in/products/zara-beige-knit-dress'],
  ['H&M Black Cami Dress', 'https://www.prelo.in/cdn/shop/files/download_8f799353-4a78-40cc-b1ef-b291a0a0e141.jpg?v=1785157377&width=533', 'https://www.prelo.in/products/h-m-black-cami-dress'],
  ['Asos Design Wine Evening Gown', 'https://www.prelo.in/cdn/shop/files/2288_Model_Dress.png?v=1784291492&width=360', 'https://www.prelo.in/products/asos-design-wine-evening-gown'],
  ['Rareism Blue Colorblock Dress', 'https://www.prelo.in/cdn/shop/files/IMG_5429.jpg?v=1778553666&width=533', 'https://www.prelo.in/products/rareism-blue-colorblock-dress'],
  ['Bombay Catsey Blue Tiered Dress', 'https://www.prelo.in/cdn/shop/files/download_87a25911-2a8c-42dd-bc31-017f9abfab73.jpg?v=1783093483&width=360', 'https://www.prelo.in/products/bombay-catsey-blue-tiered-dress'],
  ['Zara Green Satin Dress', 'https://www.prelo.in/cdn/shop/files/download_c345c64a-416f-4b22-b449-6e70902ee891.jpg?v=1786039948&width=533', 'https://www.prelo.in/products/zara-green-satin-dress-1'],
  ['Topshop Black Lace Dress', 'https://www.prelo.in/cdn/shop/files/download_c222e2c1-64cb-4d57-b56d-56e0e8f24526.jpg?v=1783093679&width=360', 'https://www.prelo.in/products/topshop-black-lace-dress'],
  ['Mango Blue Tube Dress', 'https://www.prelo.in/cdn/shop/files/download_4852eae0-73ae-4642-8852-dc5e86a86a07.jpg?v=1782373690&width=360', 'https://www.prelo.in/products/mango-blue-tube-dress']
];

const men = [
  ['Hancock White Dress Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_c548e50f-8f0d-4ffd-95f3-3038230978d0.jpg?v=1788509113', 'https://www.prelo.in/products/hancock-white-dress-shirt', 399],
  ['Eleganza Junior Gray Dress Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_24415c99-9974-4cdf-ad98-d73038f022ea.jpg?v=1788260913', 'https://www.prelo.in/products/eleganza-junior-gray-dress-shirt', 549],
  ['Zara White Mandarin Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_fdb57b51-d4b6-4df6-a767-ee59a98c6572.jpg?v=1785503918', 'https://www.prelo.in/products/zara-white-mandarin-shirt', 749],
  ['Indigo Nation Blue Formal Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_8c4cab0e-a953-4aa7-8a73-a7ccce21b3e8.jpg?v=1785503918', 'https://www.prelo.in/products/indigo-nation-blue-formal-shirt', 499],
  ['Van Heusen White Formal Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_1eea30c3-7581-4aa9-9be9-a7dd0d66470e.jpg?v=1785503917', 'https://www.prelo.in/products/van-heusen-white-formal-shirt', 699],
  ['Levis Blue Plaid Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_6c3a203c-e7fd-47b5-b8d9-e19129953a28.jpg?v=1785503917', 'https://www.prelo.in/products/levis-blue-plaid-shirt', 699],
  ['Uniqlo Gray Linen Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_b82cfdbb-9afa-415c-b469-1d115fabeda6.jpg?v=1785503887', 'https://www.prelo.in/products/uniqlo-gray-linen-shirt', 649],
  ['Byford White Mandarin Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_f38c2f24-c0fc-472c-8a5a-c6bb4541217a.jpg?v=1784348171', 'https://www.prelo.in/products/byford-white-mandarin-shirt', 499],
  ['H&M Blue Button-Down Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_06d1e078-9421-41a7-b6bc-01a138d61ded.jpg?v=1784348048', 'https://www.prelo.in/products/h-m-blue-button-down-shirt', 399],
  ['H&M Beige Linen Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_49f12af2-d8db-488d-8c2d-32966ce9fa2a.jpg?v=1784348046', 'https://www.prelo.in/products/h-m-beige-linen-shirt', 499],
  ['Gray Button-Down Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_22291676-6f65-43fb-90aa-ac9cbae59f59.jpg?v=1784348046', 'https://www.prelo.in/products/gray-button-down-shirt', 299],
  ['H&M Blue Dress Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_f409e640-ab3c-42bd-b741-76643162c7ac.jpg?v=1784348046', 'https://www.prelo.in/products/h-m-blue-dress-shirt-1', 349],
  ['Black Coffee Beige Casual Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_1dd218fd-4a4e-4a92-9981-639cbcf48a6d.jpg?v=1784348003', 'https://www.prelo.in/products/black-coffee-beige-casual-shirt', 499],
  ['Fabindia Blue Mandarin Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_97c1b474-96fd-4828-8d23-246351d7271e.jpg?v=1784200383', 'https://www.prelo.in/products/fabindia-blue-mandarin-shirt', 499],
  ['Park Avenue Beige Casual Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_26d6cdaf-2aca-4f4c-b07b-abb88a923fef.jpg?v=1784200359', 'https://www.prelo.in/products/park-avenue-beige-casual-shirt', 499],
  ['Allen Solly Green Casual Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_0ed8b4a5-b88c-4d0f-a42b-2281abd2aa78.jpg?v=1784200357', 'https://www.prelo.in/products/allen-solly-green-casual-shirt', 499],
  ['H&M Blue Dress Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_447fe1f1-c495-4ef4-9b5e-129dabc6f6c8.jpg?v=1784200357', 'https://www.prelo.in/products/h-m-blue-dress-shirt', 399],
  ['Gray Graphic T-Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_9e93187f-3019-4f60-a2b9-67857e4aab3b.jpg?v=1784200357', 'https://www.prelo.in/products/gray-graphic-t-shirt-1', 199],
  ['Fabindia Gray Linen Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_950af851-5ad4-4aea-b73b-b4dba34b0119.jpg?v=1784200329', 'https://www.prelo.in/products/fabindia-gray-linen-shirt', 499],
  ['Boss White Dress Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_3b9bcd69-69c7-4faa-b6f1-199f3f406a45.jpg?v=1779460382', 'https://www.prelo.in/products/boss-white-dress-shirt', 599],
  ['Cutter & Buck Blue Button-Down Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_19f9f834-c36d-45b4-a08a-fb6726a958a4.jpg?v=1779460363', 'https://www.prelo.in/products/cutter-buck-blue-button-down-shirt', 699],
  ['Denim & Flower Purple Button-Down Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_f9332216-7f59-4120-acb9-7bf4fa61fdd4.jpg?v=1779460362', 'https://www.prelo.in/products/denim-flower-purple-button-down-shirt', 499],
  ['Blue Button-Down Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_6d07150a-2adb-4e77-912d-6bdcc59962fe.jpg?v=1777123965', 'https://www.prelo.in/products/blue-button-down-shirt-2', 499],
  ['American Eagle Blue Button-Down Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_899dbf20-2831-451b-bf99-09b9a0b3134f.jpg?v=1777123964', 'https://www.prelo.in/products/american-eagle-blue-button-down-shirt', 549],
  ['Wit And Wonder Blue Dress Shirt', 'https://cdn.shopify.com/s/files/1/0635/5651/8019/files/download_3c64427f-7f64-4360-8ba1-27580d0dee76.jpg?v=1777123946', 'https://www.prelo.in/products/wit-and-wonder-blue-dress-shirt', 549]
];

async function importCatalog() {
  await mongoose.connect(process.env.MONGODB_URI);

  const seller = await User.findOne({ role: 'admin' });
  if (!seller) throw new Error('An admin account is needed before importing products.');

  const womenCategory = await Category.findOne({ slug: 'dresses-corsets-tops' });
  let menCategory = await Category.findOne({ name: "Men's Western Wear" });
  if (!menCategory) {
    menCategory = await Category.create({
      name: "Men's Western Wear",
      description: 'Pre-loved shirts and western menswear.',
      icon: 'shirt'
    });
  }

  const candidates = [
    ...women.map(([title, image, sourceUrl]) => ({ title, image, sourceUrl, price: 999, category: womenCategory._id, kind: 'women\'s western dress' })),
    ...men.map(([title, image, sourceUrl, price]) => ({ title, image, sourceUrl, price, category: menCategory._id, kind: 'men\'s western shirt' }))
  ];
  const urls = candidates.map((item) => item.sourceUrl);
  const alreadyImported = new Set((await Listing.collection.find({ importSource: 'prelo', sourceUrl: { $in: urls } }).project({ sourceUrl: 1 }).toArray()).map((item) => item.sourceUrl));
  const now = new Date();
  const newListings = candidates
    .filter((item) => !alreadyImported.has(item.sourceUrl))
    .map((item) => ({
      sellerId: seller._id,
      title: item.title,
      description: `Curated pre-loved ${item.kind}. Product image sourced from Prelo; see the source link for the original product details.`,
      category: item.category,
      price: item.price,
      condition: 'Like New (Barely Worn)',
      images: [item.image],
      type: 'sell',
      status: 'approved',
      location: 'Bengaluru, Karnataka',
      sourceUrl: item.sourceUrl,
      importSource: 'prelo',
      createdAt: now,
      updatedAt: now
    }));

  if (newListings.length) await Listing.collection.insertMany(newListings);
  console.log(`Imported ${newListings.length} listings (${women.length} women selected, ${men.length} men selected).`);
  await mongoose.disconnect();
}

importCatalog().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exitCode = 1;
});

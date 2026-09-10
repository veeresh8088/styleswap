const mongoose = require('../node_modules/mongoose');

async function seed() {
  await mongoose.connect('mongodb://127.0.0.1:27017/smart_wear_exchange', { family: 4 });
  const Listing = mongoose.model('Listing', new mongoose.Schema({}, { strict: false }));
  const Category = mongoose.model('Category', new mongoose.Schema({}, { strict: false }));
  const cat = await Category.findOne({ isActive: true });
  
  const vinayakId = new mongoose.Types.ObjectId('6a9f988e00f175fa086fe8f8');
  await Listing.updateMany({ sellerId: vinayakId }, { $set: { status: 'approved' } });
  
  const existingCount = await Listing.countDocuments({ sellerId: vinayakId });
  if (existingCount < 3) {
    await Listing.create({
      sellerId: vinayakId,
      title: 'H&M Relaxed Fit Heavyweight Cotton Hoodie',
      description: 'Cozy charcoal gray hoodie in pure cotton fleece.',
      category: cat ? cat._id : new mongoose.Types.ObjectId(),
      size: 'L',
      price: 899,
      condition: 'Like New (Barely Worn)',
      images: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800'],
      type: 'both',
      status: 'approved',
      location: 'Bengaluru, Karnataka'
    });
    await Listing.create({
      sellerId: vinayakId,
      title: 'Vintage Levi 501 Straight Leg Denim Jeans',
      description: 'Classic blue wash 501s with genuine vintage fade.',
      category: cat ? cat._id : new mongoose.Types.ObjectId(),
      size: '32',
      price: 1299,
      condition: 'Gently Used (Good Condition)',
      images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=800'],
      type: 'both',
      status: 'approved',
      location: 'Bengaluru, Karnataka'
    });
  }
  
  const allVinayak = await Listing.find({ sellerId: vinayakId });
  console.log('Vinayak updated listings count:', allVinayak.length);
  allVinayak.forEach(l => console.log('-', l.title, '(status:', l.status, 'price:', l.price, ')'));
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});

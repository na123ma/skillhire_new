require('dotenv').config();

const mongoose = require('mongoose');
const Result = require('./models/Result');
const User = require('./models/User');

async function cleanupDuplicates() {
  await mongoose.connect(process.env.MONGO_URI);

  const duplicates = await Result.aggregate([
    { $group: { _id: '$userId', count: { $sum: 1 }, ids: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]);

  console.log('Duplicate result groups:', duplicates.length);

  for (const group of duplicates) {
    const sorted = group.ids.slice().sort();
    const keep = sorted[sorted.length - 1];
    const remove = sorted.slice(0, -1);

    if (remove.length > 0) {
      await Result.deleteMany({ _id: { $in: remove } });
      console.log(`Kept result ${keep} for user ${group._id} and removed ${remove.length} duplicate(s).`);
    }

    await User.findByIdAndUpdate(group._id, { testCompleted: true });
  }

  await Result.syncIndexes();
  console.log('Duplicate cleanup finished.');
  process.exit(0);
}

cleanupDuplicates().catch((error) => {
  console.error(error);
  process.exit(1);
});

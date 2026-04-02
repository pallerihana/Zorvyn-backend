const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Transaction = require('./models/Transaction');
const User = require('./models/User');

dotenv.config();

const addViewerData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the viewer user
    const viewerEmail = 'prathiska@gmail.com'; // Change this to your viewer's email
    const viewer = await User.findOne({ email: viewerEmail });
    
    if (!viewer) {
      console.log(`❌ Viewer with email ${viewerEmail} not found!`);
      console.log('\nAvailable users:');
      const users = await User.find();
      users.forEach(u => console.log(`  - ${u.email} (${u.role})`));
      process.exit(1);
    }

    console.log(`\n✅ Found viewer: ${viewer.email} (${viewer.role})`);
    console.log(`User ID: ${viewer._id}\n`);

    // Check existing transactions
    const existingCount = await Transaction.countDocuments({ user: viewer._id });
    console.log(`Existing transactions: ${existingCount}`);

    if (existingCount > 0) {
      console.log('Viewer already has transactions. Do you want to add more? (y/n)');
      // For automation, we'll add more anyway
    }

    const sampleTransactions = [
      // Income Transactions for viewer
      { amount: 3000, type: 'income', category: 'Salary', description: 'Monthly Salary - January', date: new Date('2024-01-01'), user: viewer._id },
      { amount: 3000, type: 'income', category: 'Salary', description: 'Monthly Salary - February', date: new Date('2024-02-01'), user: viewer._id },
      { amount: 3000, type: 'income', category: 'Salary', description: 'Monthly Salary - March', date: new Date('2024-03-01'), user: viewer._id },
      { amount: 100, type: 'income', category: 'Investment', description: 'Dividend', date: new Date('2024-01-15'), user: viewer._id },
      
      // Expense Transactions for viewer
      { amount: 1000, type: 'expense', category: 'Bills & Utilities', description: 'Rent - January', date: new Date('2024-01-05'), user: viewer._id },
      { amount: 1000, type: 'expense', category: 'Bills & Utilities', description: 'Rent - February', date: new Date('2024-02-05'), user: viewer._id },
      { amount: 1000, type: 'expense', category: 'Bills & Utilities', description: 'Rent - March', date: new Date('2024-03-05'), user: viewer._id },
      { amount: 300, type: 'expense', category: 'Food & Dining', description: 'Groceries - January', date: new Date('2024-01-10'), user: viewer._id },
      { amount: 280, type: 'expense', category: 'Food & Dining', description: 'Groceries - February', date: new Date('2024-02-10'), user: viewer._id },
      { amount: 320, type: 'expense', category: 'Food & Dining', description: 'Groceries - March', date: new Date('2024-03-10'), user: viewer._id },
      { amount: 100, type: 'expense', category: 'Food & Dining', description: 'Restaurant', date: new Date('2024-01-15'), user: viewer._id },
      { amount: 50, type: 'expense', category: 'Entertainment', description: 'Movie', date: new Date('2024-01-12'), user: viewer._id },
      { amount: 40, type: 'expense', category: 'Transportation', description: 'Uber', date: new Date('2024-01-14'), user: viewer._id },
      { amount: 150, type: 'expense', category: 'Shopping', description: 'Clothes', date: new Date('2024-01-18'), user: viewer._id },
      { amount: 80, type: 'expense', category: 'Healthcare', description: 'Pharmacy', date: new Date('2024-01-20'), user: viewer._id },
    ];

    const inserted = await Transaction.insertMany(sampleTransactions);
    console.log(`✅ Inserted ${inserted.length} sample transactions for viewer ${viewer.email}\n`);

    // Verify the data
    const count = await Transaction.countDocuments({ user: viewer._id });
    const totalIncome = sampleTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = sampleTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    console.log('📊 Summary for Viewer:');
    console.log(`  Total Transactions: ${count}`);
    console.log(`  Total Income: $${totalIncome}`);
    console.log(`  Total Expense: $${totalExpense}`);
    console.log(`  Net Savings: $${totalIncome - totalExpense}`);
    console.log(`\n✅ Viewer data seeded successfully!`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

addViewerData();
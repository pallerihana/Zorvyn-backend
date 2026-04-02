const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// Helper function to get week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    console.log('Dashboard stats - User ID:', req.user.id);
    console.log('User Role:', req.user.role);
    
    let query = {};
    
    // Admin can see all transactions or filter by specific user
    if (req.user.role === 'admin') {
      if (req.query.userId) {
        query.user = req.query.userId;
      }
      // If no userId specified, admin sees all transactions
    } else {
      // Viewers see only their own transactions
      query.user = req.user.id;
    }
    
    // Get all transactions based on query
    const transactions = await Transaction.find(query);
    console.log(`Found ${transactions.length} transactions`);
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalBalance = totalIncome - totalExpense;
    
    // Get recent transactions
    const recentTransactions = await Transaction.find(query)
      .sort('-date')
      .limit(10)
      .populate('user', 'name email');
    
    res.status(200).json({
      success: true,
      data: {
        totalBalance,
        totalIncome,
        totalExpense,
        transactionCount: transactions.length,
        recentTransactions
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get balance trend (time-based visualization)
// @route   GET /api/dashboard/trend
// @access  Private
exports.getBalanceTrend = async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    const userId = req.user.id;
    
    const transactions = await Transaction.find({ user: userId });
    
    if (transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    
    // Group transactions by period
    const groupedData = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      let key;
      
      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const weekNumber = getWeekNumber(date);
        key = `${date.getFullYear()}-W${weekNumber}`;
      } else {
        // monthly (default)
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!groupedData[key]) {
        groupedData[key] = {
          income: 0,
          expense: 0,
          date: date,
          period: key
        };
      }
      
      if (transaction.type === 'income') {
        groupedData[key].income += transaction.amount;
      } else {
        groupedData[key].expense += transaction.amount;
      }
    });
    
    const trend = Object.values(groupedData)
      .map(item => ({
        period: item.period,
        income: item.income,
        expense: item.expense,
        balance: item.income - item.expense,
        date: item.date
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    res.status(200).json({
      success: true,
      data: trend
    });
  } catch (error) {
    console.error('Balance trend error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get spending breakdown by category
// @route   GET /api/dashboard/spending-breakdown
// @access  Private
exports.getSpendingBreakdown = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const transactions = await Transaction.find({ 
      user: userId,
      type: 'expense'
    });
    
    console.log(`Found ${transactions.length} expense transactions for spending breakdown`);
    
    if (transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: []
      });
    }
    
    // Group by category
    const categoryMap = {};
    transactions.forEach(transaction => {
      if (!categoryMap[transaction.category]) {
        categoryMap[transaction.category] = {
          category: transaction.category,
          total: 0,
          count: 0
        };
      }
      categoryMap[transaction.category].total += transaction.amount;
      categoryMap[transaction.category].count += 1;
    });
    
    const breakdown = Object.values(categoryMap);
    const totalExpenses = breakdown.reduce((sum, item) => sum + item.total, 0);
    
    // Add percentage and sort by total descending
    const breakdownWithPercentage = breakdown
      .map(item => ({
        ...item,
        percentage: ((item.total / totalExpenses) * 100).toFixed(2)
      }))
      .sort((a, b) => b.total - a.total);
    
    res.status(200).json({
      success: true,
      data: breakdownWithPercentage
    });
  } catch (error) {
    console.error('Spending breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Get financial insights
// @route   GET /api/dashboard/insights
// @access  Private
exports.getInsights = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all transactions
    const transactions = await Transaction.find({ user: userId });
    
    if (transactions.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          highestSpendingCategory: null,
          monthlyComparison: {
            currentMonth: 0,
            previousMonth: 0,
            change: 0,
            trend: 'unchanged'
          },
          averageMonthlyExpense: 0,
          savingsRate: 0,
          totalIncome: 0,
          totalExpense: 0,
          netSavings: 0,
          totalTransactions: 0
        }
      });
    }
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(2) : 0;
    
    // Find highest spending category
    const categoryExpense = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categoryExpense[t.category] = (categoryExpense[t.category] || 0) + t.amount;
      });
    
    const highestSpendingEntry = Object.entries(categoryExpense).sort((a, b) => b[1] - a[1])[0];
    const highestSpendingCategory = highestSpendingEntry ? {
      category: highestSpendingEntry[0],
      amount: highestSpendingEntry[1]
    } : null;
    
    // Get current month and previous month
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const currentMonthExpense = transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= currentMonthStart)
      .reduce((sum, t) => sum + t.amount, 0);
    
    const previousMonthExpense = transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= previousMonthStart && new Date(t.date) <= previousMonthEnd)
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Calculate monthly comparison
    let monthlyChange = 0;
    let trend = 'unchanged';
    if (previousMonthExpense > 0) {
      monthlyChange = ((currentMonthExpense - previousMonthExpense) / previousMonthExpense) * 100;
      trend = monthlyChange > 0 ? 'increased' : monthlyChange < 0 ? 'decreased' : 'unchanged';
    }
    
    // Calculate average monthly expense
    const months = new Set();
    transactions.forEach(t => {
      const date = new Date(t.date);
      months.add(`${date.getFullYear()}-${date.getMonth()}`);
    });
    const averageMonthlyExpense = months.size > 0 ? totalExpense / months.size : 0;
    
    res.status(200).json({
      success: true,
      data: {
        highestSpendingCategory,
        monthlyComparison: {
          currentMonth: currentMonthExpense,
          previousMonth: previousMonthExpense,
          change: parseFloat(monthlyChange.toFixed(2)),
          trend
        },
        averageMonthlyExpense: parseFloat(averageMonthlyExpense.toFixed(2)),
        savingsRate: parseFloat(savingsRate),
        totalIncome,
        totalExpense,
        netSavings,
        totalTransactions: transactions.length
      }
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message
    });
  }
};

// @desc    Test endpoint to check database connection
// @route   GET /api/dashboard/test
// @access  Private
exports.testDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Test endpoint - User ID:', userId);
    
    // Try to count transactions
    const count = await Transaction.countDocuments({ user: userId });
    console.log(`Transaction count for user: ${count}`);
    
    // Get one sample transaction
    const sample = await Transaction.findOne({ user: userId });
    
    res.status(200).json({
      success: true,
      message: 'Dashboard test successful',
      data: {
        userId,
        transactionCount: count,
        hasTransactions: count > 0,
        sampleTransaction: sample || null
      }
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
};
// Import necessary modules
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// Placeholder for database
let database = [];

// Middleware to parse JSON requests
app.use(bodyParser.json());

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to your API!' });
});

// Database initialization endpoint
app.get('/initialize-database', async (req, res) => {
  try {
    // Fetch data from the third-party API
    const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
    
    // Initialize the database with the fetched data
    database = response.data;

    res.status(200).json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// List All Transactions endpoint
app.get('/transactions', (req, res) => {
  // Extract parameters from the request
  const { month, search, page = 1, per_page = 10 } = req.query;

  // Filter transactions based on the provided parameters
  let filteredTransactions = database.filter(transaction => {
    // Filter by month
    const transactionMonth = new Date(transaction.dateOfSale).getMonth() + 1; // Month is 0-based
    return transactionMonth === parseInt(month, 10);
  });

  // Filter by search criteria
  if (search) {
    const searchQuery = search.toLowerCase();
    filteredTransactions = filteredTransactions.filter(transaction =>
      transaction.title.toLowerCase().includes(searchQuery) ||
      transaction.description.toLowerCase().includes(searchQuery) ||
      transaction.price.toString().includes(searchQuery)
    );
  }

  // Implement pagination
  const startIndex = (page - 1) * per_page;
  const endIndex = startIndex + per_page;
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

  // Return the response
  res.status(200).json({ message: 'List of transactions', data: paginatedTransactions });
});

// Statistics endpoint
app.get('/statistics', (req, res) => {
  // Extract parameters from the request
  const { month } = req.query;

  // Filter transactions based on the provided month
  const filteredTransactions = database.filter(transaction => {
    const transactionMonth = new Date(transaction.dateOfSale).getMonth() + 1;
    return transactionMonth === parseInt(month, 10);
  });

  // Calculate statistics
  const totalSaleAmount = filteredTransactions.reduce((sum, transaction) => sum + transaction.price, 0);
  const totalSoldItems = filteredTransactions.length;
  const totalNotSoldItems = database.length - totalSoldItems;

  // Return the response
  res.status(200).json({
    message: 'Statistics for the selected month',
    data: {
      totalSaleAmount,
      totalSoldItems,
      totalNotSoldItems,
    },
  });
});

// Bar Chart endpoint
app.get('/bar-chart', (req, res) => {
  // Extract parameters from the request
  const { month } = req.query;

  // Filter transactions based on the provided month
  const filteredTransactions = database.filter(transaction => {
    const transactionMonth = new Date(transaction.dateOfSale).getMonth() + 1;
    return transactionMonth === parseInt(month, 10);
  });

  // Generate bar chart data
  const priceRanges = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, Number.MAX_SAFE_INTEGER];
  const barChartData = priceRanges.map((maxPrice, index) => {
    const minPrice = index === 0 ? 0 : priceRanges[index - 1] + 1;
    const rangeItems = filteredTransactions.filter(transaction => transaction.price >= minPrice && transaction.price <= maxPrice);
    return { range: `${minPrice} - ${maxPrice}`, itemCount: rangeItems.length };
  });

  // Return the response
  res.status(200).json({ message: 'Bar chart data for the selected month', data: barChartData });
});

// Pie Chart endpoint
app.get('/pie-chart', (req, res) => {
  // Extract parameters from the request
  const { month } = req.query;

  // Filter transactions based on the provided month
  const filteredTransactions = database.filter(transaction => {
    const transactionMonth = new Date(transaction.dateOfSale).getMonth() + 1;
    return transactionMonth === parseInt(month, 10);
  });

  // Generate pie chart data
  const uniqueCategories = [...new Set(filteredTransactions.map(transaction => transaction.category))];
  const pieChartData = uniqueCategories.map(category => {
    const categoryItems = filteredTransactions.filter(transaction => transaction.category === category);
    return { category, itemCount: categoryItems.length };
  });

  // Return the response
  res.status(200).json({ message: 'Pie chart data for the selected month', data: pieChartData });
});

// Combined Response endpoint
app.get('/combined-response', async (req, res) => {
  try {
    // Fetch data from the three APIs mentioned above
    const transactions = await axios.get(`/transactions?${new URLSearchParams(req.query)}`);
    const statistics = await axios.get(`/statistics?${new URLSearchParams(req.query)}`);
    const pieChart = await axios.get(`/pie-chart?${new URLSearchParams(req.query)}`);

    // Combine the responses
    const combinedResponse = { transactions: transactions.data, statistics: statistics.data, pieChart: pieChart.data };

    // Return the combined response
    res.status(200).json({ message: 'Combined response', data: combinedResponse });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


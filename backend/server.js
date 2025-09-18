require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/player');
const adminRoutes = require('./routes/admin');
const { verifyAccessToken } = require('./middleware/auth'); 
const swaggerUi = require('swagger-ui-express');
const openapi = require('./docs/openapi');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/player', verifyAccessToken, playerRoutes); // protect all /api/player routes
app.use('/api/admin', verifyAccessToken, adminRoutes);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
console.log('API docs: http://localhost:3000/api/docs');

const PORT = process.env.PORT || 3000; // use .env if present
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

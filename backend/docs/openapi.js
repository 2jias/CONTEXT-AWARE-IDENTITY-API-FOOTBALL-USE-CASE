const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Context-Aware Identity API',
      version: '1.0.0',
      description:
        'Auth, 2FA, role-based player visibility, sessions, and admin endpoints.',
    },
    servers: [{ url: 'http://localhost:3000/api' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./routes/*.js'], // we’ll add JSDoc blocks in your routes
};

module.exports = swaggerJsdoc(options);

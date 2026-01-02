const express = require('express');
const cors = require('cors');
const redis = require('redis');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const app = express();
app.use(express.json());
app.use(cors());

/* -------------------- Swagger Setup -------------------- */
const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Booking Publisher API',
      version: '1.0.0',
      description: 'Publishes booking events to Redis and listens for payment completion',
    },
    servers: [
      { url: 'http://localhost:3000' } // update for EC2 if needed
    ],
  },
  apis: [__filename],
});

app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
/* ------------------------------------------------------- */

let client;

async function initRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  client = redis.createClient({ url: redisUrl });
  client.on('error', (err) => console.error('Redis Client Error', err));
  await client.connect();
  console.log('Redis initialized');
}

initRedis().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * @openapi
 * /publishBooking:
 *   post:
 *     summary: Publish a bookingStarted event and wait for paymentCompleted
 *     description: Publishes a booking event to Redis and subscribes to paymentCompleted for this booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - roomId
 *               - date
 *             properties:
 *               bookingId:
 *                 type: string
 *                 example: "abc123"
 *               roomId:
 *                 type: string
 *                 example: "101"
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-12-11T10:00:00Z"
 *               price:
 *                 type: number
 *                 example: 100
 *               cardNumber:
 *                 type: string
 *                 example: "4111111111111111"
 *               expiry:
 *                 type: string
 *                 example: "12/25"
 *               cvv:
 *                 type: string
 *                 example: "123"
 *     responses:
 *       200:
 *         description: Booking published and payment received
 *       400:
 *         description: Missing required fields
 *       503:
 *         description: Redis not ready
 *       500:
 *         description: Redis publish/subscribe failed
 */
app.post('/publishBooking', async (req, res) => {
  if (!client?.isOpen) return res.status(503).send('Redis not ready');

  const { roomId, date, price, cardNumber, expiry, cvv } = req.body;
  //if (!bookingId || !roomId || !date) return res.status(400).send('bookingId, roomId, and date required');

  try {
    // Publish bookingStarted event
    await client.publish(
      'bookingStarted',
      JSON.stringify({ roomId, date, price, cardNumber, expiry, cvv })
    );
    console.log(`Published bookingStarted for ${roomId}`);

    // Subscribe for paymentCompleted for this booking
    const subscriber = client.duplicate();
    await subscriber.connect();

    await subscriber.subscribe('paymentCompleted', (message) => {
      const event = JSON.parse(message);
        res.send({ status: 'paymentCompleted', data: event });

        
      console.log("received payment complete event")

        // Unsubscribe after receiving payment
        subscriber.unsubscribe();
        subscriber.quit();
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Redis publish/subscribe failed');
  }
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if(email == "bmwatt.bw@gmail.com" && password == "password"){
    return res.status(200).json({
      message: 'Login successful'
    });
  }

  return res.status(401).json({ message: 'Invalid email or password' });
});

app.post('/todayTemp', (req, res) => {
  const temperature = Math.floor(Math.random() * 21); // 0–20 inclusive

  return res.status(200).json({
    temperature
  });
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Publisher listening on ${port}`);
});

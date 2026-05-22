const http       = require('http');
const express    = require('express');
const cors       = require('cors');
const dotenv     = require('dotenv');
const { Server } = require('socket.io');

const connectDB      = require('./config/db');
const socketHandler  = require('./socket/socketHandler');
const { setIO }      = require('./socket/emitter');

dotenv.config();
connectDB();

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

setIO(io);
socketHandler(io);

app.use(cors());
app.use(express.json());


app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/drivers',      require('./routes/driverRoutes'));
app.use('/api/guests',       require('./routes/guestRoutes'));
app.use('/api/trips',        require('./routes/tripRoutes'));
app.use('/api/leaves',       require('./routes/leaveRoutes'));
app.use('/api/ratings',      require('./routes/ratingRoutes'));
app.use('/api/vehicles',     require('./routes/vehicleRoutes'));
app.use('/api/queue',        require('./routes/queueRoutes'));
app.use('/api/location',     require('./routes/locationRoutes'));
app.use('/api/dispatch',     require('./routes/autoDispatchRoutes'));

app.get('/', (req, res) => res.json({ success: true, message: 'Driver Management API running' }));

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false, message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server + Socket.io running on port ${PORT}`));

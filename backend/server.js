// server.js
import 'dotenv/config'; // registers GoogleStrategy
import express from 'express';
import passport from 'passport';
import cors from 'cors';
import mongoose from 'mongoose';
// Initialize database connection
import './config/db.js';

// Import models (this ensures they are registered with Mongoose)
import './models/User.model.js';
import './models/Tournament.model.js';
import './models/Match.model.js';
import './models/Participant.model.js';
import './models/Team.model.js';
import './models/JoinRequest.model.js';
import './models/Score.model.js';

// Initialize passport
import './passport.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import sportRoutes from './routes/sport.routes.js';
import roleRoutes from './routes/role.routes.js';
import tournamentRoutes from './routes/tournament.routes.js';
import teamRoutes from './routes/team.routes.js';
import joinRequestRoutes from './routes/joinRequest.routes.js';
import matchRoutes from './routes/match.routes.js';
import shuffleRoutes from './routes/shuffle.routes.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';

const app = express();
const { SERVER_PORT, MONGO_URI, CLIENT_URL } = process.env;

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'keyboardcat',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: MONGO_URI,
      ttl: 24 * 60 * 60, // Session TTL (1 day)
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    },
  })
);

// 2. Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// 3. CORS (allow frontend origin)
app.use(
  cors({
    origin: CLIENT_URL, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
);

// 4. Body parser with 5MB limit
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 5. Mount auth routes under /auth
app.use('/auth', authRoutes);
app.use('/sports', sportRoutes);
app.use('/role', roleRoutes);
app.use('/tournaments', tournamentRoutes);
app.use('/teams', teamRoutes);
app.use('/join-requests', joinRequestRoutes);
app.use('/matches', matchRoutes);
app.use('/utils', shuffleRoutes);

// 6. Test endpoint
app.get('/', (req, res) => {
  res.send('Welcome to the MERN Stack Application!');
});
// 7. Connect to MongoDB, then start server
mongoose
  .connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    app.listen(SERVER_PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${SERVER_PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err);
  });
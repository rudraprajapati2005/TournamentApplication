# SportNet - Tournament Management System

A full-stack MERN (MongoDB, Express, React, Node.js) application for managing sports tournaments, teams, matches, and participants. SportNet provides a comprehensive platform for organizers to create and manage tournaments while allowing participants to join teams, view matches, and track their progress.

## 🚀 Features

- **User Authentication**: Google OAuth 2.0 integration for secure login
- **Tournament Management**: Create, edit, and manage sports tournaments
- **Team Management**: Organize participants into teams
- **Match Scheduling**: Schedule and track matches with score management
- **Join Requests**: Participants can request to join tournaments
- **Role-Based Access**: Different permissions for Organizers and Participants
- **Match Center**: View and manage all matches in one place
- **Team Hub**: Centralized team management interface
- **Messages**: Communication system for tournament participants
- **Dashboard**: Personalized dashboard for users

## 🛠️ Tech Stack

### Frontend
- **React** 19.1.0 - UI library
- **React Router DOM** 7.8.1 - Client-side routing
- **Axios** 1.10.0 - HTTP client
- **CSS3** - Styling

### Backend
- **Node.js** - Runtime environment
- **Express** 5.1.0 - Web framework
- **MongoDB** with **Mongoose** 8.16.3 - Database and ODM
- **Passport.js** 0.7.0 - Authentication middleware
- **Passport Google OAuth20** 2.0.0 - Google authentication strategy
- **Express Session** 1.18.2 - Session management
- **Connect Mongo** 5.1.0 - MongoDB session store
- **CORS** 2.8.5 - Cross-origin resource sharing
- **dotenv** 17.2.0 - Environment variable management

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or MongoDB Atlas account)
- **Google Cloud Console** account (for OAuth credentials)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd my-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the `backend` directory:
   ```env
   # Server Configuration
   SERVER_PORT=5000
   NODE_ENV=development

   # MongoDB Connection
   MONGO_URI=mongodb://localhost:27017/sportnet
   # Or for MongoDB Atlas:
   # MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/sportnet

   # Session Secret (generate a secure random string)
   # Use: node backend/generate-session-secret.js
   SESSION_SECRET=your-session-secret-here

   # Client URL (Frontend URL)
   CLIENT_URL=http://localhost:3000

   # Google OAuth Credentials
   # Get these from: https://console.cloud.google.com/apis/credentials
   CLIENT_ID=your-google-client-id
   CLIENT_SECRET=your-google-client-secret
   ```

4. **Generate SESSION_SECRET**

   Run the provided script to generate a secure session secret:
   ```bash
   node backend/generate-session-secret.js
   ```
   
   Copy the generated secret to your `.env` file.

5. **Set up Google OAuth**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Set authorized redirect URI: `http://localhost:5000/auth/google/callback`
   - Copy the Client ID and Client Secret to your `.env` file

6. **Start MongoDB**

   If using local MongoDB:
   ```bash
   mongod
   ```

   Or ensure your MongoDB Atlas connection string is correct in `.env`

## 🚀 Running the Application

### Development Mode

1. **Start the backend server**
   ```bash
   npm run dev
   ```
   The backend will run on `http://localhost:5000`

2. **Start the frontend** (in a new terminal)
   ```bash
   npm start
   ```
   The frontend will run on `http://localhost:3000`

### Production Build

1. **Build the React app**
   ```bash
   npm run build
   ```

2. **Start the backend server**
   ```bash
   npm run dev
   ```

   The built files will be in the `build` directory and can be served statically.

## 📁 Project Structure

```
my-app/
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection configuration
│   ├── middleware/
│   │   └── auth.middleware.js    # Authentication middleware
│   ├── models/
│   │   ├── User.model.js         # User schema
│   │   ├── Tournament.model.js   # Tournament schema
│   │   ├── Match.model.js        # Match schema
│   │   ├── Team.model.js         # Team schema
│   │   ├── Participant.model.js  # Participant schema
│   │   ├── JoinRequest.model.js  # Join request schema
│   │   └── Score.model.js        # Score schema
│   ├── routes/
│   │   ├── auth.routes.js        # Authentication routes
│   │   ├── tournament.routes.js  # Tournament routes
│   │   ├── team.routes.js        # Team routes
│   │   ├── match.routes.js       # Match routes
│   │   ├── joinRequest.routes.js # Join request routes
│   │   ├── sport.routes.js       # Sport routes
│   │   ├── role.routes.js        # Role routes
│   │   └── shuffle.routes.js     # Utility routes
│   ├── scripts/
│   │   └── updateParticipantStatus.js
│   ├── passport.js               # Passport configuration
│   ├── server.js                 # Express server setup
│   └── generate-session-secret.js # Session secret generator
├── src/
│   ├── components/
│   │   ├── Home.jsx              # Home page
│   │   ├── CreateTournament.jsx  # Tournament creation
│   │   ├── EditTournament.jsx    # Tournament editing
│   │   ├── TournamentDetails.jsx # Tournament details view
│   │   ├── TournamentsOrganized.jsx
│   │   ├── TeamHub.jsx           # Team management
│   │   ├── MatchCenter.jsx       # Match management
│   │   ├── Messages.jsx          # Messages component
│   │   └── ProtectedRoute.js     # Route protection
│   ├── context/
│   │   └── AuthContext.js        # Authentication context
│   ├── dashboard/
│   │   ├── Dashboard.jsx         # User dashboard
│   │   └── EditProfile.js        # Profile editing
│   ├── login/
│   │   └── Login.jsx             # Login page
│   ├── logout/
│   │   └── Logout.jsx            # Logout handler
│   ├── utils/
│   │   └── api.js                # API utility functions
│   ├── App.js                    # Main App component
│   └── index.js                  # Entry point
├── public/                       # Static files
├── build/                        # Production build output
└── package.json                  # Dependencies and scripts
```

## 🔐 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SERVER_PORT` | Backend server port | Yes |
| `MONGO_URI` | MongoDB connection string | Yes |
| `SESSION_SECRET` | Secret for session encryption | Yes |
| `CLIENT_URL` | Frontend URL | Yes |
| `CLIENT_ID` | Google OAuth Client ID | Yes |
| `CLIENT_SECRET` | Google OAuth Client Secret | Yes |
| `NODE_ENV` | Environment (development/production) | No |

## 📝 Available Scripts

- `npm start` - Start the React development server
- `npm run dev` - Start the backend server with nodemon
- `npm run build` - Build the React app for production
- `npm test` - Run tests
- `node backend/generate-session-secret.js` - Generate a secure SESSION_SECRET

## 🔒 Security Notes

- Never commit your `.env` file to version control
- Use strong, randomly generated SESSION_SECRET values
- Keep your Google OAuth credentials secure
- Use HTTPS in production
- Regularly update dependencies for security patches

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running locally or your Atlas connection string is correct
- Check firewall settings if using MongoDB Atlas

### Google OAuth Not Working
- Verify redirect URI matches exactly: `http://localhost:5000/auth/google/callback`
- Ensure Google+ API is enabled in Google Cloud Console
- Check that CLIENT_ID and CLIENT_SECRET are correct in `.env`

### Session Issues
- Ensure SESSION_SECRET is set in `.env`
- Clear browser cookies if experiencing session problems
- Check that MongoDB session store is working correctly

## 📞 Support

For issues and questions, please open an issue on the GitHub repository.

---

**Built with ❤️ using the MERN Stack**

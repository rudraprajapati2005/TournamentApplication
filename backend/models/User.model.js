import mongoose from "mongoose";
import bcrypt from "bcrypt";

const { Schema, model } = mongoose;

const userSchema = new Schema({
  googleId: { type: String, unique: true, sparse: true,default:null }, // For Google users
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true ,sparse : true},
  password: { type: String }, // Only for local users
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    required: true,
    default: 'local',
  },
  role: {
    type: String,
    enum: ['admin', 'participant'],
    default: 'participant',
  },
  timestamp: { type: Date, default: Date.now },
  profilePic: { type: String, default: "" }, // URL or base64
  dob: { type: Date },
  gender: { type: String, enum: ["male", "female", "other", "prefer not to say"], default: "prefer not to say" },


  // Relationships
  participatedMatches: [{ type: Schema.Types.ObjectId, ref: 'Match' }],
  participatedTournaments: [{ type: Schema.Types.ObjectId, ref: 'Tournament' }],


  // Reference to all participations
  participations: [{ type: Schema.Types.ObjectId, ref: 'Participant' }]


});


// Pre-save hook: hash password only for local users
userSchema.pre('save', async function (next) {
  if (this.authProvider !== 'local') return next(); // Skip for Google users
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default model("User", userSchema);
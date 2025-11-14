// Node.js Script to Update Participant Statuses and Sync User Participations
// Run this script using: node backend/scripts/updateParticipantStatus.js
// Make sure your .env file has MONGO_URI set

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import Participant from '../models/Participant.model.js';
import Tournament from '../models/Tournament.model.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in environment variables');
  process.exit(1);
}

async function updateParticipantStatuses() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Step 0: Check current state
    console.log('=== Step 0: Checking current state ===\n');
    const totalParticipants = await Participant.countDocuments({});
    const totalUsers = await User.countDocuments({});
    const totalTournaments = await Tournament.countDocuments({});
    console.log(`Total Participants: ${totalParticipants}`);
    console.log(`Total Users: ${totalUsers}`);
    console.log(`Total Tournaments: ${totalTournaments}\n`);

    // Step 1: Update Participant statuses based on tournament winners
    console.log('=== Step 1: Updating Participant statuses for winners ===\n');
    
    const tournamentsWithWinners = await Tournament.find({
      winners: { $exists: true, $ne: [] }
    });

    console.log(`Found ${tournamentsWithWinners.length} tournaments with winners declared.\n`);

    let winnersUpdated = 0;
    let eliminatedUpdated = 0;

    for (const tournament of tournamentsWithWinners) {
      const tournamentId = tournament._id;
      const winners = tournament.winners || [];
      const winnerUserIds = winners.map(w => w.user?.toString() || w.user).filter(Boolean);
      
      console.log(`Processing tournament: ${tournament.name} (${tournamentId})`);
      console.log(`  Winners: ${winnerUserIds.length}`);
      
      // Update winners to 'winner' status
      if (winnerUserIds.length > 0) {
        const winnerResult = await Participant.updateMany(
          {
            tournament: tournamentId,
            user: { $in: winnerUserIds }
          },
          {
            $set: { status: 'winner' }
          }
        );
        winnersUpdated += winnerResult.modifiedCount;
        console.log(`  ✅ Updated ${winnerResult.modifiedCount} participants to 'winner' status`);
      }
      
      // Update other participants to 'eliminated' if tournament is completed
      if (tournament.status === 'completed') {
        const eliminatedResult = await Participant.updateMany(
          {
            tournament: tournamentId,
            user: { $nin: winnerUserIds },
            status: { $in: ['registered', 'active'] }
          },
          {
            $set: { status: 'eliminated' }
          }
        );
        eliminatedUpdated += eliminatedResult.modifiedCount;
        console.log(`  ✅ Updated ${eliminatedResult.modifiedCount} participants to 'eliminated' status`);
      }
      console.log('');
    }

    console.log(`Total winners updated: ${winnersUpdated}`);
    console.log(`Total eliminated updated: ${eliminatedUpdated}\n`);

    // Step 2: Sync user.participations arrays with actual Participant records
    console.log('=== Step 2: Syncing user.participations arrays ===\n');

    const allUsers = await User.find({});
    console.log(`Found ${allUsers.length} users to process.\n`);

    let usersSynced = 0;
    let totalParticipationsFound = 0;

    for (const user of allUsers) {
      const userId = user._id;
      
      // Find all participations for this user
      const participations = await Participant.find({ user: userId });
      const participationIds = participations.map(p => p._id);
      totalParticipationsFound += participations.length;
      
      if (participations.length > 0) {
        console.log(`  User: ${user.name || user.email} has ${participations.length} participations`);
        participations.forEach(p => {
          console.log(`    - Tournament: ${p.tournament}, Status: ${p.status}`);
        });
      }
      
      // Update user's participations array
      const result = await User.updateOne(
        { _id: userId },
        {
          $set: { participations: participationIds }
        }
      );
      
      if (result.modifiedCount > 0 || participations.length > 0) {
        usersSynced++;
        console.log(`  ✅ Synced participations for user: ${user.name || user.email} (${participationIds.length} participations)`);
      }
    }

    console.log(`\nTotal participations found: ${totalParticipationsFound}`);
    console.log(`Total users synced: ${usersSynced}\n`);

    // Step 3: Update participatedTournaments arrays
    console.log('=== Step 3: Syncing user.participatedTournaments arrays ===\n');

    let tournamentsSynced = 0;

    for (const user of allUsers) {
      const userId = user._id;
      
      // Find all unique tournament IDs for this user
      const participations = await Participant.find({ user: userId });
      const tournamentIds = [...new Set(participations.map(p => p.tournament.toString()))];
      
      // Convert back to ObjectId
      const tournamentObjectIds = tournamentIds.map(id => new mongoose.Types.ObjectId(id));
      
      // Update user's participatedTournaments array
      const result = await User.updateOne(
        { _id: userId },
        {
          $set: { participatedTournaments: tournamentObjectIds }
        }
      );
      
      if (result.modifiedCount > 0) {
        tournamentsSynced++;
        console.log(`  ✅ Synced tournaments for user: ${user.name || user.email} (${tournamentIds.length} tournaments)`);
      }
    }

    console.log(`\nTotal users with tournaments synced: ${tournamentsSynced}\n`);

    // Step 4: Summary
    console.log('=== Summary ===');
    console.log(`Tournaments with winners processed: ${tournamentsWithWinners.length}`);
    console.log(`Participants updated to 'winner': ${winnersUpdated}`);
    console.log(`Participants updated to 'eliminated': ${eliminatedUpdated}`);
    console.log(`Users with participations synced: ${usersSynced}`);
    console.log(`Users with tournaments synced: ${tournamentsSynced}`);

    console.log('\n✅ Script completed successfully!');

  } catch (error) {
    console.error('❌ Error running script:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed.');
  }
}

// Run the script
updateParticipantStatuses()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });


// MongoDB Script to Update Participant Statuses and Sync User Participations
// Run this script using: mongosh <your-database-name> update_participant_status.js
// Or: mongo <your-database-name> update_participant_status.js

print("Starting participant status update script...");

// Step 1: Update Participant statuses based on tournament winners
print("\n=== Step 1: Updating Participant statuses for winners ===");

// Find all tournaments with winners declared
const tournamentsWithWinners = db.tournaments.find({
  "winners": { $exists: true, $ne: [] }
}).toArray();

print(`Found ${tournamentsWithWinners.length} tournaments with winners declared.`);

let winnersUpdated = 0;
let eliminatedUpdated = 0;

tournamentsWithWinners.forEach(tournament => {
  const tournamentId = tournament._id;
  const winners = tournament.winners || [];
  const winnerUserIds = winners.map(w => w.user);
  
  print(`\nProcessing tournament: ${tournament.name} (${tournamentId})`);
  print(`  Winners: ${winnerUserIds.length}`);
  
  // Update winners to 'winner' status
  if (winnerUserIds.length > 0) {
    const winnerResult = db.participants.updateMany(
      {
        tournament: tournamentId,
        user: { $in: winnerUserIds }
      },
      {
        $set: { status: 'winner' }
      }
    );
    winnersUpdated += winnerResult.modifiedCount;
    print(`  Updated ${winnerResult.modifiedCount} participants to 'winner' status`);
  }
  
  // Update other participants to 'eliminated' if tournament is completed
  if (tournament.status === 'completed') {
    const eliminatedResult = db.participants.updateMany(
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
    print(`  Updated ${eliminatedResult.modifiedCount} participants to 'eliminated' status`);
  }
});

print(`\nTotal winners updated: ${winnersUpdated}`);
print(`Total eliminated updated: ${eliminatedUpdated}`);

// Step 2: Sync user.participations arrays with actual Participant records
print("\n=== Step 2: Syncing user.participations arrays ===");

// Get all users
const allUsers = db.users.find({}).toArray();
print(`Found ${allUsers.length} users to process.`);

let usersSynced = 0;

allUsers.forEach(user => {
  const userId = user._id;
  
  // Find all participations for this user
  const participations = db.participants.find({ user: userId }).toArray();
  const participationIds = participations.map(p => p._id);
  
  // Update user's participations array
  const result = db.users.updateOne(
    { _id: userId },
    {
      $set: { participations: participationIds }
    }
  );
  
  if (result.modifiedCount > 0) {
    usersSynced++;
    print(`  Synced participations for user: ${user.name || user.email} (${participationIds.length} participations)`);
  }
});

print(`\nTotal users synced: ${usersSynced}`);

// Step 3: Update participatedTournaments arrays
print("\n=== Step 3: Syncing user.participatedTournaments arrays ===");

let tournamentsSynced = 0;

allUsers.forEach(user => {
  const userId = user._id;
  
  // Find all unique tournament IDs for this user
  const participations = db.participants.find({ user: userId }).toArray();
  const tournamentIds = [...new Set(participations.map(p => p.tournament.toString()))];
  
  // Convert back to ObjectId
  const tournamentObjectIds = tournamentIds.map(id => ObjectId(id));
  
  // Update user's participatedTournaments array
  const result = db.users.updateOne(
    { _id: userId },
    {
      $set: { participatedTournaments: tournamentObjectIds }
    }
  );
  
  if (result.modifiedCount > 0) {
    tournamentsSynced++;
    print(`  Synced tournaments for user: ${user.name || user.email} (${tournamentIds.length} tournaments)`);
  }
});

print(`\nTotal users with tournaments synced: ${tournamentsSynced}`);

// Step 4: Summary
print("\n=== Summary ===");
print(`Tournaments with winners processed: ${tournamentsWithWinners.length}`);
print(`Participants updated to 'winner': ${winnersUpdated}`);
print(`Participants updated to 'eliminated': ${eliminatedUpdated}`);
print(`Users with participations synced: ${usersSynced}`);
print(`Users with tournaments synced: ${tournamentsSynced}`);

print("\n✅ Script completed successfully!");


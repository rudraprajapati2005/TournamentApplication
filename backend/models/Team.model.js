import mongoose from "mongoose";

const { Schema, model } = mongoose;

const teamMemberSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['member', 'scorekeeper', 'analyst', 'assistant'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const teamSchema = new Schema({
    name: { type: String, required: true },
    tournament: { type: Schema.Types.ObjectId, ref: 'Tournament', required: true },
    leader: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [teamMemberSchema], default: [] },
    isOrganizing: { type: Boolean, default: false },
    isRegistered: { type: Boolean, default: false },
    isDisqualified: { type: Boolean, default: false },
    disqualifiedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

teamSchema.index({ tournament: 1, name: 1 }, { unique: true });
teamSchema.index({ leader: 1 });
teamSchema.index({ tournament: 1, leader: 1, isOrganizing: 1 });

teamSchema.set('timestamps', true);

export default model('Team', teamSchema);



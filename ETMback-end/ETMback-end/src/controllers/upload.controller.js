import mongoose from "mongoose";
import { Club, Team, Game, Tournament, Content, TournamentApplication, Protest, ViolationReport, Match } from "../models/index.js";
import { uploadFile } from "../services/storage.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ASSET_SCOPES } from "../utils/assetLocation.js";

async function uploadContext(req, scope) {
  const role = req.user.systemRole, admin = role === "Administrator";
  let entityId = req.query.entityId || (scope === "club" ? req.query.clubId : undefined);
  if (entityId && (typeof entityId !== "string" || !mongoose.isValidObjectId(entityId))) throw new ApiError(422, "Invalid upload entity ID");
  if (req.query.clubId && (typeof req.query.clubId !== "string" || !mongoose.isValidObjectId(req.query.clubId))) throw new ApiError(422, "Invalid club ID");
  if (req.query.assetName != null && (typeof req.query.assetName !== "string" || req.query.assetName.length > 200)) throw new ApiError(422, "Invalid asset name");
  let label = req.query.assetName, club;
  const requireRole = (...roles) => { if (!admin && !roles.includes(role)) throw new ApiError(403, "Forbidden"); };
  const managedClub = async (id) => {
    const found = id && await Club.findOne({ _id: id, ...(!admin ? { managerAccountIds: req.user._id } : {}) });
    if (!found) throw new ApiError(403, "Club is not managed by this account");
    return found;
  };
  const ownedTournament = async id => {
    const found = id && await Tournament.findOne({ _id: id, ...(!admin ? { organizerAccountId: req.user._id } : {}) });
    if (!found) throw new ApiError(403, "Tournament is not managed by this account");
    return found;
  };
  if (["club", "club-logo"].includes(scope)) {
    requireRole("ClubManager");
    if (entityId) { club = await managedClub(entityId); label = club.shortName || club.name; }
    else if (!admin || scope === "club") throw new ApiError(422, "Club ID is required");
  } else if (scope === "team") {
    requireRole("ClubManager");
    if (entityId) { const team = await Team.findById(entityId); if (!team) throw new ApiError(404, "Team not found"); await managedClub(team.clubId); label = team.tag || team.name; }
    else if (!admin) await managedClub(req.query.clubId);
  } else if (scope === "game" || scope.startsWith("content-")) {
    requireRole();
    if (entityId) { const doc = await (scope === "game" ? Game : Content).findById(entityId); if (!doc) throw new ApiError(404, "Upload entity not found"); label = doc.slug || doc.name || doc.title; }
  } else if (scope === "tournament") {
    requireRole("TournamentOrganizer");
    if (entityId) { const t = await ownedTournament(entityId); label = t.slug || t.name; }
  } else if (scope === "application") {
    requireRole("ClubManager");
    if (entityId) { const application = await TournamentApplication.findById(entityId); const team = application && await Team.findById(application.teamId); if (!team) throw new ApiError(404, "Application not found"); await managedClub(team.clubId); label = team.tag || team.name; }
  } else if (scope === "protest") {
    requireRole("ClubManager", "TournamentOrganizer");
    if (entityId) { const protest = await Protest.findById(entityId); if (!protest) throw new ApiError(404, "Protest not found"); if (role === "TournamentOrganizer") await ownedTournament(protest.tournamentId); else await managedClub(protest.clubId); label = "protest"; }
  } else if (scope === "match") {
    requireRole("TournamentOrganizer");
    if (entityId) { const match = await Match.findById(entityId); if (!match) throw new ApiError(404, "Match not found"); await ownedTournament(match.tournamentId); label = `round-${match.round}-match-${match.position}`; }
  } else if (scope === "report") {
    if(role!=="ClubManager")throw new ApiError(403,"Only club managers can upload match report evidence");
    if(entityId){const report = await ViolationReport.findOne({ _id: entityId,reporterId:req.user._id,targetType:"Match" });
    if (!report) throw new ApiError(403, "Report is not owned by this account"); label = "report";
    }
  }
  return { entityId, label, club };
}

export async function uploadAsset(req, res) {
  if (!req.file) throw new ApiError(422, "Multipart file field is required");
  const scope = req.query.scope || "document";
  if (typeof scope !== "string" || !Object.hasOwn(ASSET_SCOPES, scope) || scope === "verification") throw new ApiError(422, "Unknown upload scope");
  const { entityId, label, club } = await uploadContext(req, scope);
  const url = await uploadFile(req.file, { scope, accountId: req.user._id, entityId, label });
  if (scope === "avatar") { req.user.avatarUrl = url; await req.user.save(); }
  if (scope === "club" && club) { club.logoUrl = url; await club.save(); }
  res.status(201).json({ success: true, data: { url } });
}

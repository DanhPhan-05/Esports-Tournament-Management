import { Router } from "express";
import * as controller from "../controllers/prediction.controller.js";
import { authenticate, authorize } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(authenticate, authorize("Customer"));
router.get("/events", asyncHandler(controller.predictionEvents));
router.get("/me", asyncHandler(controller.myPredictions));
router.get("/leaderboard", asyncHandler(controller.leaderboard));
router.post("/", asyncHandler(controller.createPrediction));
router.put("/:id", asyncHandler(controller.updatePrediction));
router.delete("/:id", asyncHandler(controller.deletePrediction));

export default router;

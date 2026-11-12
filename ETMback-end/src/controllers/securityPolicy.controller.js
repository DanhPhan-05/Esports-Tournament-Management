import { SecurityPolicy } from "../models/index.js";
import { DEFAULT_POLICIES, getPolicy, validatePolicy } from "../services/securityPolicy.service.js";
import { requireText } from "../utils/input.js";

export async function listPolicies(req, res) {
  const current = Object.fromEntries(await Promise.all(Object.keys(DEFAULT_POLICIES).map(async (category) => [category, await getPolicy(category)])));
  const history = await SecurityPolicy.find(req.query.category ? { category: req.query.category } : {}).sort({ category: 1, version: -1 }).limit(100);
  res.json({ success: true, data: { current, history } });
}
export async function updatePolicy(req, res) {
  const category = req.params.category;
  const config = validatePolicy(category, req.body.config);
  const changeReason = requireText(req.body.changeReason);
  const previousConfig = await getPolicy(category);
  const latest = await SecurityPolicy.findOne({ category }).sort({ version: -1 });
  const item = await SecurityPolicy.create({ category, config, previousConfig, version: (latest?.version || 0) + 1, updatedBy: req.user._id, changeReason });
  res.status(201).json({ success: true, data: item });
}

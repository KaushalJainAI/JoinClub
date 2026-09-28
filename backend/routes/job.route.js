import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {postJob,getAdminJobs,getAllJobs,getJobById} from "../controllers/job.controller.js";
//import { singleUpload } from "../middlewares/mutler.js";

const router = express.Router();
router.route("/post").post(isAuthenticated,postJob);
router.route("/get").get(isAuthenticated,getAdminJobs);
router.route("/getAllJobs").get(getAllJobs);
router.route("/get/:id").get(getJobById);

export default router;

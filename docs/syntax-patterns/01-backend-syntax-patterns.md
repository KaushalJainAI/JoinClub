# Backend Syntax Patterns (Express + Mongoose)

## 1. Controller (async, envelope, early-return)
```js
export const getJobById = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate({ path: "applications" });
    if (!job) return res.status(404).json({ message: "Jobs not found.", success: false });
    return res.status(200).json({ job, success: true });
  } catch (error) { next(error); } // today: console.log — switch to next()
};
```

## 2. Auth controller (hash → sign → cookie)
```js
const hashed = await bcrypt.hash(password, 10);
const token = jwt.sign({ userId: user._id, role: user.role }, process.env.SECRET_KEY, { expiresIn: "1d" });
return res.status(200).cookie("token", token, { maxAge: 86400000, httpOnly: true, sameSite: "strict" })
  .json({ message: `Welcome back ${user.fullname}`, user, success: true });
```

## 3. Route wiring
```js
import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
const router = express.Router();
router.route("/post").post(isAuthenticated, postJob);
export default router;
// index.js
app.use("/api/v1/job", jobRoute);
```

## 4. Auth middleware
```js
import jwt from "jsonwebtoken";
const isAuthenticated = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "User not authenticated", status: false });
  const decode = await jwt.verify(token, process.env.SECRET_KEY);
  req.id = decode.userId; req.role = decode.role;
  next();
};
```

## 5. Upload (Multer memory → DataURI → Cloudinary)
```js
// middlewares/multer.js
import multer from "multer";
export const singleUpload = multer({ storage: multer.memoryStorage() }).single("file");
// controller
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";
const fileUri = getDataUri(req.file);
const cloud = await cloudinary.uploader.upload(fileUri.content);
```

## 6. Role gate (prefer middleware over inline)
```js
if (role !== "recruiter") return res.status(403).json({ message: "You are not recruiter", success: false });
```

## 7. Comma-string → array field
```js
requirements: req.body.requirements.split(",") // postJob
skillsArray = skills.split(",")                // UpdateProfile
```

## 8. asyncHandler wrapper (adopt)
```js
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
```

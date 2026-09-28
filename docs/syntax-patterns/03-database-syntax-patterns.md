# Database Syntax Patterns (Mongoose 8)

## 1. Schema with refs + timestamps
```js
import mongoose from "mongoose";
const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Application' }],
}, { timestamps: true });
export const Job = mongoose.model('Job', jobSchema);
```

## 2. Enum + default
```js
status: { type: String, enum: ['pending','accepted','rejected'], default: 'pending' }
role:   { type: String, enum: ['student','recruiter'], required: true }
```

## 3. Keyword search (regex, case-insensitive)
```js
const keyword = req.query.keyword || "";
const jobs = await Job.find({ $or: [
  { title: { $regex: keyword, $options: "i" } },
  { discription: { $regex: keyword, $options: "i" } }, // NOTE: field is 'discription' not 'description'
]}).populate({ path: "company" }).sort({ createdAt: -1 });
```

## 4. Deep populate (applications → job → company)
```js
await Application.find({ applicant: userId }).sort({ createdAt: -1 }).populate({
  path: 'job', options: { sort: { createdAt: -1 } },
  populate: { path: 'company', options: { sort: { createdAt: -1 } } },
});
```

## 5. Idempotent add-to-set + transaction (adopt)
```js
await Job.findByIdAndUpdate(jobId, { $addToSet: { applications: appId } }, { session });
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
```

## 6. Connect once, before listen (adopt)
```js
import mongoose from "mongoose";
const connectDB = async () => { await mongoose.connect(process.env.MONGO_URI); };
export default connectDB; // don't `await` at export; call once in index.js before app.listen
```

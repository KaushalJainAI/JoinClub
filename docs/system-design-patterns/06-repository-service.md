# 06 — Repository / Service Pattern (Proposed)

## Intent
Isolate Mongoose queries + transactions behind functions so controllers are HTTP-only and logic is testable.

## Why here
`applyJob` does find-check → create → push → save across two collections with no transaction and a race window. `getAppliedJobs`/`getApplicants` embed deep populate chains in controllers.

## Canonical example (to adopt)
```js
// services/application.service.js
import mongoose from 'mongoose';
export async function applyToJob({ jobId, userId }) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const exists = await Application.findOne({ job: jobId, applicant: userId }).session(session);
    if (exists) throw Object.assign(new Error('Already applied'), { status: 400 });
    const [app] = await Application.create([{ job: jobId, applicant: userId }], { session });
    await Job.findByIdAndUpdate(jobId, { $addToSet: { applications: app._id } }, { session });
    await session.commitTransaction();
    return app;
  } catch (e) { await session.abortTransaction(); throw e; }
  finally { session.endSession(); }
}
// controller becomes:
export const applyJob = asyncHandler(async (req, res) => {
  const app = await applyToJob({ jobId: req.params.id, userId: req.id });
  res.status(201).json({ success:true, message:'Job applied successfully.', application: app });
});
```
Pair with the unique index `{ job:1, applicant:1 }` (see `04-database-schema.md`) for true idempotency.

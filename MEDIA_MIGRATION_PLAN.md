# Media Migration Plan: Firebase Storage → MongoDB GridFS

## Context

**Current state:** Files are uploaded directly from the browser to Firebase Storage. Download URLs are stored in MySQL columns (`photo_url`, `evidence_url`). This requires Firebase Storage configuration, client-side credentials, and a 5GB storage limit tied to the Firebase plan.

**Target state:** Files are uploaded through Next.js API routes to MongoDB GridFS (using the existing `argos_mongo` container in docker-compose). MySQL stores `media_id` strings (MongoDB ObjectIds) instead of URLs. Files are served via `/api/media/view/[media_id]` and `/api/media/download/[media_id]`.

**Reference implementation:** Copied from Agriway frontend (`/src/app/api/media/`).

---

## Places where media is used/desired

| Location | MySQL Column | Current Behavior | Usage |
|----------|-------------|------------------|-------|
| Work Instruction Evidence | `work_instruction_evidence.photo_url` | Firebase URL | Upload/view/download/delete evidence files |
| Inspection Reports | `inspection_reports.photo_url` | Firebase URL | Report photo (stored but not actively used in UI) |
| Incidents/Defects | `incidents.evidence_url` | Firebase URL | Upload/view evidence images for defects |
| Report Description | `inspection_reports.description` | Rich text (HTML) | Could embed images via WYSIWYG editor |

**Client requirements (from CLAUDECTX):**
- Work Instructions: accept ALL file types (Excel, PDF, Word, images)
- Defects: image upload for evidence
- 5GB storage limit mentioned — GridFS on local Mongo removes this constraint

---

## Implementation Steps

### Step 1: MongoDB Client Utility
- Create `/ArgosFrontEnd/src/lib/db/mongoClient.ts`
- Singleton pattern with global caching (same as Agriway)
- Uses `MONGO_URI` env var
- Add `MONGO_URI` to `.env.local` and docker-compose

### Step 2: Media API Routes (from Agriway)
Create 4 Next.js API routes:
- `POST /api/media/upload` — upload file to GridFS, return `media_id`
- `GET /api/media/view/[media_id]` — stream file inline (images, PDFs)
- `GET /api/media/download/[media_id]` — stream file as attachment
- `POST /api/media/info` — batch get file metadata by IDs

### Step 3: Replace fileUpload.ts
- Rewrite to upload via `POST /api/media/upload` instead of Firebase Storage
- Keep same interface (`uploadFile`, `uploadMultipleFiles`, `deleteFile`)
- `uploadFile` now returns `media_id` string instead of URL
- `deleteFile` calls a new `DELETE /api/media/delete/[media_id]` endpoint
- Keep `getFileCategory`, `formatFileSize` unchanged

### Step 4: Update file-uploader.tsx
- `UploadedFile.url` becomes `media_id` — derive display URL from `/api/media/view/{media_id}`
- Image previews use `/api/media/view/{media_id}`
- Download button uses `/api/media/download/{media_id}`

### Step 5: Update WorkInstructionFiles.tsx
- On upload: save `media_id` to DB instead of Firebase URL
- On display: construct view URL from `media_id`
- On delete: call media delete API + DB delete

### Step 6: Update DefectsSection.tsx
- Same pattern: store `media_id`, display via `/api/media/view/`

### Step 7: Environment & Docker
- Add `MONGO_URI` to frontend `.env.local`: `mongodb://argos_user:argos_pass@localhost:27017`
- Add `MONGO_URI` to docker-compose frontend environment: `mongodb://argos_user:argos_pass@mongo:27017`
- Install `mongodb` npm package in frontend

### Step 8: Cleanup
- Remove Firebase Storage imports from `firebaseClient.ts`
- Remove `firebase/storage` dependency usage (keep firebase/auth)

---

## Files to create/modify

**New files:**
- `ArgosFrontEnd/src/lib/db/mongoClient.ts`
- `ArgosFrontEnd/src/app/api/media/upload/route.ts`
- `ArgosFrontEnd/src/app/api/media/view/[media_id]/route.ts`
- `ArgosFrontEnd/src/app/api/media/download/[media_id]/route.ts`
- `ArgosFrontEnd/src/app/api/media/info/route.ts`
- `ArgosFrontEnd/src/app/api/media/delete/[media_id]/route.ts`

**Modified files:**
- `ArgosFrontEnd/src/lib/storage/fileUpload.ts` — rewrite for GridFS
- `ArgosFrontEnd/src/components/ui/file-uploader.tsx` — use media_id URLs
- `ArgosFrontEnd/src/app/(protected)/instrucciones-trabajo/_components/WorkInstructionFiles.tsx`
- `ArgosFrontEnd/src/app/(protected)/detalles-inspeccion/_components/DefectsSection.tsx`
- `ArgosFrontEnd/src/lib/auth/firebaseClient.ts` — remove storage export
- `ArgosFrontEnd/.env.local` — add MONGO_URI
- `docker-compose.yml` — add MONGO_URI to frontend environment

**No MySQL schema changes needed** — columns already store TEXT, media_id strings fit fine.

from fastapi import APIRouter

from app.api.v1 import profiles, experience, resumes, jobs, cover_letters, ai, documents, import_linkedin, search

v1_router = APIRouter()

v1_router.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
v1_router.include_router(experience.router, prefix="/profiles/{profile_id}/experience", tags=["experience"])
v1_router.include_router(resumes.router, prefix="/profiles/{profile_id}/resumes", tags=["resumes"])
v1_router.include_router(jobs.router, prefix="/profiles/{profile_id}/jobs", tags=["jobs"])
v1_router.include_router(cover_letters.router, prefix="/cover-letters", tags=["cover-letters"])
v1_router.include_router(ai.router, prefix="/ai", tags=["ai"])
v1_router.include_router(documents.router, prefix="/documents", tags=["documents"])
v1_router.include_router(import_linkedin.router, prefix="/import", tags=["import"])
v1_router.include_router(search.router, prefix="/search", tags=["search"])

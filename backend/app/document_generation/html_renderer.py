"""Renders resume data to HTML using Jinja2 templates. Used for PDF export and live preview."""

import os
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)


def render_resume_html(resume, experiences: list, template_name: str = "classic") -> str:
    """Render resume to HTML string."""
    template_file = f"{template_name}.html"
    available = [f.stem for f in TEMPLATES_DIR.glob("*.html")]
    if template_name not in available:
        template_file = "classic.html"

    template = _env.get_template(template_file)
    profile = resume.profile

    # Build ordered experience list
    exp_map = {e.id: e for e in experiences}
    ordered_exp = [
        exp_map[eid]
        for eid in (resume.selected_experience_ids or [])
        if eid in exp_map
    ]

    return template.render(
        profile=profile,
        resume=resume,
        experiences=ordered_exp,
        sections_order=resume.sections_order or ["summary", "experience", "skills", "education"],
        sections_config=resume.sections_config or {},
        skills=resume.skills_selection or {},
    )


def render_cover_letter_html(cover_letter) -> str:
    """Render cover letter to HTML string."""
    template = _env.get_template("cover_letter.html")
    job = cover_letter.job_application
    profile = job.profile if job else None
    return template.render(cover_letter=cover_letter, job=job, profile=profile)

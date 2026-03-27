"""Renders resume data to HTML using Jinja2 templates. Used for PDF export and live preview."""

from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

TEMPLATES_DIR = Path(__file__).parent / "templates"

_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["html"]),
)

_FONT_STACKS = {
    "serif": "'Georgia', 'Times New Roman', serif",
    "sans": "'Arial', 'Helvetica Neue', sans-serif",
    "humanist": "'Calibri', 'Trebuchet MS', sans-serif",
    "mono": "'Courier New', monospace",
}

_SPACING = {
    "compact": {"line_height": "1.3", "section_margin": "10px"},
    "normal": {"line_height": "1.45", "section_margin": "14px"},
    "spacious": {"line_height": "1.65", "section_margin": "22px"},
}


def _build_style_overrides(style_config: dict) -> str:
    """Generate a <style> block that overrides template defaults from style_config."""
    if not style_config:
        return ""

    rules: list[str] = []
    accent = style_config.get("accent_color", "")
    font_key = style_config.get("font", "")
    spacing_key = style_config.get("spacing", "normal")
    name_size = style_config.get("name_size", 0)

    if font_key in _FONT_STACKS:
        rules.append(f"body {{ font-family: {_FONT_STACKS[font_key]} !important; }}")

    if accent:
        rules += [
            f".name {{ color: {accent} !important; }}",
            f".section-title {{ color: {accent} !important; border-color: {accent} !important; }}",
            f".exp-company {{ color: {accent} !important; }}",
            f"hr, .divider {{ border-top-color: {accent} !important; }}",
            f".header {{ background: {accent} !important; }}",
            f".skill-tag {{ color: {accent} !important; background: {accent}22 !important; border: 1px solid {accent}44 !important; }}",
        ]

    sp = _SPACING.get(spacing_key, _SPACING["normal"])
    rules.append(f"body {{ line-height: {sp['line_height']} !important; }}")
    rules.append(f".section-title {{ margin-top: {sp['section_margin']} !important; }}")

    if name_size:
        rules.append(f".name {{ font-size: {name_size}pt !important; }}")

    if not rules:
        return ""
    return "<style>\n/* style_config overrides */\n" + "\n".join(rules) + "\n</style>"


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

    html = template.render(
        profile=profile,
        resume=resume,
        experiences=ordered_exp,
        sections_order=resume.sections_order or ["summary", "experience", "skills", "education"],
        sections_config=resume.sections_config or {},
        skills=resume.skills_selection or {},
    )

    style_config = getattr(resume, "style_config", None) or {}
    overrides = _build_style_overrides(style_config)
    if overrides:
        html = html.replace("</head>", f"{overrides}\n</head>", 1)

    return html


def render_cover_letter_html(cover_letter) -> str:
    """Render cover letter to HTML string."""
    template = _env.get_template("cover_letter.html")
    job = cover_letter.job_application
    profile = job.profile if job else None
    return template.render(cover_letter=cover_letter, job=job, profile=profile)

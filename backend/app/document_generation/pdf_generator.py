"""Generate PDF documents via WeasyPrint (HTML→PDF)."""


def generate_pdf(resume, experiences: list, template_name: str, output_path: str) -> None:
    from weasyprint import HTML
    from app.document_generation.html_renderer import render_resume_html
    html_content = render_resume_html(resume, experiences, template_name)
    HTML(string=html_content).write_pdf(output_path)


def generate_cover_letter_pdf(cover_letter, output_path: str) -> None:
    from weasyprint import HTML
    from app.document_generation.html_renderer import render_cover_letter_html
    html_content = render_cover_letter_html(cover_letter)
    HTML(string=html_content).write_pdf(output_path)

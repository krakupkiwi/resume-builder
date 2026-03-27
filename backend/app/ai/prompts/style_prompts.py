"""Prompts for resume style suggestion and image analysis."""


def build_style_suggest_messages(role: str | None, industry: str | None) -> list[dict]:
    """Prompt the AI to suggest resume style presets for a given role/industry."""
    parts = []
    if role:
        parts.append(f"role: {role}")
    if industry:
        parts.append(f"industry: {industry}")
    context = ", ".join(parts) if parts else "general professional"

    return [
        {
            "role": "user",
            "content": (
                f"You are a professional resume designer. Suggest 6 visually distinct resume style presets "
                f"appropriate for a {context} position. Base your suggestions on current design conventions "
                f"and industry norms.\n\n"
                "Return ONLY a JSON array — no markdown fences, no explanation. Schema:\n"
                "[\n"
                "  {\n"
                '    "name": "Style Name",\n'
                '    "description": "One sentence describing the look and feel and why it suits this role",\n'
                '    "vibe": "formal|modern|creative|minimal|bold|elegant",\n'
                '    "template_name": "classic",\n'
                '    "accent_color": "#1a1a2e",\n'
                '    "font": "serif",\n'
                '    "spacing": "normal",\n'
                '    "name_size": 20\n'
                "  }\n"
                "]\n\n"
                "Rules:\n"
                "- template_name: 'classic' (centered header, serif), 'modern' (colored banner, sans), or 'minimal' (sparse)\n"
                "- font: 'serif' | 'sans' | 'humanist' | 'mono'\n"
                "- spacing: 'compact' | 'normal' | 'spacious'\n"
                "- name_size: integer between 16 and 28\n"
                "- accent_color: a specific hex color — no generic #333 or #000 for all; make each distinct\n"
                "- Include a mix of conservative, modern, and creative options\n"
                "- Colors must be professional and legible"
            ),
        }
    ]


def build_style_image_analysis_messages(image_b64: str, media_type: str) -> list[dict]:
    """Prompt the AI (vision model) to extract style properties from a resume image."""
    return [
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_b64,
                    },
                },
                {
                    "type": "text",
                    "text": (
                        "Analyze this resume image and extract its visual style. "
                        "Return ONLY a JSON object — no markdown fences, no explanation:\n\n"
                        "{\n"
                        '  "template_name": "classic|modern|minimal",\n'
                        '  "accent_color": "#hex",\n'
                        '  "font": "serif|sans|humanist|mono",\n'
                        '  "spacing": "compact|normal|spacious",\n'
                        '  "name_size": 20,\n'
                        '  "description": "One sentence describing what you see"\n'
                        "}\n\n"
                        "template_name guidelines:\n"
                        "- classic: name centered at top, section titles underlined or with horizontal rule\n"
                        "- modern: colored header band with name on it, left-bordered section titles\n"
                        "- minimal: very sparse, lots of white space, minimal decoration\n\n"
                        "Pick the accent_color from the dominant non-black ink color. "
                        "If the resume is purely black/grey, use '#1a1a2e'."
                    ),
                },
            ],
        }
    ]

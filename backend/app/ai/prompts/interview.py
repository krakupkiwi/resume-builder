def build_interview_start_messages(gap_item: dict, candidate_context: dict) -> list[dict]:
    """Start a branching discovery interview for a specific gap."""
    requirement = gap_item.get("requirement", "")
    evidence = gap_item.get("evidence", "")

    return [
        {
            "role": "user",
            "content": f"""I need your help surfacing experience I may have forgotten to include in my resume.

GAP IDENTIFIED: The job requires "{requirement}".
Current assessment: {evidence}

Please ask me a specific, open-ended question to discover whether I have relevant experience with this that isn't captured in my profile yet.

Rules:
- Ask only ONE question at a time
- Make it specific and easy to answer with concrete examples
- If I say I have no relevant experience, accept that gracefully and move on
- Never assume or suggest I have experience I haven't confirmed
- If I describe relevant experience, follow up to get: context, scope, measurable impact

Start with your first question.""",
        }
    ]


def build_interview_followup_messages(
    conversation_history: list[dict],
    candidate_response: str,
) -> list[dict]:
    """Continue the branching interview based on the candidate's response."""
    messages = list(conversation_history)
    messages.append({"role": "user", "content": candidate_response})
    messages.append({
        "role": "user",
        "content": """Based on my response above:
- If I described relevant experience: ask one focused follow-up question to get scope/impact details (e.g., team size, time saved, revenue impact, scale)
- If my experience is relevant but the details are complete: summarise what you've learned and propose a bullet point for my resume (mark it clearly as a DRAFT SUGGESTION)
- If I indicated no relevant experience: acknowledge it and indicate we can move to the next gap
- Never invent details I haven't provided

Respond naturally as part of our conversation.""",
    })
    return messages

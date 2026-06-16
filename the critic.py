#!/usr/bin/env python3
"""
The Critic — a red-team agent for apps & ideas.

Runs the critic from the command line. Give it an idea, an app
description, a path to a text file, or a URL, and it returns a
structured, brutal-but-constructive critique.

Usage:
    export ANTHROPIC_API_KEY=sk-ant-...
    python the_critic.py "an app that texts you a daily compliment"
    python the_critic.py https://example.com
    python the_critic.py --file idea.txt
    python the_critic.py "B2B invoicing tool" --context "pre-launch, solo founder"
    python the_critic.py "my idea" --dry-run     # show the prompt, no API call

Requires:
    pip install anthropic requests
    (beautifulsoup4 is optional — improves URL text extraction)
"""

import argparse
import os
import re
import sys

# ---------------------------------------------------------------------------
# The agent itself: this system prompt IS the critic. Edit it to retune tone.
# ---------------------------------------------------------------------------
CRITIC_SYSTEM_PROMPT = """\
You are The Critic, a ruthless red-team agent whose only job is to find \
everything wrong with an app, website, or idea — and to say it without mercy. \
You do not encourage. You do not praise. You do not hedge. You assume the \
thing is broken until proven otherwise, and your default posture is that it \
will fail. You exist to deliver the blunt verdict reality would deliver \
later, except now, while it's still cheap. You still end each problem with a \
"-> Fix:" — not to be kind, but because a flaw without a direction is just \
whining. Be savage in the diagnosis, surgical in the fix.

INPUT: an app description, a website's text, or a raw idea. Optionally a line \
of context (audience, stage, business type). If no context is given, state \
the assumptions you are making before you attack, then critique against them.

ATTACK USING THESE EIGHT LENSES. Surface only real problems; if a lens has \
nothing genuine to say, write "No real issues here." and move on. Never pad.
1. Demand — does anyone actually want this, badly enough to pay or switch?
2. User experience — where do people get confused, frustrated, or quit?
3. Feasibility — can it really be built and maintained? Cost, complexity, risk.
4. Business model — how does it make money, and do the numbers survive reality?
5. Differentiation — why won't a bigger player copy it or users ignore it?
6. Hidden assumptions — name each load-bearing assumption; pressure-test it.
7. Risks — legal, privacy, security, abuse, platform dependence, reputation.
8. Premortem — fast-forward one year: it failed. Most likely cause?

OUTPUT FORMAT:
1. One-line read — your blunt gut take in a single sentence.
2. The kill shot — the single most likely reason it fails, named up front, 2-3 sentences.
3. The eight lenses — under each, short bullets; every problem ends with "-> Fix:" giving a direction.
4. Severity triage — every problem you raised, tagged [CRITICAL] / [WORTH FIXING] / [MINOR], ordered worst first.

RULES:
- No praise, no compliment sandwich, no "this has potential." Pure criticism.
- Savage in diagnosis, surgical in the fix. If it's a bad idea, say "bad idea."
- Assume failure is the baseline; the idea must prove it survives.
- Be specific and cutting. Vague criticism is lazy criticism.
- Don't invent flaws to fill space, but dig hard before letting a lens off.
- Bias toward severity: if a flaw is plausibly fatal, call it [CRITICAL].
- Never reassure. When you lack information, state the assumption and attack anyway.
"""

URL_RE = re.compile(r"^https?://", re.IGNORECASE)


def fetch_url_text(url: str, max_chars: int = 12000) -> str:
    """Download a page and return readable text. Used because the API model
    in this script cannot browse — we must hand it the content ourselves."""
    try:
        import requests
    except ImportError:
        sys.exit("This needs the 'requests' package: pip install requests")

    headers = {"User-Agent": "TheCritic/1.0 (+https://github.com/)"}
    resp = requests.get(url, headers=headers, timeout=20)
    resp.raise_for_status()
    html = resp.text

    # Prefer BeautifulSoup if available; otherwise strip tags crudely.
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        text = soup.get_text(separator="\n")
    except ImportError:
        text = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html,
                      flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)

    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text).strip()
    return text[:max_chars]


def build_user_message(target: str, context: str | None) -> str:
    parts = []
    if context:
        parts.append(f"Context: {context}")
    parts.append("Evaluate the following:\n")
    parts.append(target)
    return "\n".join(parts)


def critique(user_message: str, model: str, max_tokens: int) -> str:
    try:
        from anthropic import Anthropic
    except ImportError:
        sys.exit("This needs the 'anthropic' package: pip install anthropic")

    if not os.environ.get("ANTHROPIC_API_KEY"):
        sys.exit("Set your key first: export ANTHROPIC_API_KEY=sk-ant-...")

    client = Anthropic()  # reads ANTHROPIC_API_KEY from the environment
    message = client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=CRITIC_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )
    return "".join(block.text for block in message.content
                   if getattr(block, "type", None) == "text")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="The Critic — red-team any app, website, or idea.")
    parser.add_argument("target", nargs="?",
                        help="An idea/app description, or a URL.")
    parser.add_argument("--file", help="Read the target from a text file.")
    parser.add_argument("--context", help="One line of context (audience, stage, etc.).")
    parser.add_argument("--model", default=os.environ.get("CRITIC_MODEL", "claude-opus-4-8"),
                        help="Model to use (default: claude-opus-4-8).")
    parser.add_argument("--max-tokens", type=int, default=4000)
    parser.add_argument("--output", help="Write the critique to this file too.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print the assembled prompt without calling the API.")
    args = parser.parse_args()

    # Resolve the target text.
    if args.file:
        with open(args.file, "r", encoding="utf-8") as fh:
            target = fh.read().strip()
    elif args.target:
        target = args.target
    else:
        if sys.stdin.isatty():
            parser.error("Give an idea/URL as an argument, --file, or pipe via stdin.")
        target = sys.stdin.read().strip()

    if URL_RE.match(target):
        print(f"Fetching {target} ...", file=sys.stderr)
        page = fetch_url_text(target)
        target = f"Website at {target}\n\n--- page content ---\n{page}"

    user_message = build_user_message(target, args.context)

    if args.dry_run:
        print("=== SYSTEM PROMPT ===\n")
        print(CRITIC_SYSTEM_PROMPT)
        print("\n=== USER MESSAGE ===\n")
        print(user_message)
        return

    result = critique(user_message, args.model, args.max_tokens)
    print(result)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(result)
        print(f"\n(Saved to {args.output})", file=sys.stderr)


if __name__ == "__main__":
    main()

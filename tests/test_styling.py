"""Tests verifying PLAN-styling.md criteria for Dusk journal redesign."""

import re
import subprocess
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
PUBLIC_INDEX = ROOT_DIR / "public" / "index.html"
SCSS_DIR = ROOT_DIR / "assets" / "scss"
BASELINE_IMPORTANT_COUNT = 105


def test_hugo_build():
    """Build exits 0 with no ERROR in output."""
    res = subprocess.run(
        ["hugo", "--gc", "--minify"],
        cwd=ROOT_DIR,
        capture_output=True,
        text=True,
    )
    combined = res.stdout + res.stderr
    assert res.returncode == 0, f"Hugo build failed:\n{combined}"
    assert "ERROR" not in combined, f"Hugo build reported ERROR:\n{combined}"


def test_public_html_anchors():
    """public/index.html contains id="hero", id="features", track-app-click, faqAccordion, Product Hunt badge."""
    assert PUBLIC_INDEX.exists(), "public/index.html does not exist; run hugo first."
    html = PUBLIC_INDEX.read_text(encoding="utf-8")

    assert re.search(r'id=["\']?hero["\']?', html), 'Missing id="hero" in public/index.html'
    assert re.search(r'id=["\']?features["\']?', html), 'Missing id="features" in public/index.html'
    assert "track-app-click" in html, 'Missing "track-app-click" in public/index.html'
    assert "faqAccordion" in html, 'Missing "faqAccordion" in public/index.html'
    assert (
        "producthunt-badge" in html or "producthunt" in html.lower()
    ), "Missing Product Hunt badge markup in public/index.html"


def test_compiled_css_tokens():
    """Compiled CSS contains the design tokens (--ink, --paper, --accent, etc.)."""
    assert PUBLIC_INDEX.exists(), "public/index.html does not exist; run hugo first."
    css_content = ""
    for css_file in (ROOT_DIR / "public").rglob("*.css"):
        css_content += css_file.read_text(encoding="utf-8") + "\n"

    # Hugo inlines stylesheet in public/index.html <style> tags
    html = PUBLIC_INDEX.read_text(encoding="utf-8")
    for match in re.finditer(r"<style[^>]*>(.*?)</style>", html, re.DOTALL | re.IGNORECASE):
        css_content += match.group(1) + "\n"

    required_tokens = [
        "--ink",
        "--paper",
        "--accent",
        "--indigo",
        "--calm",
        "--surface",
        "--text",
        "--muted",
    ]
    missing = [token for token in required_tokens if token not in css_content]
    assert not missing, f"Missing design tokens in compiled CSS: {missing}"


def test_scss_important_count():
    """Count of !important in assets/scss/ does not increase beyond baseline."""
    count = 0
    for p in SCSS_DIR.rglob("*.scss"):
        text = p.read_text(encoding="utf-8")
        count += len(re.findall(r"!important", text))

    assert count <= BASELINE_IMPORTANT_COUNT, (
        f"!important count ({count}) exceeded baseline ({BASELINE_IMPORTANT_COUNT})"
    )

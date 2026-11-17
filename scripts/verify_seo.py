import os
import sys
import re
import json
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

BASE_URL = "https://psychdiaryapp.com/"
PUBLIC_DIR = "public"

class HTMLChecker(HTMLParser):
    def __init__(self):
        super().__init__()
        self.titles = []
        self.in_title = False
        self.current_title = ""
        self.canonical = None
        self.images_missing_alt = []
        self.scripts_jsonld = []
        self.in_jsonld = False
        self.current_jsonld = ""

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        tag_lower = tag.lower()

        if tag_lower == "title":
            self.in_title = True
            self.current_title = ""
        elif tag_lower == "link":
            rel = attrs_dict.get("rel", "").lower()
            if rel == "canonical":
                self.canonical = attrs_dict.get("href")
        elif tag_lower == "img":
            if "alt" not in attrs_dict:
                src = attrs_dict.get("src", "<unknown>")
                self.images_missing_alt.append(src)
        elif tag_lower == "script":
            script_type = attrs_dict.get("type", "").lower()
            if script_type == "application/ld+json":
                self.in_jsonld = True
                self.current_jsonld = ""

    def handle_endtag(self, tag):
        tag_lower = tag.lower()
        if tag_lower == "title":
            self.in_title = False
            self.titles.append(self.current_title.strip())
        elif tag_lower == "script" and self.in_jsonld:
            self.in_jsonld = False
            self.scripts_jsonld.append(self.current_jsonld.strip())

    def handle_data(self, data):
        if self.in_title:
            self.current_title += data
        elif self.in_jsonld:
            self.current_jsonld += data

def verify_sitemap():
    sitemap_path = os.path.join(PUBLIC_DIR, "sitemap.xml")
    if not os.path.exists(sitemap_path):
        return ["public/sitemap.xml does not exist!"]

    errors = []
    try:
        tree = ET.parse(sitemap_path)
        root = tree.getroot()
        # Namespace handling: sitemaps typically have xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        namespaces = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = root.findall('.//ns:url/ns:loc', namespaces)
        if not urls:
            urls = root.findall('.//loc')

        if not urls:
            errors.append("No <loc> tags found in sitemap.xml")
        
        non_matching = 0
        total_urls = len(urls)
        for loc in urls:
            url_text = loc.text.strip() if loc.text else ""
            if not url_text.startswith(BASE_URL):
                errors.append(f"Sitemap URL '{url_text}' does not start with {BASE_URL}")
                non_matching += 1
                if non_matching >= 5:
                    errors.append("... (more non-matching URLs in sitemap)")
                    break

        print(f"Verified sitemap.xml: {total_urls} URLs checked.")
    except Exception as e:
        errors.append(f"Failed to parse sitemap.xml: {e}")

    return errors

def verify_legacy_posts():
    errors = []
    for i in range(1, 10):
        # Check post-X directory or html file
        path1 = os.path.join(PUBLIC_DIR, "blog", f"post-{i}")
        path2 = os.path.join(PUBLIC_DIR, "blog", f"post-{i}.html")
        if os.path.exists(path1) or os.path.exists(path2):
            errors.append(f"Legacy post-{i} found in public/blog/!")
    return errors

def verify_html_pages():
    errors = []
    total_html_files = 0
    pages_without_canonical = 0
    pages_with_bad_canonical = 0
    pages_with_wrong_title_count = 0
    pages_with_missing_alt = 0

    blog_posts_checked = 0
    blog_posts_with_valid_schema = 0

    for root, dirs, files in os.walk(PUBLIC_DIR):
        for file in files:
            if not file.endswith(".html"):
                continue

            filepath = os.path.join(root, file)
            rel_path = os.path.relpath(filepath, PUBLIC_DIR)
            total_html_files += 1

            try:
                with open(filepath, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
            except Exception as e:
                errors.append(f"Could not read {filepath}: {e}")
                continue

            parser = HTMLChecker()
            try:
                parser.feed(content)
            except Exception as e:
                errors.append(f"HTML parse error in {rel_path}: {e}")
                continue

            # a) Title check: exactly 1 title
            if len(parser.titles) != 1:
                errors.append(f"[{rel_path}] Found {len(parser.titles)} <title> tags: {parser.titles}")
                pages_with_wrong_title_count += 1
            else:
                title = parser.titles[0]
                if rel_path == "index.html":
                    if len(title) > 60:
                        errors.append(f"[index.html] Homepage title length is {len(title)} chars (> 60 chars): '{title}'")
                    else:
                        print(f"Homepage title ({len(title)} chars): '{title}'")

            # b) Canonical link check
            if not parser.canonical:
                errors.append(f"[{rel_path}] Missing <link rel=\"canonical\"> tag")
                pages_without_canonical += 1
            elif not parser.canonical.startswith(BASE_URL):
                errors.append(f"[{rel_path}] Canonical URL '{parser.canonical}' does not start with {BASE_URL}")
                pages_with_bad_canonical += 1

            # c) Image alt check
            if parser.images_missing_alt:
                errors.append(f"[{rel_path}] Images missing alt attribute: {parser.images_missing_alt}")
                pages_missing_alt += 1

            # d) JSON-LD schema verification
            # Check homepage schema
            if rel_path == "index.html":
                if not parser.scripts_jsonld:
                    errors.append("[index.html] No JSON-LD <script type=\"application/ld+json\"> found on homepage!")
                else:
                    found_org = False
                    found_app = False
                    for script in parser.scripts_jsonld:
                        try:
                            data = json.loads(script)
                            # Data could be a list, dict, or graph
                            items = []
                            if isinstance(data, list):
                                items = data
                            elif isinstance(data, dict):
                                if "@graph" in data:
                                    items = data["@graph"]
                                else:
                                    items = [data]

                            for item in items:
                                itype = item.get("@type", "")
                                if isinstance(itype, list):
                                    itypes = itype
                                else:
                                    itypes = [itype]
                                if "Organization" in itypes:
                                    found_org = True
                                if "SoftwareApplication" in itypes:
                                    found_app = True
                        except Exception as e:
                            errors.append(f"[index.html] Invalid JSON in JSON-LD script: {e}\nContent: {script[:100]}...")

                    if not found_org:
                        errors.append("[index.html] JSON-LD missing 'Organization' schema")
                    if not found_app:
                        errors.append("[index.html] JSON-LD missing 'SoftwareApplication' schema")
                    if found_org and found_app:
                        print("Homepage JSON-LD verified: Organization and SoftwareApplication present.")

            # Check blog post schema (single post pages, not list/category/page)
            if rel_path.startswith("blog/") and rel_path.endswith("/index.html") and rel_path != "blog/index.html" and not "/page/" in rel_path:
                blog_posts_checked += 1
                found_blog_posting = False
                for script in parser.scripts_jsonld:
                    try:
                        data = json.loads(script)
                        items = []
                        if isinstance(data, list):
                            items = data
                        elif isinstance(data, dict):
                            if "@graph" in data:
                                items = data["@graph"]
                            else:
                                items = [data]
                        for item in items:
                            itype = item.get("@type", "")
                            if itype == "BlogPosting" or (isinstance(itype, list) and "BlogPosting" in itype):
                                found_blog_posting = True
                    except Exception as e:
                        errors.append(f"[{rel_path}] Invalid JSON in JSON-LD script: {e}")

                if not found_blog_posting:
                    errors.append(f"[{rel_path}] Missing 'BlogPosting' JSON-LD schema")
                else:
                    blog_posts_with_valid_schema += 1

    print(f"HTML pages checked: {total_html_files}")
    print(f"Blog single posts verified with BlogPosting schema: {blog_posts_with_valid_schema}/{blog_posts_checked}")
    return errors

def main():
    print("=== Starting Comprehensive SEO & Build Verification ===")
    all_errors = []

    legacy_errs = verify_legacy_posts()
    all_errors.extend(legacy_errs)
    if legacy_errs:
        print(f"Legacy post errors: {len(legacy_errs)}")
    else:
        print("Legacy posts check PASSED (post-1 through post-9 not present).")

    sitemap_errs = verify_sitemap()
    all_errors.extend(sitemap_errs)
    if sitemap_errs:
        print(f"Sitemap errors: {len(sitemap_errs)}")
    else:
        print("Sitemap check PASSED (all URLs start with baseURL).")

    html_errs = verify_html_pages()
    all_errors.extend(html_errs)
    if html_errs:
        print(f"HTML page errors: {len(html_errs)}")
    else:
        print("HTML page checks PASSED (canonical, titles, alts, schemas).")

    print("======================================================")
    if all_errors:
        print(f"FAILED with {len(all_errors)} errors:")
        for err in all_errors[:20]:
            print(f" - {err}")
        if len(all_errors) > 20:
            print(f" ... and {len(all_errors) - 20} more errors.")
        sys.exit(1)
    else:
        print("ALL VERIFICATIONS PASSED CLEANLY!")
        sys.exit(0)

if __name__ == "__main__":
    main()

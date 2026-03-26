import re
from typing import Any
from datetime import datetime, timezone

import httpx


class ResearchService:
    ARXIV_API = "http://export.arxiv.org/api/query"
    SCHOLAR_SEARCH = "https://scholar.google.com/scholar"

    def __init__(self) -> None:
        self._cache: dict[str, dict] = {}

    async def search(self, query: str, max_results: int = 10) -> dict[str, Any]:
        cache_key = f"{query}:{max_results}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        results: list[dict] = []

        arxiv_results = await self._search_arxiv(query, max_results)
        results.extend(arxiv_results)

        web_results = await self._search_web(query, max_results)
        results.extend(web_results)

        results = self._prioritize(results)

        summary = self._summarize(results)

        output = {
            "query": query,
            "total_results": len(results),
            "results": results[:max_results],
            "summary": summary,
            "searched_at": datetime.now(timezone.utc).isoformat(),
            "sources": list({r.get("source", "unknown") for r in results}),
        }

        self._cache[cache_key] = output
        return output

    async def _search_arxiv(self, query: str, max_results: int = 5) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    self.ARXIV_API,
                    params={
                        "search_query": f"all:{query}",
                        "start": 0,
                        "max_results": max_results,
                        "sortBy": "relevance",
                    },
                )
                response.raise_for_status()
                return self._parse_arxiv_xml(response.text)
        except Exception:
            return []

    def _parse_arxiv_xml(self, xml_text: str) -> list[dict]:
        results = []
        entries = re.findall(r"<entry>(.*?)</entry>", xml_text, re.DOTALL)
        for entry in entries:
            title_match = re.search(r"<title>(.*?)</title>", entry, re.DOTALL)
            summary_match = re.search(r"<summary>(.*?)</summary>", entry, re.DOTALL)
            link_match = re.search(r'<id>(.*?)</id>', entry, re.DOTALL)
            published_match = re.search(r"<published>(.*?)</published>", entry)
            authors = re.findall(r"<name>(.*?)</name>", entry)

            if title_match:
                results.append({
                    "title": title_match.group(1).strip().replace("\n", " "),
                    "abstract": (summary_match.group(1).strip().replace("\n", " ")[:500]
                                 if summary_match else ""),
                    "url": link_match.group(1).strip() if link_match else "",
                    "published": published_match.group(1).strip() if published_match else "",
                    "authors": authors[:5],
                    "source": "arxiv",
                    "relevance_score": 0.9,
                })
        return results

    async def _search_web(self, query: str, max_results: int = 5) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.get(
                    "https://html.duckduckgo.com/html/",
                    params={"q": query},
                    headers={"User-Agent": "Mozilla/5.0 (compatible; ResearchBot/1.0)"},
                )
                response.raise_for_status()
                return self._parse_ddg_html(response.text, max_results)
        except Exception:
            return []

    def _parse_ddg_html(self, html: str, max_results: int) -> list[dict]:
        results = []
        snippets = re.findall(
            r'class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)</a>.*?'
            r'class="result__snippet"[^>]*>(.*?)</(?:td|div)',
            html, re.DOTALL,
        )
        for url, title, snippet in snippets[:max_results]:
            clean_title = re.sub(r"<[^>]+>", "", title).strip()
            clean_snippet = re.sub(r"<[^>]+>", "", snippet).strip()
            is_scientific = any(
                domain in url.lower()
                for domain in ["arxiv", "scholar", "pubmed", "ieee", "acm", "nature", "science"]
            )
            results.append({
                "title": clean_title,
                "abstract": clean_snippet[:500],
                "url": url,
                "source": "web",
                "relevance_score": 0.8 if is_scientific else 0.5,
            })
        return results

    def _prioritize(self, results: list[dict]) -> list[dict]:
        return sorted(results, key=lambda r: r.get("relevance_score", 0), reverse=True)

    def _summarize(self, results: list[dict]) -> str:
        if not results:
            return "No results found."
        titles = [r.get("title", "Untitled") for r in results[:5]]
        sources = list({r.get("source", "unknown") for r in results})
        return (
            f"Found {len(results)} results from {', '.join(sources)}. "
            f"Top results: {'; '.join(titles[:3])}."
        )


research_service = ResearchService()

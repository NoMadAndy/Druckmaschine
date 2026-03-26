import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.changelog import ChangelogEntry


CONVENTIONAL_PATTERN = re.compile(
    r"^(?P<type>feat|fix|docs|style|refactor|perf|test|chore|build|ci|revert)"
    r"(?:\((?P<scope>[^)]+)\))?"
    r"(?P<breaking>!)?"
    r":\s*(?P<description>.+)$",
    re.MULTILINE,
)

TYPE_LABELS = {
    "feat": "Features",
    "fix": "Bug Fixes",
    "docs": "Documentation",
    "style": "Style",
    "refactor": "Refactoring",
    "perf": "Performance",
    "test": "Tests",
    "chore": "Chores",
    "build": "Build",
    "ci": "CI/CD",
    "revert": "Reverts",
}


class ChangelogService:
    def __init__(self, repo_path: str = ".") -> None:
        self._repo_path = repo_path

    def parse_conventional_commit(self, message: str) -> dict[str, Any] | None:
        match = CONVENTIONAL_PATTERN.match(message.strip().split("\n")[0])
        if not match:
            return None
        return {
            "type": match.group("type"),
            "scope": match.group("scope") or "",
            "breaking": bool(match.group("breaking")),
            "description": match.group("description").strip(),
            "category": TYPE_LABELS.get(match.group("type"), "Other"),
        }

    def _get_git_commits(self, since_tag: str | None = None, max_count: int = 100) -> list[dict]:
        try:
            import git
            repo = git.Repo(self._repo_path, search_parent_directories=True)
        except Exception:
            return []

        commits = []
        try:
            if since_tag:
                try:
                    tag_commit = repo.tags[since_tag].commit
                    commit_list = list(repo.iter_commits(f"{tag_commit.hexsha}..HEAD", max_count=max_count))
                except (IndexError, KeyError):
                    commit_list = list(repo.iter_commits(max_count=max_count))
            else:
                commit_list = list(repo.iter_commits(max_count=max_count))

            for c in commit_list:
                parsed = self.parse_conventional_commit(c.message)
                commits.append({
                    "hash": c.hexsha[:8],
                    "message": c.message.strip().split("\n")[0],
                    "author": str(c.author),
                    "date": datetime.fromtimestamp(c.committed_date, tz=timezone.utc).isoformat(),
                    "parsed": parsed,
                })
        except Exception:
            pass

        return commits

    def _determine_version_bump(self, commits: list[dict]) -> str:
        has_breaking = False
        has_feat = False
        for c in commits:
            parsed = c.get("parsed")
            if parsed:
                if parsed.get("breaking"):
                    has_breaking = True
                if parsed.get("type") == "feat":
                    has_feat = True

        if has_breaking:
            return "major"
        elif has_feat:
            return "minor"
        return "patch"

    def _bump_version(self, current: str, bump: str) -> str:
        parts = current.lstrip("v").split(".")
        while len(parts) < 3:
            parts.append("0")
        major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])

        if bump == "major":
            return f"{major + 1}.0.0"
        elif bump == "minor":
            return f"{major}.{minor + 1}.0"
        else:
            return f"{major}.{minor}.{patch + 1}"

    def _group_changes(self, commits: list[dict]) -> list[str]:
        grouped: dict[str, list[str]] = {}
        ungrouped: list[str] = []

        for c in commits:
            parsed = c.get("parsed")
            if parsed:
                category = parsed["category"]
                scope = f"**{parsed['scope']}**: " if parsed.get("scope") else ""
                breaking = "BREAKING: " if parsed.get("breaking") else ""
                entry = f"{breaking}{scope}{parsed['description']} ({c['hash']})"
                grouped.setdefault(category, []).append(entry)
            else:
                ungrouped.append(f"{c['message']} ({c['hash']})")

        changes = []
        for category, entries in sorted(grouped.items()):
            changes.append(f"### {category}")
            for entry in entries:
                changes.append(f"- {entry}")

        if ungrouped:
            changes.append("### Other")
            for entry in ungrouped:
                changes.append(f"- {entry}")

        return changes

    async def detect_and_create(
        self, db: AsyncSession, since_tag: str | None = None
    ) -> list[ChangelogEntry]:
        commits = self._get_git_commits(since_tag)
        if not commits:
            return []

        last_entry = await db.execute(
            select(ChangelogEntry).order_by(ChangelogEntry.created_at.desc()).limit(1)
        )
        last = last_entry.scalar_one_or_none()
        current_version = last.version if last else "0.0.0"

        bump = self._determine_version_bump(commits)
        new_version = self._bump_version(current_version, bump)
        changes = self._group_changes(commits)

        feat_count = sum(1 for c in commits if c.get("parsed", {}) and c["parsed"].get("type") == "feat")
        fix_count = sum(1 for c in commits if c.get("parsed", {}) and c["parsed"].get("type") == "fix")

        title_parts = []
        if feat_count:
            title_parts.append(f"{feat_count} new feature{'s' if feat_count > 1 else ''}")
        if fix_count:
            title_parts.append(f"{fix_count} bug fix{'es' if fix_count > 1 else ''}")
        if not title_parts:
            title_parts.append(f"{len(commits)} changes")
        title = f"v{new_version}: {', '.join(title_parts)}"

        authors = list({c.get("author", "unknown") for c in commits})

        entry = ChangelogEntry(
            version=new_version,
            title=title,
            description=f"Auto-generated changelog from {len(commits)} commits",
            changes=changes,
            author=", ".join(authors[:5]),
        )
        db.add(entry)
        await db.flush()
        await db.refresh(entry)
        return [entry]


changelog_service = ChangelogService()

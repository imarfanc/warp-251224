"""Shared port list parsing for seminar listener scripts."""
import re


def parse_ports_list(text: str) -> list[int]:
    if not text or not str(text).strip():
        return []

    ports: list[int] = []
    seen: set[int] = set()
    for part in re.split(r"[\s,]+", str(text).strip()):
        if not part:
            continue
        try:
            port = int(part, 10)
        except ValueError as e:
            raise ValueError(f"Invalid port: {part!r}") from e
        if not 1 <= port <= 65535:
            raise ValueError(f"Port out of range: {port}")
        if port not in seen:
            seen.add(port)
            ports.append(port)
    return ports

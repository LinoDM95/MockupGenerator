"""Redact secrets from log records (OWASP A02)."""

from __future__ import annotations

import logging
import re


class SecretRedactingFilter(logging.Filter):
    _PATTERNS = (
        re.compile(r"AIza[0-9A-Za-z_\-]{30,}"),
        re.compile(r"sk-[A-Za-z0-9]{20,}"),
        re.compile(r"Bearer\s+[A-Za-z0-9._\-]{20,}"),
    )

    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        for p in self._PATTERNS:
            msg = p.sub("[REDACTED]", msg)
        record.msg = msg
        record.args = ()
        return True

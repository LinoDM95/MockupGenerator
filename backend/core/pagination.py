"""DRF-Pagination — Standard für Listen-Endpoints."""

from __future__ import annotations

from rest_framework.pagination import LimitOffsetPagination


class StandardLimitOffsetPagination(LimitOffsetPagination):
    """Kleine Default-Page, hohes max_limit damit Clients alle Sets in wenigen Calls holen können."""

    default_limit = 25
    max_limit = 200

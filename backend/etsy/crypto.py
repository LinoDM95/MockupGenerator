"""Backward-compatible re-export from shared crypto module."""

from core.crypto import decrypt_token, encrypt_token

__all__ = ["encrypt_token", "decrypt_token"]

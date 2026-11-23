"""其他小结构。"""

from __future__ import annotations

from pydantic import BaseModel, Field


class TextRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class AuditionRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class RenameRequest(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class RenameTitleRequest(BaseModel):
    title: str = Field(min_length=1, max_length=120)

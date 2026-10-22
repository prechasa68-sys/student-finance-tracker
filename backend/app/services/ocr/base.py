from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class OcrResult:
    text: str
    provider: str
    success: bool
    error: str | None = None


class OcrProvider(ABC):
    name: str

    @abstractmethod
    def extract_text(self, image_bytes: bytes, content_type: str) -> OcrResult:
        raise NotImplementedError

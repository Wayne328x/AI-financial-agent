import PyPDF2


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from a PDF file using PyPDF2."""
    with open(file_path, "rb") as file:
        pdf_reader = PyPDF2.PdfReader(file)
        parts: list[str] = []
        for page in pdf_reader.pages:
            # Some pages may not have extractable text and return None.
            parts.append(page.extract_text() or "")
    return "".join(parts)

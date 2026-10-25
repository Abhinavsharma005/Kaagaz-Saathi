import io
import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Dict, Any, Optional
import logging

logger = logging.getLogger("kaagaz-saathi.preprocess")


def bytes_to_numpy(data_bytes: bytes) -> np.ndarray:
    """
    Converts image or document bytes to OpenCV BGR numpy array.
    Supports:
    - PDF documents (renders first page at 2x resolution via pypdfium2)
    - JPEG, PNG, WEBP, BMP, TIFF (via OpenCV and PIL with EXIF auto-rotation)
    """
    if not data_bytes:
        raise ValueError("Empty data buffer received")

    # 1. Handle PDF files
    if data_bytes.startswith(b"%PDF"):
        try:
            import pypdfium2 as pdfium
            pdf = pdfium.PdfDocument(io.BytesIO(data_bytes))
            if len(pdf) == 0:
                raise ValueError("PDF document has 0 pages")
            page = pdf[0]
            # Render at 2.0 scale (~144-150 DPI) for sharp OCR text
            pil_img = page.render(scale=2.0).to_pil()
            rgb_arr = np.array(pil_img.convert("RGB"))
            return cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)
        except Exception as e:
            logger.error(f"Failed to render PDF: {e}")
            raise ValueError(f"Could not render PDF document: {e}")

    # 2. Try OpenCV imdecode
    nparr = np.frombuffer(data_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is not None:
        return img

    # 3. Fallback to PIL (handles WebP, TIFF, BMP, and corrects EXIF phone orientation)
    try:
        from PIL import ImageOps
        pil_img = Image.open(io.BytesIO(data_bytes))
        pil_img = ImageOps.exif_transpose(pil_img)  # Auto-rotates smartphone camera photos
        rgb_arr = np.array(pil_img.convert("RGB"))
        return cv2.cvtColor(rgb_arr, cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise ValueError(f"Could not decode image bytes: {e}")


def numpy_to_bytes(img: np.ndarray, ext: str = ".jpg") -> bytes:
    """Encodes OpenCV image numpy array to bytes."""
    success, encoded_img = cv2.imencode(ext, img)
    if not success:
        raise ValueError("Failed to encode OpenCV matrix into image bytes")
    return encoded_img.tobytes()


def to_grayscale(img: np.ndarray) -> np.ndarray:
    """Converts 3-channel BGR image to single-channel grayscale."""
    if len(img.shape) == 2:
        return img
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def denoise(gray_img: np.ndarray) -> np.ndarray:
    """Applies Gaussian and Bilateral filtering to reduce noise while preserving text edges."""
    blurred = cv2.GaussianBlur(gray_img, (3, 3), 0)
    return blurred


def deskew(gray_img: np.ndarray) -> Tuple[np.ndarray, float]:
    """
    Calculates text skew angle and straightens the image.
    Uses minimum bounding area rectangle on thresholded text pixels.
    """
    # Invert binary threshold to get text as white pixels
    thresh = cv2.threshold(gray_img, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    coords = np.column_stack(np.where(thresh > 0))
    if len(coords) < 50:
        return gray_img, 0.0

    angle = cv2.minAreaRect(coords)[-1]
    # Correct OpenCV angle coordinates
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle

    # Small angles only (ignore vertical orientations)
    if abs(angle) > 25.0:
        return gray_img, 0.0

    (h, w) = gray_img.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        gray_img, M, (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE
    )
    return rotated, angle


def adaptive_threshold(gray_img: np.ndarray) -> np.ndarray:
    """Applies adaptive Gaussian thresholding optimized for scanned receipts and documents."""
    return cv2.adaptiveThreshold(
        gray_img,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        15,
        8
    )


def detect_blur(gray_img: np.ndarray, threshold: float = 30.0) -> Tuple[float, bool]:
    """
    Computes variance of the Laplacian to estimate image blur.
    Low variance (< threshold) indicates heavy blur or defocus.
    """
    variance = cv2.Laplacian(gray_img, cv2.CV_64F).var()
    is_blurry = variance < threshold
    return float(variance), bool(is_blurry)


def preprocess_document_image(image_bytes: bytes) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Full OpenCV preprocessing pipeline:
    1. Decode
    2. Convert to Grayscale
    3. Blur & Quality assessment
    4. Denoise
    5. Deskew
    6. Adaptive threshold for high-contrast OCR
    """
    img = bytes_to_numpy(image_bytes)
    h, w = img.shape[:2]

    # Resize if extremely large to prevent OOM
    max_dim = 2000
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)

    gray = to_grayscale(img)
    blur_score, is_blurry = detect_blur(gray)
    denoised = denoise(gray)
    straightened, skew_angle = deskew(denoised)
    binary = adaptive_threshold(straightened)

    metadata = {
        "original_dimensions": (w, h),
        "skew_angle": round(skew_angle, 2),
        "blur_score": round(blur_score, 2),
        "is_blurry": is_blurry,
        "processed_shape": binary.shape
    }

    return binary, metadata

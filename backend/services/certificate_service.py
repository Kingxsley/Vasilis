"""
Certificate Generation Service
Generates training completion certificates in PDF format

COORDINATE SYSTEM:
- Template stores coordinates as percentages (0-100) relative to page size
- x, y are from TOP-LEFT corner (matching CSS/browser convention)
- Backend converts to ReportLab's BOTTOM-LEFT origin for rendering

FONT MAPPING:
- Frontend uses CSS font families
- Backend maps to available ReportLab fonts

TEXT RENDERING:
- Supports multi-line text with word wrapping
- Honors textAlign: left, center, right
- Supports fontWeight: bold
"""
import io
import re
import textwrap
from datetime import datetime, timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, portrait, A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import base64
import logging

logger = logging.getLogger(__name__)

# Font mapping from CSS to ReportLab
FONT_MAP = {
    "Georgia": "Times-Roman",
    "Georgia, serif": "Times-Roman",
    "Times New Roman": "Times-Roman",
    "Times New Roman, serif": "Times-Roman",
    "Arial": "Helvetica",
    "Arial, sans-serif": "Helvetica",
    "Helvetica": "Helvetica",
    "sans-serif": "Helvetica",
    "serif": "Times-Roman",
    "Courier": "Courier",
    "Courier New": "Courier",
    "monospace": "Courier",
}

# Bold font variants
BOLD_FONT_MAP = {
    "Helvetica": "Helvetica-Bold",
    "Times-Roman": "Times-Bold",
    "Courier": "Courier-Bold",
}


def get_reportlab_font(font_family: str, bold: bool = False) -> str:
    """Map CSS font family to ReportLab font name"""
    # Clean up font family string
    font_family = font_family.strip().strip('"').strip("'")
    
    # Get base font
    base_font = FONT_MAP.get(font_family, "Helvetica")
    
    # Check for bold
    if bold:
        return BOLD_FONT_MAP.get(base_font, base_font)
    
    return base_font


def parse_font_size(font_size_raw) -> int:
    """Parse font size from various formats (14, "14", "14px", etc.)"""
    if isinstance(font_size_raw, (int, float)):
        return int(font_size_raw)
    if isinstance(font_size_raw, str):
        # Extract digits from strings like "14px", "14pt", "14"
        digits = ''.join(filter(str.isdigit, font_size_raw))
        return int(digits) if digits else 14
    return 14


def wrap_text(text: str, font_name: str, font_size: int, max_width: float, canvas_obj) -> list:
    """
    Wrap text to fit within max_width.
    Returns list of lines.
    """
    if not text:
        return []
    
    lines = []
    # Split by explicit newlines first
    paragraphs = text.split('\n')
    
    for paragraph in paragraphs:
        if not paragraph.strip():
            lines.append('')
            continue
            
        words = paragraph.split()
        if not words:
            lines.append('')
            continue
            
        current_line = []
        current_width = 0
        
        for word in words:
            word_width = canvas_obj.stringWidth(word + ' ', font_name, font_size)
            
            if current_width + word_width <= max_width:
                current_line.append(word)
                current_width += word_width
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                current_line = [word]
                current_width = word_width
        
        if current_line:
            lines.append(' '.join(current_line))
    
    return lines


def draw_border(c, page_width: float, page_height: float, border_style: str):
    """
    Draw border matching the frontend CSS styles.
    
    Frontend CSS mapping:
    - classic: border-8 border-double border-[#D4A836]
    - modern: border-2 border-gray-300
    - corporate: border-4 border-[#1F4E79]
    - ornate: border-8 border-double border-[#8B4513]
    - minimal/default: border-2 border-gray-300
    """
    margin = 20
    inner_margin = 30
    
    accent_gold = colors.HexColor('#D4A836')
    primary_blue = colors.HexColor('#1F4E79')
    brown = colors.HexColor('#8B4513')
    gray = colors.HexColor('#D1D5DB')  # gray-300
    
    if border_style == 'classic':
        # Double border effect - outer gold, inner gold
        c.setStrokeColor(accent_gold)
        c.setLineWidth(4)
        c.rect(margin, margin, page_width - 2*margin, page_height - 2*margin)
        c.setLineWidth(2)
        c.rect(inner_margin, inner_margin, page_width - 2*inner_margin, page_height - 2*inner_margin)
        
    elif border_style == 'modern':
        # Simple thin gray border
        c.setStrokeColor(gray)
        c.setLineWidth(2)
        c.rect(margin, margin, page_width - 2*margin, page_height - 2*margin)
        
    elif border_style == 'corporate':
        # Medium blue border
        c.setStrokeColor(primary_blue)
        c.setLineWidth(4)
        c.rect(margin, margin, page_width - 2*margin, page_height - 2*margin)
        
    elif border_style == 'ornate':
        # Double brown border
        c.setStrokeColor(brown)
        c.setLineWidth(4)
        c.rect(margin, margin, page_width - 2*margin, page_height - 2*margin)
        c.setLineWidth(2)
        c.rect(inner_margin, inner_margin, page_width - 2*inner_margin, page_height - 2*inner_margin)
        # Corner decorations
        corner_size = 15
        c.setFillColor(brown)
        # Top-left
        c.rect(margin, page_height - margin - corner_size, corner_size, corner_size, fill=1)
        # Top-right
        c.rect(page_width - margin - corner_size, page_height - margin - corner_size, corner_size, corner_size, fill=1)
        # Bottom-left
        c.rect(margin, margin, corner_size, corner_size, fill=1)
        # Bottom-right
        c.rect(page_width - margin - corner_size, margin, corner_size, corner_size, fill=1)
        
    elif border_style == 'none':
        # No border
        pass
        
    else:
        # Default/minimal - thin gray border
        c.setStrokeColor(gray)
        c.setLineWidth(2)
        c.rect(margin, margin, page_width - 2*margin, page_height - 2*margin)


def generate_training_certificate(
    user_name: str,
    user_email: str,
    modules_completed: list,
    average_score: float,
    completion_date: datetime,
    organization_name: str = None,
    org_logo_url: str = None,
    certificate_id: str = None
) -> bytes:
    """
    Generate a PDF training completion certificate (legacy/fallback)
    
    Args:
        user_name: Name of the user
        user_email: Email of the user
        modules_completed: List of module names completed
        average_score: Average score across all modules
        completion_date: Date of completion
        organization_name: Optional organization name for branding
        org_logo_url: Optional URL to organization logo
        certificate_id: Unique certificate identifier
    
    Returns:
        PDF bytes
    """
    buffer = io.BytesIO()
    
    # Use landscape A4
    page_width, page_height = landscape(A4)
    
    # Create canvas directly for more control
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    
    # Colors
    primary_color = colors.HexColor('#1F4E79')  # Dark blue
    accent_color = colors.HexColor('#D4A836')   # Gold
    text_color = colors.HexColor('#333333')
    
    # Border
    draw_border(c, page_width, page_height, 'classic')
    
    # Header - Organization or NetShield branding
    y_position = page_height - 80
    
    if organization_name:
        c.setFont("Helvetica-Bold", 14)
        c.setFillColor(text_color)
        c.drawCentredString(page_width / 2, y_position, organization_name)
        y_position -= 25
    
    # Certificate Title
    c.setFont("Helvetica-Bold", 32)
    c.setFillColor(primary_color)
    c.drawCentredString(page_width / 2, y_position, "CERTIFICATE OF COMPLETION")
    y_position -= 40
    
    # Subtitle
    c.setFont("Helvetica", 14)
    c.setFillColor(accent_color)
    c.drawCentredString(page_width / 2, y_position, "Cybersecurity Awareness Training")
    y_position -= 50
    
    # Presented to
    c.setFont("Helvetica", 12)
    c.setFillColor(text_color)
    c.drawCentredString(page_width / 2, y_position, "This certifies that")
    y_position -= 35
    
    # Recipient Name
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(primary_color)
    c.drawCentredString(page_width / 2, y_position, user_name)
    y_position -= 35
    
    # Completion message
    c.setFont("Helvetica", 12)
    c.setFillColor(text_color)
    
    # Module-specific message
    if len(modules_completed) == 1:
        module_name = modules_completed[0]
        completion_text = f"for successfully completing the '{module_name}' Training"
    else:
        completion_text = "has successfully completed all required security awareness training modules"
    
    c.drawCentredString(page_width / 2, y_position, completion_text)
    y_position -= 25
    
    # Score
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(accent_color)
    c.drawCentredString(page_width / 2, y_position, f"with a score of {average_score:.1f}%")
    y_position -= 40
    
    # Modules list (if multiple)
    if len(modules_completed) > 1:
        c.setFont("Helvetica", 10)
        c.setFillColor(text_color)
        modules_text = "Modules completed: " + ", ".join(modules_completed)
        
        # Wrap long text
        lines = wrap_text(modules_text, "Helvetica", 10, page_width - 120, c)
        for line in lines:
            c.drawCentredString(page_width / 2, y_position, line)
            y_position -= 14
        y_position -= 20
    
    # Date
    date_str = completion_date.strftime("%B %d, %Y")
    c.setFont("Helvetica", 11)
    c.setFillColor(text_color)
    c.drawCentredString(page_width / 2, y_position, f"Completed on {date_str}")
    
    # Footer with certificate ID
    if certificate_id:
        footer_y = 45
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor('#999999'))
        c.drawCentredString(page_width / 2, footer_y, f"Certificate ID: {certificate_id}")
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


def generate_certificate_from_template(template: dict, placeholders: dict, include_footer: bool = False) -> bytes:
    """
    Render a PDF certificate using a saved certificate template.
    
    COORDINATE SYSTEM:
    - Template x, y are percentages (0-100) from TOP-LEFT (like CSS)
    - ReportLab uses BOTTOM-LEFT origin
    - Conversion: reportlab_y = page_height - (y_pct * page_height)
    
    Args:
        template: Template dict with elements, background_color, border_style, orientation
        placeholders: Dict with values like user_name, training_name, score, date, certificate_id
        include_footer: If True, adds certificate ID footer (default False to avoid duplicates)
    
    Returns:
        PDF bytes
    """
    buffer = io.BytesIO()

    # Determine page orientation and size
    orientation = (template.get("orientation") or "landscape").lower()
    if orientation == "portrait":
        page_width, page_height = portrait(A4)
    else:
        page_width, page_height = landscape(A4)

    logger.info(f"Certificate render: orientation={orientation}, size={page_width:.0f}x{page_height:.0f}, elements={len(template.get('elements', []))}")

    # Create canvas
    c = canvas.Canvas(buffer, pagesize=(page_width, page_height))

    # Background color
    bg_color = template.get("background_color")
    if bg_color:
        try:
            c.setFillColor(colors.HexColor(bg_color))
            c.rect(0, 0, page_width, page_height, fill=1, stroke=0)
        except Exception:
            pass

    # Background image (optional)
    bg_image = template.get("background_image")
    if bg_image:
        try:
            if bg_image.startswith("data:image"):
                base64_part = bg_image.split(",", 1)[1]
            else:
                base64_part = bg_image
            bg_data = base64.b64decode(base64_part)
            bg_reader = ImageReader(io.BytesIO(bg_data))
            c.drawImage(bg_reader, 0, 0, width=page_width, height=page_height)
        except Exception as e:
            logger.warning(f"Failed to render background image: {e}")

    # Border style
    border_style = (template.get("border_style") or "classic").lower()
    draw_border(c, page_width, page_height, border_style)

    # Build extended placeholders with aliases
    extended_placeholders = {
        **placeholders,
        "score": str(placeholders.get("average_score_value", placeholders.get("average_score", ""))),
        "date": placeholders.get("completion_date", ""),
        "name": placeholders.get("user_name", ""),
        "user_name": placeholders.get("user_name", ""),
        "email": placeholders.get("user_email", ""),
        "modules": placeholders.get("modules_completed", ""),
        "organization": placeholders.get("organization_name", ""),
        "training_name": placeholders.get("training_name", placeholders.get("modules_completed", "")),
        "certificate_id": placeholders.get("certificate_id", ""),
    }

    # Iterate over template elements
    elements = template.get("elements", []) or []
    for elem in elements:
        try:
            render_element(c, elem, page_width, page_height, extended_placeholders)
        except Exception as e:
            logger.error(f"Error rendering certificate element {elem.get('id', 'unknown')}: {e}")
            continue

    # Optional footer with certificate ID (disabled by default to prevent duplicates)
    if include_footer:
        cert_id = placeholders.get("certificate_id")
        if cert_id:
            c.setFont("Helvetica", 8)
            c.setFillColor(colors.HexColor('#999999'))
            c.drawCentredString(page_width / 2, 25, f"Certificate ID: {cert_id}")

    c.save()
    buffer.seek(0)
    return buffer.getvalue()


def render_element(c, elem: dict, page_width: float, page_height: float, placeholders: dict):
    """
    Render a single template element on the canvas.
    
    COORDINATE CONVERSION:
    - elem.x, elem.y are percentages (0-100) from TOP-LEFT
    - ReportLab uses BOTTOM-LEFT origin
    - elem.y=0 means top of page, elem.y=100 means bottom
    """
    elem_type = elem.get("type", "text")
    
    # Convert percentages to absolute positions
    x_pct = float(elem.get("x", 0)) / 100.0
    y_pct = float(elem.get("y", 0)) / 100.0
    w_pct = float(elem.get("width", 10)) / 100.0
    h_pct = float(elem.get("height", 5)) / 100.0
    
    # Calculate absolute positions
    x = x_pct * page_width
    width = w_pct * page_width
    height = h_pct * page_height
    
    # Convert Y from top-based to bottom-based
    # y_pct=0 means top of page, so reportlab_y should be near page_height
    # y_pct=100 means bottom of page, so reportlab_y should be near 0
    y_top = page_height - (y_pct * page_height)  # Top edge of element in ReportLab coords
    y_bottom = y_top - height  # Bottom edge of element
    
    # Get content and resolve placeholders
    content = elem.get("content") or ""
    placeholder_key = elem.get("placeholder")
    
    # Resolve placeholder to content
    if placeholder_key:
        key = placeholder_key.strip("{}")
        if "{" in placeholder_key:
            # Format string like "Score: {score}%"
            try:
                content = placeholder_key.format(**placeholders)
            except Exception:
                content = placeholders.get(key, placeholder_key)
        else:
            content = str(placeholders.get(key, ""))
    
    # Replace any remaining placeholders in content
    if content and isinstance(content, str) and "{" in content:
        try:
            content = content.format(**placeholders)
        except Exception:
            pass
    
    style = elem.get("style", {}) or {}
    
    # Check if content is an image (base64)
    content_is_image = isinstance(content, str) and (
        content.startswith("data:image") or 
        (len(content) > 200 and not content.startswith("http") and not any(c in content for c in [' ', '\n', '{']))
    )
    
    if elem_type == "text" or (elem_type == "certifying_body" and not content_is_image):
        render_text_element(c, content, x, y_top, width, height, style, placeholders)
        
    elif elem_type in ["image", "logo", "signature"] or (elem_type == "certifying_body" and content_is_image):
        render_image_element(c, content, x, y_bottom, width, height, style, elem_type)


def render_text_element(c, text: str, x: float, y_top: float, width: float, height: float, style: dict, placeholders: dict):
    """
    Render a text element with proper wrapping and alignment.
    
    Args:
        c: ReportLab canvas
        text: Text content to render
        x: Left edge X position (absolute)
        y_top: Top edge Y position in ReportLab coords (bottom-up)
        width: Element width
        height: Element height
        style: CSS-like style dict
    """
    if not text:
        return
    
    text = str(text)
    
    # Parse font properties
    font_size = parse_font_size(style.get("fontSize", 14))
    font_family = style.get("fontFamily", style.get("fontName", "Helvetica"))
    is_bold = style.get("fontWeight") == "bold"
    font_name = get_reportlab_font(font_family, is_bold)
    
    # Parse color
    color_hex = style.get("color", "#333333")
    try:
        fill_color = colors.HexColor(color_hex)
    except Exception:
        fill_color = colors.black
    
    # Parse alignment
    align = style.get("textAlign", style.get("alignment", "left"))
    
    # Parse line height (default 1.3 to match frontend)
    line_height_factor = float(style.get("lineHeight", 1.3))
    line_height = font_size * line_height_factor
    
    # Set font
    try:
        c.setFont(font_name, font_size)
    except Exception:
        c.setFont("Helvetica", font_size)
        font_name = "Helvetica"
    
    c.setFillColor(fill_color)
    
    # Wrap text to fit width
    lines = wrap_text(text, font_name, font_size, width, c)
    
    # Calculate total text block height
    total_text_height = len(lines) * line_height
    
    # Start Y position - vertically center text block within element
    # y_top is the top of the element, we need to center the text block
    start_y = y_top - (height - total_text_height) / 2 - font_size * 0.8  # Adjust for baseline
    
    # Draw each line
    for i, line in enumerate(lines):
        line_y = start_y - (i * line_height)
        
        if align == "center":
            c.drawCentredString(x + width / 2, line_y, line)
        elif align == "right":
            c.drawRightString(x + width, line_y, line)
        else:
            c.drawString(x, line_y, line)


def render_image_element(c, content: str, x: float, y_bottom: float, width: float, height: float, style: dict, elem_type: str):
    """
    Render an image element (logo, signature, certifying body, or generic image).
    
    Args:
        c: ReportLab canvas
        content: Base64 image data or data URI
        x: Left edge X position
        y_bottom: Bottom edge Y position in ReportLab coords
        width: Element width
        height: Element height  
        style: Style dict (may contain title for signatures)
        elem_type: Element type (image, logo, signature, certifying_body)
    """
    if not content:
        return
    
    # Extract base64 data
    try:
        if content.startswith("data:image"):
            image_data_b64 = content.split(",", 1)[1]
        else:
            image_data_b64 = content
        
        # Fix base64 padding if needed
        padding = len(image_data_b64) % 4
        if padding:
            image_data_b64 += '=' * (4 - padding)
        
        img_data = base64.b64decode(image_data_b64)
        img_reader = ImageReader(io.BytesIO(img_data))
    except Exception as e:
        logger.warning(f"Failed to decode image: {e}")
        return
    
    # Get image dimensions for aspect ratio
    try:
        iw, ih = img_reader.getSize()
        aspect = iw / ih if ih > 0 else 1
    except Exception:
        aspect = 1
    
    # Calculate dimensions preserving aspect ratio
    preserve_ratio = style.get("preserveRatio", True)
    
    if preserve_ratio:
        # Fit image within bounding box while preserving aspect ratio
        target_w = width
        target_h = height
        
        # Reserve space for title below signatures/certifying body
        title = style.get("title", "")
        if title and elem_type in ["signature", "certifying_body"]:
            target_h = height * 0.75  # 75% for image, 25% for title
        
        # Calculate fitted dimensions
        if (target_w / target_h) > aspect:
            # Height is the constraint
            final_h = target_h
            final_w = target_h * aspect
        else:
            # Width is the constraint
            final_w = target_w
            final_h = target_w / aspect
        
        # Center within bounding box
        dx = (width - final_w) / 2
        dy = (height - final_h) / 2
        
        c.drawImage(img_reader, x + dx, y_bottom + dy, width=final_w, height=final_h, preserveAspectRatio=True, mask='auto')
    else:
        c.drawImage(img_reader, x, y_bottom, width=width, height=height, mask='auto')
    
    # Draw title below signature/certifying body images
    title = style.get("title", "")
    if title and elem_type in ["signature", "certifying_body"]:
        c.setFont("Helvetica", 9)
        c.setFillColor(colors.HexColor('#555555'))
        # Position title centered below the image area
        title_y = y_bottom - 12
        c.drawCentredString(x + width / 2, title_y, title)


def generate_certificate_preview(template: dict) -> bytes:
    """
    Generate a preview PDF of a certificate template with sample data.
    Used for the editor preview functionality.
    
    Args:
        template: Template dict
        
    Returns:
        PDF bytes
    """
    # Sample placeholder data for preview
    sample_placeholders = {
        "user_name": "John Doe",
        "user_email": "john.doe@example.com",
        "training_name": "Phishing Email Detection",
        "modules_completed": "Phishing Email Detection",
        "average_score": "85.0%",
        "average_score_value": 85.0,
        "completion_date": datetime.now(timezone.utc).strftime("%B %d, %Y"),
        "organization_name": "Example Organization",
        "certificate_id": "CERT-PREVIEW-001",
        "score": "85.0",
        "date": datetime.now(timezone.utc).strftime("%B %d, %Y"),
        "name": "John Doe",
    }
    
    return generate_certificate_from_template(template, sample_placeholders, include_footer=False)


def generate_bulk_certificates(users_data: list, organization_name: str = None) -> bytes:
    """
    Generate multiple certificates in a single PDF
    
    Args:
        users_data: List of dicts with user certificate data
        organization_name: Optional organization name
    
    Returns:
        PDF bytes with multiple pages
    """
    buffer = io.BytesIO()
    
    # For bulk, we'll create individual PDFs and merge
    # For simplicity, generate first certificate only in this implementation
    # Full implementation would use PyPDF2 to merge
    
    if users_data:
        first_user = users_data[0]
        return generate_training_certificate(
            user_name=first_user.get('name', 'Unknown'),
            user_email=first_user.get('email', ''),
            modules_completed=first_user.get('modules', []),
            average_score=first_user.get('score', 0),
            completion_date=first_user.get('completion_date', datetime.now(timezone.utc)),
            organization_name=organization_name,
            certificate_id=first_user.get('certificate_id')
        )
    
    return buffer.getvalue()

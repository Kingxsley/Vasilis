"""
Certificate Generation Service
Generates training completion certificates in PDF format
"""
import io
from datetime import datetime, timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfgen import canvas
import logging

logger = logging.getLogger(__name__)


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
    Generate a PDF training completion certificate
    
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
    light_gray = colors.HexColor('#F5F5F5')
    
    # Border
    c.setStrokeColor(accent_color)
    c.setLineWidth(3)
    c.rect(30, 30, page_width - 60, page_height - 60)
    
    # Inner border
    c.setStrokeColor(primary_color)
    c.setLineWidth(1)
    c.rect(40, 40, page_width - 80, page_height - 80)
    
    # Decorative corners
    corner_size = 30
    c.setFillColor(accent_color)
    # Top left
    c.rect(30, page_height - 30 - corner_size, corner_size, corner_size, fill=1)
    # Top right
    c.rect(page_width - 30 - corner_size, page_height - 30 - corner_size, corner_size, corner_size, fill=1)
    # Bottom left
    c.rect(30, 30, corner_size, corner_size, fill=1)
    # Bottom right
    c.rect(page_width - 30 - corner_size, 30, corner_size, corner_size, fill=1)
    
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
    c.drawCentredString(page_width / 2, y_position, "This certificate is presented to")
    y_position -= 35
    
    # User Name
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(primary_color)
    c.drawCentredString(page_width / 2, y_position, user_name)
    y_position -= 25
    
    # Decorative line under name
    c.setStrokeColor(accent_color)
    c.setLineWidth(2)
    line_width = min(len(user_name) * 12, 300)
    c.line(page_width/2 - line_width/2, y_position, page_width/2 + line_width/2, y_position)
    y_position -= 40
    
    # Completion text
    c.setFont("Helvetica", 12)
    c.setFillColor(text_color)
    c.drawCentredString(page_width / 2, y_position, "for successfully completing the following security training modules:")
    y_position -= 30
    
    # Modules list
    c.setFont("Helvetica-Bold", 11)
    modules_text = " • ".join(modules_completed) if modules_completed else "Security Awareness Training"
    
    # Word wrap if too long
    if len(modules_text) > 80:
        mid = len(modules_text) // 2
        split_point = modules_text.rfind(' • ', 0, mid)
        if split_point > 0:
            c.drawCentredString(page_width / 2, y_position, modules_text[:split_point])
            y_position -= 18
            c.drawCentredString(page_width / 2, y_position, modules_text[split_point+3:])
    else:
        c.drawCentredString(page_width / 2, y_position, modules_text)
    y_position -= 35
    
    # Score
    c.setFont("Helvetica", 12)
    c.setFillColor(text_color)
    score_text = f"with an overall score of "
    c.drawCentredString(page_width / 2 - 30, y_position, score_text)
    
    # Score value with color coding
    if average_score >= 80:
        score_color = colors.HexColor('#51CF66')  # Green
    elif average_score >= 60:
        score_color = colors.HexColor('#FFB300')  # Orange
    else:
        score_color = colors.HexColor('#FF6B6B')  # Red
    
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(score_color)
    c.drawString(page_width / 2 + 60, y_position - 2, f"{average_score:.0f}%")
    y_position -= 50
    
    # Date
    c.setFont("Helvetica", 11)
    c.setFillColor(text_color)
    date_str = completion_date.strftime("%B %d, %Y") if completion_date else datetime.now().strftime("%B %d, %Y")
    c.drawCentredString(page_width / 2, y_position, f"Awarded on {date_str}")
    y_position -= 60
    
    # Signature line
    sig_y = y_position
    sig_width = 150
    
    # Left signature (Program Director)
    c.setStrokeColor(text_color)
    c.setLineWidth(0.5)
    c.line(page_width/4 - sig_width/2, sig_y, page_width/4 + sig_width/2, sig_y)
    c.setFont("Helvetica", 9)
    c.drawCentredString(page_width/4, sig_y - 15, "Program Director")
    
    # Right signature (Organization Admin or NetShield)
    c.line(3*page_width/4 - sig_width/2, sig_y, 3*page_width/4 + sig_width/2, sig_y)
    admin_title = f"{organization_name} Administrator" if organization_name else "Vasilis NetShield"
    c.drawCentredString(3*page_width/4, sig_y - 15, admin_title)
    
    # Footer
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor('#999999'))
    
    footer_y = 55
    c.drawCentredString(page_width / 2, footer_y, "Powered by Vasilis NetShield - Human + AI Powered Security Training")
    
    if certificate_id:
        c.drawCentredString(page_width / 2, footer_y - 12, f"Certificate ID: {certificate_id}")
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


def generate_certificate_from_template(template: dict, placeholders: dict) -> bytes:
    """
    Render a PDF certificate using a saved certificate template.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Use reportlab for drawing
    from reportlab.lib.pagesizes import landscape, portrait, A4
    from reportlab.lib.utils import ImageReader
    import base64
    buffer = io.BytesIO()

    # Determine page orientation
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
            # Expect base64 encoded data URI or raw base64
            if bg_image.startswith("data:image"):
                base64_part = bg_image.split(",", 1)[1]
            else:
                base64_part = bg_image
            bg_data = base64.b64decode(base64_part)
            bg_reader = ImageReader(io.BytesIO(bg_data))
            c.drawImage(bg_reader, 0, 0, width=page_width, height=page_height)
        except Exception:
            pass

    # Border style (simple implementation: draw a colored border)
    border_style = (template.get("border_style") or "classic").lower()
    # We'll draw a border with primary and accent colors derived from the
    # template for now.  Advanced styles (modern, ornate) could be added
    # later.
    primary_color = colors.HexColor('#1F4E79')
    accent_color = colors.HexColor('#D4A836')
    if border_style in ["classic", "modern", "minimal", "ornate"]:
        c.setStrokeColor(accent_color)
        c.setLineWidth(3)
        margin = 30
        c.rect(margin, margin, page_width - 2*margin, page_height - 2*margin)
        # Inner border for classic style
        if border_style == "classic":
            c.setStrokeColor(primary_color)
            c.setLineWidth(1)
            margin2 = margin + 10
            c.rect(margin2, margin2, page_width - 2*margin2, page_height - 2*margin2)

    # Iterate over template elements
    elements = template.get("elements", []) or []
    for elem in elements:
        try:
            elem_type = elem.get("type")
            x_pct = float(elem.get("x", 0)) / 100.0
            y_pct = float(elem.get("y", 0)) / 100.0
            w_pct = float(elem.get("width", 0)) / 100.0
            h_pct = float(elem.get("height", 0)) / 100.0
            x = x_pct * page_width
            y = (1 - y_pct) * page_height  # Convert from top-based percent to bottom-based
            width = w_pct * page_width
            height = h_pct * page_height

            # Determine content and style
            content = elem.get("content")
            placeholder_key = elem.get("placeholder")
            
            # Add placeholder aliases for compatibility
            extended_placeholders = {
                **placeholders,
                "score": placeholders.get("average_score_value", placeholders.get("average_score", "")),
                "date": placeholders.get("completion_date", ""),
                "name": placeholders.get("user_name", ""),
                "email": placeholders.get("user_email", ""),
                "modules": placeholders.get("modules_completed", ""),
                "organization": placeholders.get("organization_name", ""),
            }
            
            # If placeholder specified (e.g., "{user_name}"), get from placeholders first
            if placeholder_key:
                key = placeholder_key.strip("{}")
                # Check if placeholder contains format string like "Score: {score}%"
                if "{" in placeholder_key:
                    try:
                        content = placeholder_key.format(**extended_placeholders)
                    except Exception:
                        content = extended_placeholders.get(key, placeholder_key)
                else:
                    content = extended_placeholders.get(key, "")
            
            # If content contains placeholders, replace them
            if content and isinstance(content, str) and "{" in content:
                try:
                    content = content.format(**extended_placeholders)
                except Exception:
                    pass

            style = elem.get("style", {}) or {}

            if elem_type in ["text", "certifying_body"]:
                # Draw text
                text = str(content or "")
                
                # Handle fontSize - can be "32px" string or integer
                font_size_raw = style.get("fontSize", 14)
                if isinstance(font_size_raw, str):
                    # Extract number from "32px" or similar
                    font_size = int(''.join(filter(str.isdigit, font_size_raw)) or 14)
                else:
                    font_size = int(font_size_raw)
                
                # Handle font name - can be fontName or fontFamily
                font_name = style.get("fontName") or style.get("fontFamily", "Helvetica")
                # Clean up font family (e.g., "Georgia, serif" -> "Georgia")
                if "," in font_name:
                    font_name = font_name.split(",")[0].strip()
                # Map common fonts to ReportLab fonts
                font_map = {
                    "Georgia": "Times-Roman",
                    "Times New Roman": "Times-Roman",
                    "Arial": "Helvetica",
                    "sans-serif": "Helvetica",
                    "serif": "Times-Roman",
                }
                font_name = font_map.get(font_name, font_name)
                
                color_hex = style.get("color") or "#333333"
                # Handle textAlign or alignment
                align = style.get("alignment") or style.get("textAlign", "center")
                
                # Set font and color
                try:
                    # Check if font is bold
                    if style.get("fontWeight") == "bold":
                        if font_name == "Helvetica":
                            font_name = "Helvetica-Bold"
                        elif font_name == "Times-Roman":
                            font_name = "Times-Bold"
                    c.setFont(font_name, font_size)
                except Exception:
                    c.setFont("Helvetica", font_size)
                try:
                    c.setFillColor(colors.HexColor(color_hex))
                except Exception:
                    c.setFillColor(colors.black)
                    
                # Determine y coordinate for baseline
                # y is already converted from top-based percentage to bottom-based pixels
                # For text, we want to draw at the vertical center of the element
                text_y = y - height/2 + font_size/3  # Adjust for baseline
                
                if align == "center":
                    text_x = x + width/2
                    c.drawCentredString(text_x, text_y, text)
                elif align == "right":
                    c.drawRightString(x + width, text_y, text)
                else:
                    c.drawString(x, text_y, text)

            elif elem_type in ["image", "logo", "signature"]:
                # Determine image data.  Use content or placeholder to fetch base64
                image_data_b64 = None
                if content:
                    if isinstance(content, str) and content.startswith("data:image"):
                        image_data_b64 = content.split(",", 1)[1]
                    else:
                        image_data_b64 = content
                elif placeholder_key:
                    val = placeholders.get(placeholder_key.strip("{}"))
                    if isinstance(val, str):
                        if val.startswith("data:image"):
                            image_data_b64 = val.split(",", 1)[1]
                        else:
                            image_data_b64 = val
                if image_data_b64:
                    try:
                        img_data = base64.b64decode(image_data_b64)
                        img_reader = ImageReader(io.BytesIO(img_data))
                        # Maintain aspect ratio if style.aspectRatio is set
                        preserve_ratio = style.get("preserveRatio", True)
                        if preserve_ratio:
                            iw, ih = img_reader.getSize()
                            aspect = iw / ih
                            # Fit inside width/height bounding box
                            target_w = width
                            target_h = height
                            if (target_w / target_h) > aspect:
                                target_w = target_h * aspect
                            else:
                                target_h = target_w / aspect
                            # Center within bounding box
                            dx = (width - target_w) / 2
                            dy = (height - target_h) / 2
                            c.drawImage(img_reader, x + dx, y - height + dy, width=target_w, height=target_h, preserveAspectRatio=True, mask='auto')
                        else:
                            c.drawImage(img_reader, x, y - height, width=width, height=height, mask='auto')
                    except Exception:
                        pass

        except Exception as e:
            # Catch rendering errors for individual elements to avoid breaking the entire certificate
            logger.error(f"Error rendering certificate element: {e}")
            continue

    # Footer: optional certificate ID
    cert_id = placeholders.get("certificate_id")
    if cert_id:
        c.setFont("Helvetica", 8)
        c.setFillColor(colors.HexColor('#999999'))
        c.drawCentredString(page_width / 2, 25, f"Certificate ID: {cert_id}")

    c.save()
    buffer.seek(0)
    return buffer.getvalue()


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

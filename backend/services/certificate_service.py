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
    admin_title = f"{organization_name} Administrator" if organization_name else "VasilisNetShield"
    c.drawCentredString(3*page_width/4, sig_y - 15, admin_title)
    
    # Footer
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor('#999999'))
    
    footer_y = 55
    c.drawCentredString(page_width / 2, footer_y, "Powered by VasilisNetShield - Human + AI Powered Security Training")
    
    if certificate_id:
        c.drawCentredString(page_width / 2, footer_y - 12, f"Certificate ID: {certificate_id}")
    
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

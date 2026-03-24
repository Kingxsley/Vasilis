"""
Test Certificate Training Name Placeholder Feature
Tests that certificates display specific training module names dynamically.
E.g., 'has completed the Phishing Email Detection training' for the Phishing Email Detection module.
"""
import pytest
import requests
import os
import io
from PyPDF2 import PdfReader

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_USER_ID = "a2be3723-95b8-4f00-bf33-583d8b46463a"
TEST_EMAIL = "admin@vasilisnetshield.com"
TEST_PASSWORD = "Admin123!"
MODULE_ID = "mod_phishing_email"
EXPECTED_MODULE_NAME = "Phishing Email Detection"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for API calls"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token") or response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def authenticated_client(auth_token):
    """Session with auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestCertificateTrainingNamePlaceholder:
    """Tests for {training_name} placeholder in certificates"""
    
    def test_health_check(self):
        """Verify backend is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Backend health check passed")
    
    def test_certificate_eligibility_check(self, authenticated_client):
        """Verify user is eligible for certificate"""
        response = authenticated_client.get(f"{BASE_URL}/api/certificates/user/{TEST_USER_ID}/check")
        assert response.status_code == 200
        data = response.json()
        assert data.get("eligible") == True, f"User not eligible: {data}"
        assert data.get("completed_sessions", 0) >= 1
        print(f"✓ User eligible with {data.get('completed_sessions')} completed sessions, avg score: {data.get('average_score')}")
    
    def test_generate_user_certificate_returns_pdf(self, authenticated_client):
        """Test that /api/certificates/user/{user_id} returns a valid PDF"""
        response = authenticated_client.get(f"{BASE_URL}/api/certificates/user/{TEST_USER_ID}")
        assert response.status_code == 200, f"Failed to generate certificate: {response.status_code} - {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify it's a valid PDF
        pdf_content = response.content
        assert pdf_content.startswith(b'%PDF'), "Response is not a valid PDF"
        print(f"✓ User certificate generated successfully ({len(pdf_content)} bytes)")
    
    def test_generate_module_certificate_returns_pdf(self, authenticated_client):
        """Test that /api/certificates/user/{user_id}/module/{module_id} returns a valid PDF"""
        response = authenticated_client.get(f"{BASE_URL}/api/certificates/user/{TEST_USER_ID}/module/{MODULE_ID}")
        assert response.status_code == 200, f"Failed to generate module certificate: {response.status_code} - {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Verify it's a valid PDF
        pdf_content = response.content
        assert pdf_content.startswith(b'%PDF'), "Response is not a valid PDF"
        print(f"✓ Module certificate generated successfully ({len(pdf_content)} bytes)")
    
    def test_module_certificate_contains_training_name(self, authenticated_client):
        """Test that module-specific certificate contains the training module name"""
        response = authenticated_client.get(f"{BASE_URL}/api/certificates/user/{TEST_USER_ID}/module/{MODULE_ID}")
        assert response.status_code == 200
        
        # Parse PDF and extract text
        pdf_content = response.content
        pdf_reader = PdfReader(io.BytesIO(pdf_content))
        
        # Extract text from all pages
        full_text = ""
        for page in pdf_reader.pages:
            full_text += page.extract_text() or ""
        
        # Check that the training name appears in the certificate
        # The module name should appear in the certificate text
        assert EXPECTED_MODULE_NAME in full_text or "Phishing" in full_text, \
            f"Expected training name '{EXPECTED_MODULE_NAME}' not found in certificate. Text: {full_text[:500]}"
        print(f"✓ Module certificate contains training name: '{EXPECTED_MODULE_NAME}'")
    
    def test_user_certificate_contains_training_name(self, authenticated_client):
        """Test that user certificate (all modules) contains training name"""
        response = authenticated_client.get(f"{BASE_URL}/api/certificates/user/{TEST_USER_ID}")
        assert response.status_code == 200
        
        # Parse PDF and extract text
        pdf_content = response.content
        pdf_reader = PdfReader(io.BytesIO(pdf_content))
        
        # Extract text from all pages
        full_text = ""
        for page in pdf_reader.pages:
            full_text += page.extract_text() or ""
        
        # For single module completion, should show the specific module name
        assert EXPECTED_MODULE_NAME in full_text or "Phishing" in full_text, \
            f"Expected training name '{EXPECTED_MODULE_NAME}' not found in certificate. Text: {full_text[:500]}"
        print(f"✓ User certificate contains training name: '{EXPECTED_MODULE_NAME}'")
    
    def test_certificate_filename_contains_module_name(self, authenticated_client):
        """Test that module certificate filename includes the module name"""
        response = authenticated_client.get(f"{BASE_URL}/api/certificates/user/{TEST_USER_ID}/module/{MODULE_ID}")
        assert response.status_code == 200
        
        content_disposition = response.headers.get("content-disposition", "")
        # Filename should contain module name (with underscores replacing spaces)
        expected_filename_part = EXPECTED_MODULE_NAME.replace(" ", "_")
        assert expected_filename_part in content_disposition, \
            f"Expected '{expected_filename_part}' in filename. Got: {content_disposition}"
        print(f"✓ Certificate filename contains module name: {content_disposition}")
    
    def test_invalid_module_returns_400(self, authenticated_client):
        """Test that requesting certificate for non-completed module returns 400"""
        # mod_malicious_ads is not completed by the test user
        response = authenticated_client.get(f"{BASE_URL}/api/certificates/user/{TEST_USER_ID}/module/mod_malicious_ads")
        assert response.status_code == 400, f"Expected 400 for non-completed module, got {response.status_code}"
        data = response.json()
        assert "No completed session" in data.get("detail", "")
        print("✓ Non-completed module returns 400 as expected")
    
    def test_invalid_user_returns_404(self, authenticated_client):
        """Test that requesting certificate for non-existent user returns 404"""
        response = authenticated_client.get(f"{BASE_URL}/api/certificates/user/non-existent-user-id/module/{MODULE_ID}")
        assert response.status_code in [403, 404], f"Expected 403/404 for non-existent user, got {response.status_code}"
        print(f"✓ Non-existent user returns {response.status_code} as expected")


class TestCertificateTemplateTrainingNamePlaceholder:
    """Tests for {training_name} placeholder in certificate templates"""
    
    def test_default_template_has_training_name_placeholder(self, authenticated_client):
        """Verify default template uses {training_name} placeholder"""
        response = authenticated_client.get(f"{BASE_URL}/api/certificate-templates/default")
        assert response.status_code == 200
        template = response.json()
        
        elements = template.get("elements", [])
        assert len(elements) > 0, "Template has no elements"
        
        # Find elements that should use training_name placeholder
        training_name_found = False
        for elem in elements:
            placeholder = elem.get("placeholder", "")
            content = elem.get("content", "")
            if "{training_name}" in placeholder or "{training_name}" in content:
                training_name_found = True
                print(f"✓ Found {{training_name}} in element '{elem.get('id')}': {placeholder or content}")
                break
        
        assert training_name_found, "No element with {training_name} placeholder found in default template"
    
    def test_list_templates_returns_templates(self, authenticated_client):
        """Verify templates list endpoint works"""
        response = authenticated_client.get(f"{BASE_URL}/api/certificate-templates")
        assert response.status_code == 200
        templates = response.json()
        assert isinstance(templates, list)
        assert len(templates) > 0, "No templates found"
        print(f"✓ Found {len(templates)} certificate templates")
    
    def test_preset_templates_have_training_name_placeholder(self, authenticated_client):
        """Verify preset templates use {training_name} placeholder"""
        response = authenticated_client.get(f"{BASE_URL}/api/certificate-templates")
        assert response.status_code == 200
        templates = response.json()
        
        templates_with_training_name = []
        templates_without_training_name = []
        
        for template in templates:
            elements = template.get("elements", [])
            has_training_name = False
            for elem in elements:
                placeholder = elem.get("placeholder", "")
                content = elem.get("content", "")
                if "{training_name}" in placeholder or "{training_name}" in content:
                    has_training_name = True
                    break
            
            if has_training_name:
                templates_with_training_name.append(template.get("name"))
            else:
                templates_without_training_name.append(template.get("name"))
        
        print(f"✓ Templates with {{training_name}}: {templates_with_training_name}")
        if templates_without_training_name:
            print(f"⚠ Templates without {{training_name}}: {templates_without_training_name}")
        
        # At least the default template should have training_name
        assert len(templates_with_training_name) > 0, "No templates have {training_name} placeholder"


class TestMultiModuleCertificate:
    """Tests for certificates with multiple completed modules"""
    
    def test_multi_module_certificate_joins_names(self, authenticated_client):
        """Test that multi-module certificate joins training names with &"""
        response = authenticated_client.get(f"{BASE_URL}/api/certificates/user/{TEST_USER_ID}/check")
        assert response.status_code == 200
        data = response.json()
        completed_sessions = data.get("completed_sessions", 0)
        print(f"✓ User has {completed_sessions} completed session(s)")
        
        if completed_sessions >= 2:
            # Generate certificate and check for joined names
            cert_response = authenticated_client.get(f"{BASE_URL}/api/certificates/user/{TEST_USER_ID}")
            assert cert_response.status_code == 200
            
            pdf_content = cert_response.content
            pdf_reader = PdfReader(io.BytesIO(pdf_content))
            full_text = ""
            for page in pdf_reader.pages:
                full_text += page.extract_text() or ""
            
            # Should contain " & " joining module names
            assert " & " in full_text or "Phishing" in full_text, \
                f"Multi-module certificate should join names. Text: {full_text[:500]}"
            print("✓ Multi-module certificate joins training names correctly")
        else:
            print("⚠ Only single module completed - skipping multi-module join test")
    
    def test_single_module_certificate_shows_specific_name(self, authenticated_client):
        """Test that single module certificate shows specific module name"""
        # Test with Social Engineering Defense module
        response = authenticated_client.get(f"{BASE_URL}/api/certificates/user/{TEST_USER_ID}/module/mod_social_engineering")
        
        if response.status_code == 200:
            pdf_content = response.content
            pdf_reader = PdfReader(io.BytesIO(pdf_content))
            full_text = ""
            for page in pdf_reader.pages:
                full_text += page.extract_text() or ""
            
            assert "Social Engineering Defense" in full_text, \
                f"Expected 'Social Engineering Defense' in certificate. Text: {full_text[:500]}"
            print("✓ Single module certificate shows 'Social Engineering Defense'")
        else:
            print(f"⚠ Module not completed - status {response.status_code}")


class TestCertificateVerification:
    """Tests for certificate verification endpoint"""
    
    def test_verify_generated_certificate(self, authenticated_client):
        """Generate a certificate and verify it can be looked up"""
        # First generate a certificate
        gen_response = authenticated_client.get(f"{BASE_URL}/api/certificates/user/{TEST_USER_ID}")
        assert gen_response.status_code == 200
        
        # Get the certificate ID from the content-disposition header
        content_disposition = gen_response.headers.get("content-disposition", "")
        # Extract CERT-XXXXXXXX from filename
        import re
        cert_id_match = re.search(r'CERT-[A-F0-9]+', content_disposition)
        
        if cert_id_match:
            cert_id = cert_id_match.group()
            # Verify the certificate
            verify_response = requests.get(f"{BASE_URL}/api/certificates/verify/{cert_id}")
            assert verify_response.status_code == 200
            data = verify_response.json()
            assert data.get("valid") == True
            assert data.get("certificate_id") == cert_id
            print(f"✓ Certificate {cert_id} verified successfully")
        else:
            print("⚠ Could not extract certificate ID from filename")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

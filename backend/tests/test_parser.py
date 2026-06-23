import pytest
from backend.services.parser import mask_sensitive_data

def test_mask_account_numbers():
    text = "Payment to AC 123456789012 for rent"
    masked = mask_sensitive_data(text)
    assert "123456789012" not in masked
    assert "[REDACTED_ACCT]" in masked
    
def test_mask_emails():
    text = "UPI payment by user@example.com"
    masked = mask_sensitive_data(text)
    assert "user@example.com" not in masked
    assert "[REDACTED_EMAIL]" in masked
    
def test_no_sensitive_data():
    text = "ZOMATO FOOD ORDER 350.00"
    masked = mask_sensitive_data(text)
    assert masked == text

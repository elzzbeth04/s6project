from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pytesseract
import cv2
import re
import tempfile

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Define categories and associated points
POINTS_MAPPING = {
    "ncc": 60,
    "nss": 60,
    "ncc_c-certificate": 80,
    "nptel + 4 week": 20,
    "nptel + 8 week": 30,
    "nptel + 12 week": 50,
    "sports participation": 8,
    "games participation": 8,
    "sports + 1st prize": 20,
    "sports + 2nd prize": 16,
    "sports + 3rd prize": 12,
    "music": 8,
    "performing arts": 8,
    "literary arts": 8,
    "cultural + 1st prize": 20,
    "cultural + 2nd prize": 16,
    "cultural + 3rd prize": 12,
    "tech fest": 10,
    "tech quiz": 10,
    "Excel": 15,
    "mooc": 50,
    "competitions + ieee": 40,
    "competitions + iet": 40,
    "conference + iit": 40,
    "conference + nit": 40,
    "paper presentation + iit": 40,
    "paper presentation + nit": 40,
    "industrial training": 20,
    "foreign language skill": 50,
    "startup company": 60,
    "patent filed": 30,
    "patent published": 35,
    "patent approved": 50,
    "patent licensed": 80,
    "prototype developed": 60,
    "venture capital funding": 80,
    "startup employment": 80,
    "student society member": 10,
    "student society executive": 15,
    "festival coordinator": 15,
    "chairman": 15,
    "secretary": 15,
    "chairperson": 15,
    "Tech lead": 15,
}

def extract_text_from_image(image_path):
    """Extract text from an image using Tesseract OCR."""
    image = cv2.imread(image_path)
    if image is None:
        print("Error: Could not load image. Check the file path!")
        return ""

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    text = pytesseract.image_to_string(gray)
    return text.lower()

def extract_keywords(text):
    """Extract keywords from text using regex matching."""
    keywords = set()
    words = text.split()

    # Special cases for multi-word keywords
    if "ncc" in words and "c certificate" in text:
        keywords.add("ncc_c-certificate")
    if "nptel" in words and "8 week" in text:
        keywords.add("nptel + 8 week")
    if "nptel" in words and "12 week" in text:
        keywords.add("nptel + 12 week")
    if "nptel" in words and "4 week" in text:
        keywords.add("nptel + 4 week")
    if "sports" in words and "1st prize" in text:
        keywords.add("sports + 1st prize")
    if "sports" in words and "2nd prize" in text:
        keywords.add("sports + 2nd prize")
    if "sports" in words and "3rd prize" in text:
        keywords.add("sports + 3rd prize")
    if "cultural" in words and "1st prize" in text:
        keywords.add("cultural + 1st prize")
    if "cultural" in words and "2nd prize" in text:
        keywords.add("cultural + 2nd prize")
    if "cultural" in words and "3rd prize" in text:
        keywords.add("cultural + 3rd prize")
    if "startup" in words and "venture capital" in text:
        keywords.add("venture capital funding")

    # General keyword extraction
    for key in POINTS_MAPPING:
        if key not in keywords and re.search(rf"\b{key}\b", text, re.IGNORECASE):
            keywords.add(key)

    return keywords

def assign_points(keywords):
    """Assign points based on extracted keywords."""
    return sum(POINTS_MAPPING.get(keyword, 0) for keyword in keywords)

def process_certificate(image_path):
    """Complete processing pipeline: OCR, keyword extraction, and point calculation."""
    extracted_text = extract_text_from_image(image_path)
    keywords = extract_keywords(extracted_text)
    total_points = assign_points(keywords)
    return {
        "extractedText": extracted_text,
        "keywords": list(keywords),
        "totalPoints": total_points
    }

@app.route('/api/process-certificate', methods=['POST'])
def api_process_certificate():
    """API endpoint to process an uploaded certificate image."""
    if 'certificate' not in request.files:
        return jsonify({"error": "No certificate file uploaded"}), 400

    file = request.files['certificate']
    
    # Save to a temporary file
    temp_dir = tempfile.mkdtemp()
    temp_file_path = os.path.join(temp_dir, file.filename)
    file.save(temp_file_path)

    try:
        # Process the certificate
        result = process_certificate(temp_file_path)

        # Clean up temporary files
        os.remove(temp_file_path)
        os.rmdir(temp_dir)

        return jsonify(result)
    except Exception as e:
        # Cleanup in case of an error
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)
        
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=3000)

""" from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pytesseract
import cv2
import re
import tempfile

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Define categories and associated points
POINTS_MAPPING = {
    # National Initiatives
    "ncc": 60,
    "nss": 60,
    "ncc_c-certificate": 80,  # Additional points for NCC/NSS C-certificate
    "nptel + 4 week": 20,
    "nptel + 8 week": 30,
    "nptel + 12 week": 50,
    # Sports & Games
    "sports participation": 8,
    "games participation": 8,
    "sports + 1st prize": 20,
    "sports + 2nd prize": 16,
    "sports + 3rd prize": 12,
    # Cultural Activities
    "music": 8,
    "performing arts": 8,
    "literary arts": 8,
    "cultural + 1st prize": 20,
    "cultural + 2nd prize": 16,
    "cultural + 3rd prize": 12,
    # Professional Self Initiatives
    "tech fest": 10,
    "tech quiz": 10,
    "Excel":15,
    "mooc": 50,
    "competitions + ieee": 40,
    "competitions + iet": 40,
    "conference + iit": 40,
    "conference + nit": 40,
    "paper presentation + iit": 40,
    "paper presentation + nit": 40,
    "industrial training": 20,
    "foreign language skill": 50,
    # Entrepreneurship & Innovation
    "startup company": 60,
    "patent filed": 30,
    "patent published": 35,
    "patent approved": 50,
    "patent licensed": 80,
    "prototype developed": 60,
    "venture capital funding": 80,
    "startup employment": 80,
    # Leadership & Management student societies
    "student society member": 10,
    "student society executive": 15,
    "festival coordinator": 15,
    "chairman": 15,
    "secretary": 15,
    "chairperson":15,
    "Tech lead":15,
    # ... (rest of your mapping)
}

def extract_text_from_image(image_path):
    image = cv2.imread(image_path)
    if image is None:
        print("Error: Could not load image. Check the file path!")
        return ""

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    text = pytesseract.image_to_string(gray)
    return text.lower()  # Convert to lowercase for consistency

def extract_keywords(text):
    
    keywords = set()
    words = text.split()

    # Special case checks for multi-word keywords
    if "ncc" in words and "c certicate" in text:
        keywords.add("ncc_c-certificate")
    if "nptel" in words and "8 week" in text:
        keywords.add("nptel + 8 week")
    if "nptel" in words and "12 week" in text:
        keywords.add("nptel + 12 week")
    if "nptel" in words and "4 week" in text:
        keywords.add("nptel + 4 week")
    if "sports" in words and "1st prize" in text:
        keywords.add("sports + 1st prize")
    if "sports" in words and "2nd prize" in text:
        keywords.add("sports + 2nd prize")
    if "sports" in words and "3rd prize" in text:
        keywords.add("sports + 3rd prize")
    if "cultural" in words and "1st prize" in text:
        keywords.add("cultural + 1st prize")
    if "cultural" in words and "2nd prize" in text:
        keywords.add("cultural + 2nd prize")
    if "cultural" in words and "3rd prize" in text:
        keywords.add("cultural + 3rd prize")
    if "startup" in words and "venture capital" in text:
        keywords.add("venture capital funding")

    # General keyword extraction
    for key in POINTS_MAPPING:
        if key not in keywords:
            if re.search(rf"\b{key}\b", text, re.IGNORECASE):
                keywords.add(key)

    return keywords

def assign_points(keywords):
    total_points = sum(POINTS_MAPPING.get(keyword, 0) for keyword in keywords)
    return total_points

def process_certificate(image_path):
    extracted_text = extract_text_from_image(image_path)
    keywords = extract_keywords(extracted_text)
    points = assign_points(keywords)
    return {
        "extractedText": extracted_text,
        "keywords": list(keywords),
        "totalPoints": points
    }

@app.route('/api/process-certificate', methods=['POST'])
def api_process_certificate():
    if 'certificate' not in request.files:
        return jsonify({"error": "No certificate file uploaded"}), 400
    
    file = request.files['certificate']
    
    # Save the uploaded file to a temporary location
    temp_dir = tempfile.mkdtemp()
    temp_file_path = os.path.join(temp_dir, file.filename)
    file.save(temp_file_path)
    
    try:
        # Process the certificate
        result = process_certificate(temp_file_path)
        
        # Clean up temporary file
        os.remove(temp_file_path)
        os.rmdir(temp_dir)
        
        return jsonify(result)
    except Exception as e:
        # Clean up in case of error
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)
        
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) """
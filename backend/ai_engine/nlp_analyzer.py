import logging
from transformers import pipeline

# Suppress verbose huggingface warning logs
logging.getLogger("transformers").setLevel(logging.ERROR)
print("⏳ Loading DistilBERT Model into memory (This happens once!)...")
nlp_classifier = pipeline(
            "sentiment-analysis", 
            model="distilbert-base-uncased-finetuned-sst-2-english"
        )

def calculate_news_shock(headline: str) -> float:
    """
    Evaluates raw textual assets using a Transformer classifier
    and derives a quantitative retail runoff coefficient.
    """
    print(f"\n📰 Scanning Live Headline Data: '{headline}'")
    
    try:
        
        inference_result = nlp_classifier(headline)[0]
        sentiment_label = inference_result['label']
        confidence_score = inference_result['score']
        
        print(f"🧠 NLP Pipeline Inference: {sentiment_label} (Confidence: {round(confidence_score * 100, 2)}%)")
        if sentiment_label == 'NEGATIVE':
            calculated_runoff = 0.10 + (confidence_score * 0.30)
            return round(calculated_runoff, 2)
        else:
            return 0.0
            
    except Exception as error:
        print(f"❌ NLP Classification Error: {str(error)}")
        return 0.0

if __name__ == "__main__":
    print("🔬 Executing Local NLP Standalone Verification...")
    
    # Test Vector A: Catastrophic Market Run
    shock_a = calculate_news_shock("Massive system failure sparks panic as depositors sprint to pull capital from regional banks.")
    print(f"📊 Derived Stress Matrix Scalar: {shock_a * 100}% Runoff")
    
    # Test Vector B: Bullish/Stable Outlook
    shock_b = calculate_news_shock("Central bank increases emergency liquidity reserve requirements to secure national banking sector stability.")
    print(f"📊 Derived Stress Matrix Scalar: {shock_b * 100}% Runoff")
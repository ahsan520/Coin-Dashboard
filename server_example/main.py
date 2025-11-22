from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
import numpy as np
import uvicorn
import os
from pydantic import BaseModel

# sklearn imports
from sklearn.ensemble import RandomForestClassifier
import pickle
import time

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

MODEL_PATH = 'rf_model.pkl'

def fetch_klines(symbol='BTCUSDT', interval='1h', limit=500):
    url = f'https://api.binance.com/api/v3/klines?symbol={symbol}&interval={interval}&limit={limit}'
    r = requests.get(url, timeout=10)
    r.raise_for_status()
    return r.json()

def featurize(closes):
    # returns simple features: last return, ema diff, vol
    closes = np.array(closes)
    returns = np.log(closes[1:] / closes[:-1])
    last_ret = returns[-1]
    ema_short = closes[-12:].mean()
    ema_long = closes[-26:].mean()
    vol = returns[-24:].std()
    return [last_ret, (ema_short - ema_long) / ema_long, vol]

def train_dummy_model():
    # create synthetic training data using historical klines for BTC
    try:
        klines = fetch_klines('BTCUSDT', '1h', 1000)
        closes = [float(k[4]) for k in klines]
    except Exception as e:
        # fallback synthetic
        closes = list(10000 + np.cumsum(np.random.randn(1000)))
    X = []
    y = []
    window = 30
    for i in range(window, len(closes)-24):
        seq = closes[i-window:i+1]
        feat = featurize(seq)
        future = closes[i+24]  # price 24 hours later
        label = 1 if future > closes[i] else 0
        X.append(feat)
        y.append(label)
    if len(X) < 10:
        # fallback synthetic
        X = np.random.randn(100,3).tolist()
        y = (np.random.rand(100) > 0.5).astype(int).tolist()
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X,y)
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(clf, f)
    return clf

# load or train model at startup
if os.path.exists(MODEL_PATH):
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
else:
    model = train_dummy_model()

class PredictResponse(BaseModel):
    coin: str
    prediction: str
    score: float
    confidence: float

@app.get('/api/predict', response_model=PredictResponse)
def predict(coin: str = Query('BTC')):
    sym = coin.upper()
    symbol = 'BTCUSDT' if sym=='BTC' else (sym+'USDT')
    try:
        klines = fetch_klines(symbol, '1h', 200)
        closes = [float(k[4]) for k in klines]
        feat = featurize(closes)
    except Exception as e:
        # fallback
        closes = list(10000 + np.cumsum(np.random.randn(300)))
        feat = featurize(closes)
    proba = model.predict_proba([feat])[0]
    score = float(proba[1] - proba[0])
    prediction = 'UP' if proba[1] > 0.5 else 'DOWN'
    confidence = float(max(proba)*100)
    return PredictResponse(coin=coin, prediction=prediction, score=score, confidence=confidence)

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))

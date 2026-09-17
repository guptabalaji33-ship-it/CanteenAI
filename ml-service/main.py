from datetime import date, timedelta
from collections import defaultdict
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from sklearn.ensemble import RandomForestRegressor

app=FastAPI(title="CanteenAI ML Service")

class PredictRequest(BaseModel):
    items:list
    history:list

@app.get("/health")
def health():
    return {"ok":True,"service":"CanteenAI ML"}

@app.post("/predict")
def predict(req:PredictRequest):
    slots=["12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM"]
    by_item_slot=defaultdict(list)

    for h in req.history:
        dt=str(h["createdAt"])[:10]
        try:
            y,m,d=map(int,dt.split("-"))
            dow=date(y,m,d).weekday()
        except:
            dow=0
        slot=slots.index(h["timeSlot"]) if h["timeSlot"] in slots else 0
        by_item_slot[(h["foodItemId"],slot)].append((dow,h["quantity"]))

    tomorrow=date.today()+timedelta(days=1)
    predictions=[]

    for item in req.items:
        for s,slot_name in enumerate(slots):
            data=by_item_slot.get((item["id"],s),[])
            if len(data)>=4:
                X=np.array([[dow,s] for dow,_ in data])
                y=np.array([q for _,q in data])
                model=RandomForestRegressor(n_estimators=80,random_state=42,min_samples_leaf=2)
                model.fit(X,y)
                pred=float(model.predict([[tomorrow.weekday(),s]])[0])
                confidence=min(0.97,0.62+0.025*len(data))
            else:
                values=[q for (_,q) in data]
                pred=float(np.mean(values)) if values else 5
                confidence=0.55

            predicted=max(1,int(round(pred)))
            recommended=max(predicted+1,int(np.ceil(predicted*1.08)))
            predictions.append({
                "foodItemId":item["id"],
                "date":tomorrow.isoformat(),
                "timeSlot":slot_name,
                "predictedQuantity":predicted,
                "recommendedQty":recommended,
                "confidence":round(confidence,2)
            })
    return {"predictions":predictions}

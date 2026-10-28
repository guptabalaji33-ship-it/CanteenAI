import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.PORT || 4000);
const ML_URL = "https://canteenai-ml-hg3e.onrender.com";

app.get("/health", (_,res)=>res.json({ok:true, service:"CanteenAI API"}));

app.post("/api/login", async (req,res)=>{
  const {email,password}=req.body;
  const user=await prisma.user.findUnique({where:{email}});
  if(!user || user.password!==password) return res.status(401).json({error:"Invalid login"});
  res.json({id:user.id,name:user.name,email:user.email,role:user.role});
});

app.get("/api/menu", async (_,res)=>{
  const items=await prisma.foodItem.findMany({where:{available:true},orderBy:{id:"asc"}});
  res.json(items);
});

app.get("/api/orders", async (req,res)=>{
  const userId=Number(req.query.userId || 1);
  const orders=await prisma.order.findMany({
    where:{userId},
    include:{items:{include:{foodItem:true}}},
    orderBy:{createdAt:"desc"},
    take:30
  });
  res.json(orders);
});

app.post("/api/orders", async (req,res)=>{
  const {userId=1,canteenId=1,pickupSlot,items}=req.body;
  if(!pickupSlot || !Array.isArray(items) || !items.length) return res.status(400).json({error:"Cart is empty"});
  const ids=items.map((x:any)=>Number(x.foodItemId));
  const foods=await prisma.foodItem.findMany({where:{id:{in:ids}}});
  const total=items.reduce((sum:number,x:any)=>{
    const food=foods.find(f=>f.id===Number(x.foodItemId));
    return sum+(food?.price||0)*Number(x.quantity||1);
  },0);
  const order=await prisma.order.create({
    data:{
      userId:Number(userId),canteenId:Number(canteenId),pickupSlot,total,
      items:{create:items.map((x:any)=>({foodItemId:Number(x.foodItemId),quantity:Number(x.quantity)}))}
    },
    include:{items:{include:{foodItem:true}}}
  });
  res.json(order);
});

app.patch("/api/orders/:id", async(req,res)=>{
  const order=await prisma.order.update({where:{id:Number(req.params.id)},data:{status:req.body.status}});
  res.json(order);
});

app.get("/api/dashboard", async (_,res)=>{
  const todayStart=new Date(); todayStart.setHours(0,0,0,0);
  const orders=await prisma.order.findMany({
    where:{createdAt:{gte:todayStart},status:{not:"CANCELLED"}},
    include:{items:{include:{foodItem:true}}}
  });
  const revenue=orders.reduce((s,o)=>s+o.total,0);
  const counts:Record<string,number>={};
  const slots:Record<string,number>={};
  for(const o of orders){
    slots[o.pickupSlot]=(slots[o.pickupSlot]||0)+1;
    for(const i of o.items) counts[i.foodItem.name]=(counts[i.foodItem.name]||0)+i.quantity;
  }
  res.json({
    orders:orders.length,
    revenue,
    popular:Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([name,quantity])=>({name,quantity})),
    slots:Object.entries(slots).map(([slot,orders])=>({slot,orders}))
  });
});

app.get("/api/predictions", async (_,res)=>{
  const rows=await prisma.prediction.findMany({include:{foodItem:true},orderBy:{predictedQuantity:"desc"}});
  res.json(rows);
});

app.post("/api/predictions/generate", async (_, res) => {
  try {
    const foods = await prisma.foodItem.findMany();

    const historical = await prisma.orderItem.findMany({
      include: { order: true, foodItem: true }
    });

    const payload = historical.map(x => ({
      foodItemId: x.foodItemId,
      quantity: x.quantity,
      createdAt: x.order.createdAt,
      timeSlot: x.order.pickupSlot
    }));

       const ollamaResponse = await fetch(
      "http://localhost:11434/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "qwen3.5:4b",
          stream: false,
          format: "json",
          messages: [
            {
              role: "system",
              content: `
You are Qwen AI, the food demand forecasting assistant for CanteenAI.
Analyze the provided historical orders and food items.
Generate forecasts for the next day.
Return valid JSON with a predictions array.
Each prediction must contain:
foodItemId, date, timeSlot, predictedQuantity, recommendedQty, confidence.
Use only foodItemId values provided in the input.
Quantities must be non-negative numbers.
Confidence must be between 0 and 1.
If historical data is insufficient, make conservative estimates.
              `
            },
            {
              role: "user",
              content: JSON.stringify({
                items: foods.map(f => ({
                  id: f.id,
                  name: f.name
                })),
                history: payload
              })
            }
          ]
        })
      }
    );

    if (!ollamaResponse.ok) {
      throw new Error(`Ollama returned HTTP ${ollamaResponse.status}`);
    }

    const ollamaResult = await ollamaResponse.json();
    const result = JSON.parse(ollamaResult.message.content);

    if (!Array.isArray(result.predictions)) {
      throw new Error("Qwen returned an invalid predictions format");
    }

    await prisma.prediction.deleteMany();

    for (const p of result.predictions) {
      await prisma.prediction.create({
        data: {
          foodItemId: p.foodItemId,
          date: p.date,
          timeSlot: p.timeSlot,
          predictedQuantity: Math.max(0, Math.round(Number(p.predictedQuantity) || 0)),
          recommendedQty: Math.max(0, Math.round(Number(p.recommendedQty) || 0)),
          confidence: Math.min(1, Math.max(0, Number(p.confidence) || 0))
        }
      });
    }

    const rows = await prisma.prediction.findMany({
      include: { foodItem: true },
      orderBy: { predictedQuantity: "desc" }
    });

    res.json(rows);
  } catch (e) {
    console.error("ML ERROR:", e);
    res.status(503).json({
      error: e instanceof Error ? e.message : String(e)
    });
  }
});

app.listen(PORT, () => {
  console.log(`CanteenAI API running on http://localhost:${PORT}`);
});

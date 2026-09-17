import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const foods = [
  ["Veg Biryani","Aromatic rice with vegetables",80,"https://images.unsplash.com/photo-1601050690597-df0568f70950?w=900"],
  ["Paneer Roll","Spicy paneer wrapped in a soft roll",60,"https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=900"],
  ["Masala Dosa","Crispy dosa with potato masala",55,"https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=900"],
  ["Veg Burger","Crispy veggie patty burger",70,"https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900"],
  ["Cold Coffee","Chilled creamy coffee",50,"https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=900"],
  ["Samosa","Crispy potato samosa",20,"https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=900"]
] as const;

async function main() {
  await prisma.prediction.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.canteen.deleteMany();
  await prisma.user.deleteMany();

  const student = await prisma.user.create({
    data: { name:"Demo Student", email:"student@demo.com", password:"student123", role:Role.STUDENT }
  });
  const owner = await prisma.user.create({
    data: { name:"Canteen Owner", email:"owner@demo.com", password:"owner123", role:Role.OWNER }
  });

  const canteen = await prisma.canteen.create({
    data: { name:"Campus Central Canteen", location:"University Main Block" }
  });

  for (const f of foods) {
    await prisma.foodItem.create({
      data:{ name:f[0], description:f[1], price:f[2], image:f[3], canteenId:canteen.id }
    });
  }

  const items = await prisma.foodItem.findMany();

  // Synthetic history for the ML demo.
  const slots = ["12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM"];
  const now = new Date();

  for (let d=21; d>=1; d--) {
    const date = new Date(now);
    date.setDate(now.getDate()-d);

    for (let s=0; s<slots.length; s++) {
      for (const item of items) {
        const base = [16,13,11,10,7,25][item.id-1] ?? 10;
        const weekend = [0,6].includes(date.getDay()) ? 0.55 : 1;
        const slotFactor = [0.7,0.9,1.25,1.1,0.65][s];
        const trend = 1 + ((21-d)/21)*0.18;
        const qty = Math.max(1, Math.round(base*weekend*slotFactor*trend + ((d+s+item.id)%5)-2));

        const order = await prisma.order.create({
          data:{
            userId:student.id,
            canteenId:canteen.id,
            pickupSlot:slots[s],
            status:"COMPLETED",
            total:qty*item.price,
            createdAt:date
          }
        });
        await prisma.orderItem.create({
          data:{orderId:order.id, foodItemId:item.id, quantity:qty}
        });
      }
    }
  }

  // One visible demo order for today's dashboard.
  const biryani = items[0];
  const demoOrder = await prisma.order.create({
    data:{
      userId:student.id,
      canteenId:canteen.id,
      pickupSlot:"1:00 PM",
      status:"PLACED",
      total:biryani.price*2,
      items:{create:[{foodItemId:biryani.id, quantity:2}]}
    }
  });

  console.log("Seed complete.");
  console.log("Student:", student.email, student.password);
  console.log("Owner:", owner.email, owner.password);
  console.log("Demo order:", demoOrder.id);
}

main().finally(()=>prisma.$disconnect());

import React,{useEffect,useMemo,useState} from "react";
import {Alert,Image,Pressable,SafeAreaView,ScrollView,StatusBar,StyleSheet,Text,TextInput,View} from "react-native";
import {Ionicons} from "@expo/vector-icons";

const API=process.env.EXPO_PUBLIC_API_URL||"http://localhost:4000";
const GREEN="#16a34a", DARK="#07130d", CARD="#102219", MUTED="#91a99a", WHITE="#f3faf5";

type Food={id:number;name:string;description:string;price:number;image:string};
type CartItem=Food&{quantity:number};

export default function App(){
 const [mode,setMode]=useState<"student"|"owner">("student");
 const [tab,setTab]=useState("home");
 const [foods,setFoods]=useState<Food[]>([]);
 const [cart,setCart]=useState<CartItem[]>([]);
 const [orders,setOrders]=useState<any[]>([]);
 const [dashboard,setDashboard]=useState<any>(null);
 const [predictions,setPredictions]=useState<any[]>([]);
 const [search,setSearch]=useState("");
 const [slot,setSlot]=useState("1:00 PM");
 const [loading,setLoading]=useState(false);

  async function get(path: string, opts?: any) {
  const r = await fetch(API + path, opts);
  const body = await r.text();

  if (!r.ok) {
    throw new Error(`API ${r.status}: ${body}`);
  }

  return body ? JSON.parse(body) : {};
}
 async function load(){
  try{
   setFoods(await get("/api/menu"));
   setOrders(await get("/api/orders?userId=1"));
   setDashboard(await get("/api/dashboard"));
  }catch(e){Alert.alert("Connection problem","Make sure the backend is running and your API URL is correct.");}
 }
 useEffect(()=>{load()},[]);

 const filtered=useMemo(()=>foods.filter(f=>f.name.toLowerCase().includes(search.toLowerCase())),[foods,search]);
 const total=cart.reduce((s,x)=>s+x.price*x.quantity,0);
 const add=(f:Food)=>setCart(c=>{const x=c.find(i=>i.id===f.id);return x?c.map(i=>i.id===f.id?{...i,quantity:i.quantity+1}:i):[...c,{...f,quantity:1}]});
 const remove=(id:number)=>setCart(c=>c.flatMap(x=>x.id===id?(x.quantity>1?[{...x,quantity:x.quantity-1}]:[]):[x]));

 async function place(){
  if(!cart.length)return;
  setLoading(true);
  try{
   await get("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:1,canteenId:1,pickupSlot:slot,items:cart.map(x=>({foodItemId:x.id,quantity:x.quantity}))})});
   setCart([]); await load(); setTab("orders"); Alert.alert("Order placed","Your food will be ready for the selected pickup slot.");
  }catch{Alert.alert("Error","Could not place order.");}
  finally{setLoading(false);}
 }

async function forecast() {
  if (loading) return;

  setLoading(true);

  try {
    const result = await get("/api/predictions/generate", {
      method: "POST",
    });

    setPredictions(Array.isArray(result) ? result : result.predictions ?? []);
    setTab("forecast");
  } catch (e) {
    Alert.alert(
      "Forecast Error",
      e instanceof Error ? e.message : "Could not generate forecast."
    );
  } finally {
    setLoading(false);
  }
}
 const Header=()=>(
  <View style={styles.header}>
   <View><Text style={styles.brand}>Canteen<Text style={{color:GREEN}}>AI</Text></Text><Text style={styles.sub}>SMART CAMPUS FOOD</Text></View>
   <Pressable style={styles.modeBtn} onPress={()=>setMode(mode==="student"?"owner":"student")}><Ionicons name="swap-horizontal" size={18} color={WHITE}/><Text style={styles.modeText}>{mode==="student"?"OWNER":"STUDENT"}</Text></Pressable>
  </View>
 );

 const Bottom=()=>(
  <View style={styles.bottom}>
   {[
    ["home","Home","home-outline"],["cart","Cart","cart-outline"],["orders","Orders","receipt-outline"]
   ].map(([id,label,icon])=><Pressable key={id} onPress={()=>setTab(id)} style={styles.nav}><Ionicons name={(tab===id?icon.replace("-outline",""):icon) as any} size={22} color={tab===id?GREEN:MUTED}/><Text style={[styles.navText,tab===id&&{color:GREEN}]}>{label}</Text>{id==="cart"&&cart.length>0?<View style={styles.badge}><Text style={styles.badgeText}>{cart.length}</Text></View>:null}</Pressable>)}
   <Pressable onPress={()=>{setMode("owner");setTab("owner")}} style={styles.nav}><Ionicons name="analytics-outline" size={22} color={mode==="owner"&&tab==="owner"?GREEN:MUTED}/><Text style={styles.navText}>Owner</Text></Pressable>
  </View>
 );

 const Student=()=>{
  if(tab==="cart") return <Screen title="Your Cart">{cart.length===0?<Empty text="Your cart is empty"/>:<><View>{cart.map(x=><View style={styles.cartRow} key={x.id}><Image source={{uri:x.image}} style={styles.cartImg}/><View style={{flex:1}}><Text style={styles.itemTitle}>{x.name}</Text><Text style={styles.price}>₹{x.price}</Text></View><View style={styles.qty}><Pressable onPress={()=>remove(x.id)}><Text style={styles.q}>−</Text></Pressable><Text style={styles.qnum}>{x.quantity}</Text><Pressable onPress={()=>add(x)}><Text style={styles.q}>+</Text></Pressable></View></View>)}</View><Text style={styles.section}>Pickup slot</Text><Slots/><View style={styles.totalRow}><Text style={styles.totalLabel}>Total</Text><Text style={styles.total}>₹{total}</Text></View><Pressable style={styles.primary} onPress={place} disabled={loading}><Text style={styles.primaryText}>{loading?"PLACING...":"PLACE ORDER"}</Text></Pressable></>}</Screen>;

  if(tab==="orders") return <Screen title="My Orders">{orders.length===0?<Empty text="No orders yet"/>:orders.map(o=><View style={styles.orderCard} key={o.id}><View style={styles.orderTop}><Text style={styles.itemTitle}>Order #{o.id}</Text><Text style={styles.status}>{o.status}</Text></View><Text style={styles.muted}>Pickup • {o.pickupSlot}</Text><Text style={styles.muted}>{o.items.map((i:any)=>`${i.foodItem.name} × ${i.quantity}`).join("  •  ")}</Text><Text style={styles.total}>₹{o.total}</Text></View>)}</Screen>;

  return <Screen title="Campus Canteen"><TextInput value={search} onChangeText={setSearch} placeholder="Search meals, drinks..." placeholderTextColor={MUTED} style={styles.search}/><View style={styles.hero}><View style={{flex:1}}><Text style={styles.heroKicker}>SKIP THE QUEUE</Text><Text style={styles.heroTitle}>Order ahead.{`\n`}Pick up fresh.</Text><Text style={styles.heroSub}>Smart pickup slots keep your break fast.</Text></View><Ionicons name="flash" size={54} color="#b8f7c7"/></View><Text style={styles.section}>Today's menu</Text>{filtered.map(f=><View style={styles.food} key={f.id}><Image source={{uri:f.image}} style={styles.foodImg}/><View style={{flex:1,paddingHorizontal:12}}><Text style={styles.itemTitle}>{f.name}</Text><Text style={styles.muted}>{f.description}</Text><Text style={styles.price}>₹{f.price}</Text></View><Pressable style={styles.add} onPress={()=>add(f)}><Ionicons name="add" size={22} color={DARK}/></Pressable></View>)}</Screen>;
 };

 const Slots=()=> <View style={styles.slots}>{["12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM"].map(x=><Pressable key={x} onPress={()=>setSlot(x)} style={[styles.slot,slot===x&&styles.slotActive]}><Text style={[styles.slotText,slot===x&&{color:DARK,fontWeight:"800"}]}>{x}</Text></Pressable>)}</View>;

const Owner=()=>{
  if(tab!=="forecast") return <Screen title="Owner Intelligence"><Text style={styles.ownerIntro}>Turn historical orders into tomorrow's preparation plan.</Text><View style={styles.stats}><Stat label="Today's Orders" value={dashboard?.orders??"—"} icon="receipt-outline"/><Stat label="Revenue" value={`₹${Math.round(dashboard?.revenue??0)}`} icon="cash-outline"/></View><Text style={styles.section}>Live demand</Text>{(dashboard?.popular||[]).slice(0,4).map((x:any)=><View style={styles.demand} key={x.name}><Text style={styles.itemTitle}>{x.name}</Text><Text style={styles.muted}>{x.quantity} units ordered today</Text><View style={styles.bar}><View style={[styles.barFill,{width:`${Math.min(100,x.quantity*7)}%`}]}/></View></View>)}<Pressable style={styles.aiCard} onPress={forecast}><View style={styles.aiIcon}><Ionicons name="sparkles" size={24} color={DARK}/></View><View style={{flex:1}}><Text style={styles.aiTitle}>AI Demand Forecast</Text><Text style={styles.muted}>Predict tomorrow's food demand and prep quantity</Text></View><Ionicons name="chevron-forward" size={24} color={WHITE}/></Pressable></Screen>;
 return <Screen title="AI Forecast"><Pressable style={styles.primary} onPress={forecast}><Text style={styles.primaryText}>{loading?"ANALYZING...":"REFRESH AI FORECAST"}</Text></Pressable>{predictions.map((p,i)=><View style={styles.pred} key={i}><View style={{flex:1}}><Text style={styles.itemTitle}>{p.foodItem.name}</Text><Text style={styles.muted}>{p.timeSlot} • {Math.round(p.confidence*100)}% confidence</Text></View><View style={{alignItems:"flex-end"}}><Text style={styles.predNum}>{p.predictedQuantity}</Text><Text style={styles.muted}>prepare {p.recommendedQty}</Text></View></View>)}</Screen>};

 const Screen=({title,children}:{title:string;children:any})=><SafeAreaView style={styles.safe}><StatusBar barStyle="light-content"/><Header/><ScrollView contentContainerStyle={styles.content}><Text style={styles.pageTitle}>{title}</Text>{children}</ScrollView><Bottom/></SafeAreaView>;
 const Empty=({text}:{text:string})=><View style={styles.empty}><Ionicons name="basket-outline" size={44} color={MUTED}/><Text style={styles.muted}>{text}</Text></View>;
 const Stat=({label,value,icon}:{label:string;value:any;icon:any})=><View style={styles.stat}><Ionicons name={icon} size={22} color={GREEN}/><Text style={styles.statValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View>;

 return mode==="owner"?<Owner/>:<Student/>;
}

const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:DARK},content:{padding:18,paddingBottom:110},header:{padding:18,paddingTop:10,flexDirection:"row",justifyContent:"space-between",alignItems:"center"},brand:{fontSize:26,fontWeight:"900",color:WHITE},sub:{fontSize:9,color:MUTED,letterSpacing:2,fontWeight:"700"},modeBtn:{flexDirection:"row",gap:7,backgroundColor:CARD,borderWidth:1,borderColor:"#21402d",paddingHorizontal:12,paddingVertical:9,borderRadius:20},modeText:{color:WHITE,fontSize:11,fontWeight:"800"},pageTitle:{fontSize:29,fontWeight:"900",color:WHITE,marginBottom:18},search:{backgroundColor:CARD,borderRadius:15,padding:15,color:WHITE,fontSize:15,marginBottom:14},hero:{backgroundColor:"#0d3b20",borderRadius:24,padding:20,flexDirection:"row",alignItems:"center",marginBottom:20},heroKicker:{color:"#b8f7c7",fontSize:10,fontWeight:"900",letterSpacing:1.5},heroTitle:{color:WHITE,fontSize:27,fontWeight:"900",marginVertical:7},heroSub:{color:"#c5dfcc",fontSize:12,lineHeight:18},section:{color:WHITE,fontSize:18,fontWeight:"900",marginTop:12,marginBottom:12},food:{backgroundColor:CARD,borderRadius:19,padding:10,marginBottom:11,flexDirection:"row",alignItems:"center"},foodImg:{width:78,height:78,borderRadius:14},itemTitle:{color:WHITE,fontWeight:"800",fontSize:15},muted:{color:MUTED,fontSize:12,lineHeight:18},price:{color:"#9ef0b3",fontWeight:"900",fontSize:16,marginTop:4},add:{width:40,height:40,borderRadius:13,backgroundColor:"#9ef0b3",alignItems:"center",justifyContent:"center"},bottom:{position:"absolute",bottom:0,left:0,right:0,height:78,backgroundColor:"#0a1910",borderTopWidth:1,borderTopColor:"#1d3626",flexDirection:"row",justifyContent:"space-around",paddingTop:10},nav:{alignItems:"center",minWidth:65},navText:{fontSize:10,color:MUTED,marginTop:4,fontWeight:"700"},badge:{position:"absolute",top:-2,right:11,backgroundColor:"#ef4444",width:17,height:17,borderRadius:9,alignItems:"center",justifyContent:"center"},badgeText:{color:WHITE,fontSize:9,fontWeight:"900"},cartRow:{backgroundColor:CARD,borderRadius:17,padding:10,marginBottom:10,flexDirection:"row",alignItems:"center"},cartImg:{width:58,height:58,borderRadius:12,marginRight:10},qty:{flexDirection:"row",alignItems:"center",gap:12},q:{color:GREEN,fontSize:25,fontWeight:"900"},qnum:{color:WHITE,fontWeight:"900"},slots:{flexDirection:"row",flexWrap:"wrap",gap:8},slot:{paddingHorizontal:11,paddingVertical:10,borderRadius:13,backgroundColor:CARD},slotActive:{backgroundColor:"#9ef0b3"},slotText:{color:WHITE,fontSize:11},totalRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginVertical:20},totalLabel:{color:WHITE,fontSize:17,fontWeight:"700"},total:{color:"#9ef0b3",fontSize:22,fontWeight:"900"},primary:{backgroundColor:GREEN,padding:16,borderRadius:16,alignItems:"center",marginBottom:12},primaryText:{color:WHITE,fontWeight:"900",letterSpacing:1},orderCard:{backgroundColor:CARD,padding:16,borderRadius:18,marginBottom:10},orderTop:{flexDirection:"row",justifyContent:"space-between",marginBottom:8},status:{color:"#9ef0b3",fontWeight:"800",fontSize:11},empty:{padding:45,alignItems:"center",gap:12},ownerIntro:{color:"#c5dfcc",fontSize:14,lineHeight:22,marginBottom:15},stats:{flexDirection:"row",gap:10,marginBottom:15},stat:{flex:1,backgroundColor:CARD,padding:16,borderRadius:18},statValue:{color:WHITE,fontSize:25,fontWeight:"900",marginTop:7},demand:{backgroundColor:CARD,padding:15,borderRadius:16,marginBottom:9},bar:{height:7,backgroundColor:"#20392a",borderRadius:5,marginTop:9,overflow:"hidden"},barFill:{height:7,backgroundColor:GREEN,borderRadius:5},aiCard:{backgroundColor:"#0d3b20",padding:15,borderRadius:19,flexDirection:"row",alignItems:"center",gap:12,marginTop:10},aiIcon:{width:45,height:45,borderRadius:15,backgroundColor:"#9ef0b3",alignItems:"center",justifyContent:"center"},aiTitle:{color:WHITE,fontSize:16,fontWeight:"900",marginBottom:3},pred:{backgroundColor:CARD,padding:15,borderRadius:17,marginBottom:9,flexDirection:"row",alignItems:"center"},predNum:{color:"#9ef0b3",fontSize:28,fontWeight:"900"}
});

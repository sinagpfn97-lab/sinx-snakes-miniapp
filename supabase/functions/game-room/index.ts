import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const authClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INVITE_BASE =
  "https://sinagpfn97-lab.github.io/sinx-snakes-miniapp/";

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function fail(message: string, status = 400) {
  return response({ success: false, error: message }, status);
}

function normalizeUsername(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function validUsername(username: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(username);
}

function getEmail(username: string): string {
  return `${username}@users.sinx.invalid`;
}

async function hashToken(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

async function authenticate(req: Request) {
  const authorization = req.headers.get("Authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new Error("ابتدا وارد حساب SINX شوید");
  }

  const accessToken = match[1];

  const { data, error } = await supabase.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error("نشست شما معتبر نیست؛ دوباره وارد حساب شوید");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, username")
    .eq("user_id", data.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("پروفایل حساب پیدا نشد");
  }

  return {
    userId: data.user.id,
    username: profile.username as string,
  };
}

async function getRoomSnapshot(roomCode: string, userId: string) {
  const code = roomCode.trim().toUpperCase();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (roomError) throw roomError;
  if (!room) throw new Error("اتاق پیدا نشد");

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select(
      "id, player_name, seat, position, is_host, auth_user_id, account_username",
    )
    .eq("room_id", room.id)
    .order("seat", { ascending: true });

  if (playersError) throw playersError;

  const myPlayer = (players || []).find(
    (p: any) => p.auth_user_id === userId,
  );

  if (!myPlayer) {
    throw new Error("شما عضو این اتاق نیستید");
  }

  const safePlayers = (players || []).map((p: any) => ({
    id: p.id,
    player_name: p.player_name,
    seat: p.seat,
    position: p.position,
    is_host: p.is_host,
  }));

  const gameState = room.game_state || {};
  const { hands: privateHands, ...publicGameState } = gameState;

  return {
    success: true,
    room: { ...room, game_state: publicGameState },
    players: safePlayers,
    mySeat: myPlayer.seat,
    myHand: Array.isArray(privateHands) ? (privateHands[myPlayer.seat] || []) : [],
    pendingMove: gameState.pending_move || null,
    lastRoll: gameState.last_roll || null,
    lastMove: gameState.last_move || null,
  };
}

// =========================================
// ثبت‌نام با نام کاربری و رمز عبور
// =========================================

async function registerAccount(body: any) {
  const username = normalizeUsername(body.username);
  const password = String(body.password ?? "");

  if (!validUsername(username)) {
    throw new Error(
      "نام کاربری باید ۳ تا ۲۰ کاراکتر و فقط شامل حروف انگلیسی کوچک، عدد و _ باشد",
    );
  }

  if (password.length < 8) {
    throw new Error("رمز عبور جدید باید حداقل ۸ کاراکتر باشد");
  }

  const { data, error } = await authClient.auth.signUp({
    email: getEmail(username),
    password,
    options: {
      data: { username },
    },
  });

  if (error) {
    if (
      error.message.toLowerCase().includes("already") ||
      error.message.toLowerCase().includes("registered")
    ) {
      throw new Error("این نام کاربری قبلاً ثبت شده است");
    }

    throw new Error(error.message);
  }

  if (!data.session) {
    throw new Error(
      "ثبت‌نام انجام شد اما نشست ساخته نشد؛ تنظیم Confirm email را بررسی کنید",
    );
  }

  return {
    success: true,
    message: "حساب SINX با موفقیت ساخته شد",
    session: data.session,
    user: {
      id: data.user?.id,
      username,
    },
  };
}

// =========================================
// ورود به حساب
// =========================================

async function loginAccount(body: any) {
  const username = normalizeUsername(body.username);
  const password = String(body.password ?? "");

  if (!validUsername(username) || !password) {
    throw new Error("نام کاربری یا رمز عبور نامعتبر است");
  }

  const { data, error } = await authClient.auth.signInWithPassword({
    email: getEmail(username),
    password,
  });

  if (error || !data.session) {
    throw new Error("نام کاربری یا رمز عبور اشتباه است");
  }

  return {
    success: true,
    message: "با موفقیت وارد شدید",
    session: data.session,
    user: {
      id: data.user.id,
      username,
    },
  };
}

// =========================================
// ساخت اتاق
// =========================================

async function createRoom(
  body: any,
  userId: string,
  username: string,
) {
  const maxPlayers = 4;
  const gameType = ["ludo", "hokm"].includes(body.gameType) ? body.gameType : "snakes";
  const roundsToWin = [1, 3, 5, 7].includes(Number(body.roundsToWin)) ? Number(body.roundsToWin) : 3;

  if (![2, 3, 4].includes(maxPlayers)) {
    throw new Error("ظرفیت اتاق باید ۲، ۳ یا ۴ نفر باشد");
  }

  const randomToken = crypto.randomUUID();
  const tokenHash = await hashToken(randomToken);

  let room: any = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();

    const { data, error } = await supabase
      .from("rooms")
      .insert({
        code,
        status: "waiting",
        max_players: maxPlayers,
        current_turn: 0,
        game_state: gameType === "ludo" ? { game_type: "ludo", ludo_rules_version: 2, ludo_tokens: { "0":[0,0,0,0], "1":[0,0,0,0], "2":[0,0,0,0], "3":[0,0,0,0] } } : gameType === "hokm" ? { game_type: "hokm", rounds_to_win: roundsToWin, series_points: [0,0], round_no: 1, phase: "waiting" } : { game_type: "snakes" },
      })
      .select("*")
      .single();

    if (!error && data) {
      room = data;
      break;
    }

    if (error && error.code !== "23505") {
      throw error;
    }
  }

  if (!room) {
    throw new Error("ساخت کد اتاق ناموفق بود؛ دوباره تلاش کنید");
  }

  const { error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      player_name: username,
      account_username: username,
      auth_user_id: userId,
      seat: 0,
      position: 0,
      is_host: true,
      token_hash: tokenHash,
    });

  if (playerError) {
    await supabase.from("rooms").delete().eq("id", room.id);
    throw playerError;
  }

  const snapshot = await getRoomSnapshot(room.code, userId);

  return {
    ...snapshot,
    roomCode: room.code,
    playerToken: randomToken,
    inviteLink: `${INVITE_BASE}?room=${room.code}`,
  };
}

// =========================================
// ورود به اتاق
// =========================================

async function joinRoom(
  body: any,
  userId: string,
  username: string,
) {
  const code = String(body.roomCode || "")
    .trim()
    .toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(code)) {
    throw new Error("کد اتاق معتبر نیست");
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (roomError) throw roomError;
  if (!room) throw new Error("اتاق پیدا نشد");

  const { data: existing, error: existingError } = await supabase
    .from("players")
    .select("id, seat")
    .eq("room_id", room.id)
    .eq("auth_user_id", userId)
    .maybeSingle();

  if (existingError) throw existingError;

  // اگر قبلاً عضو اتاق بوده، دوباره بازیکن نساز
  if (existing) {
    return await getRoomSnapshot(code, userId);
  }

  if (room.status !== "waiting") {
    throw new Error("این بازی شروع شده و امکان ورود بازیکن جدید وجود ندارد");
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("seat")
    .eq("room_id", room.id);

  if (playersError) throw playersError;

  if ((players || []).length >= room.max_players) {
    throw new Error("ظرفیت این اتاق تکمیل شده است");
  }

  const occupiedSeats = new Set(
    (players || []).map((p: any) => Number(p.seat)),
  );

  let seat = -1;

  for (let i = 0; i < room.max_players; i++) {
    if (!occupiedSeats.has(i)) {
      seat = i;
      break;
    }
  }

  if (seat < 0) {
    throw new Error("صندلی خالی در اتاق وجود ندارد");
  }

  const randomToken = crypto.randomUUID();
  const tokenHash = await hashToken(randomToken);

  const { error: insertError } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      player_name: username,
      account_username: username,
      auth_user_id: userId,
      seat,
      position: 0,
      is_host: false,
      token_hash: tokenHash,
    });

  if (insertError) {
    if (insertError.code === "23505") {
      throw new Error("این حساب قبلاً وارد اتاق شده است");
    }
    throw insertError;
  }

  return {
    ...(await getRoomSnapshot(code, userId)),
    roomCode: code,
    playerToken: randomToken,
  };
}


const HOKM_SUITS = ["♠", "♣", "♦", "♥"];
const HOKM_RANKS = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const HOKM_VALUE: Record<string, number> = Object.fromEntries(HOKM_RANKS.map((r,i)=>[r,i+2]));
const HOKM_RED = ["♦","♥"];
function hokmShuffle<T>(items:T[]):T[]{ for(let i=items.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];} return items; }
function hokmStartHand(previous:any, hakem:number, roundNo:number){
  const deck=hokmShuffle(HOKM_SUITS.flatMap(s=>HOKM_RANKS.map(r=>({suit:s,rank:r,id:r+s,value:HOKM_VALUE[r]}))));
  const hands=[[],[],[],[]] as any[][];
  for(let i=0;i<5;i++) for(let k=0;k<4;k++) hands[(hakem+k)%4].push(deck.pop());
  hands.forEach(hand=>hand.sort((a,b)=>HOKM_SUITS.indexOf(a.suit)-HOKM_SUITS.indexOf(b.suit)||b.value-a.value));
  return {...previous, game_type:"hokm", phase:"choose", round_no:roundNo, hakem, turn:hakem, leader:hakem, trump:null, hands, trick:[], tricks:[0,0], turn_started_at:Date.now(), last_action_at:Date.now(), last_trick_winner:null};
}
function hokmLegalCards(gs:any, seat:number){
 const hand=gs.hands?.[seat]||[], lead=gs.trick?.[0]?.card?.suit;
 if(!lead)return hand;
 const follow=hand.filter((card:any)=>card.suit===lead);
 return follow.length?follow:hand;
}
function hokmChooseTrump(hand:any[]){
 return HOKM_SUITS.map(s=>({s,count:hand.filter(c=>c.suit===s).length,top:hand.filter(c=>c.suit===s).reduce((n,c)=>n+(c.value>=12?c.value:0),0)})).sort((a,b)=>b.count-a.count||b.top-a.top)[0].s;
}
function hokmApplyTrump(gs:any, seat:number, suit:string){
 if(gs.phase!=="choose"||seat!==gs.hakem)throw new Error("فقط حاکم می‌تواند خال حکم را انتخاب کند");
 if(!HOKM_SUITS.includes(suit))throw new Error("خال حکم نامعتبر است");
 const used=new Set(gs.hands.flat().map((c:any)=>c.id));
 const rest=hokmShuffle(HOKM_SUITS.flatMap(s=>HOKM_RANKS.map(r=>({suit:s,rank:r,id:r+s,value:HOKM_VALUE[r]}))).filter(c=>!used.has(c.id)));
 for(let k=0;k<4;k++)for(let i=0;i<8;i++)gs.hands[(gs.hakem+k)%4].push(rest.pop());
 gs.hands.forEach((hand:any[])=>hand.sort((a,b)=>HOKM_SUITS.indexOf(a.suit)-HOKM_SUITS.indexOf(b.suit)||b.value-a.value));
 gs.trump=suit;gs.phase="play";gs.turn=gs.hakem;gs.leader=gs.hakem;gs.turn_started_at=Date.now();gs.last_action_at=Date.now();
}
function hokmApplyPlay(gs:any, seat:number, cardId:string){
 if(gs.phase!=="play"||seat!==gs.turn)throw new Error("الان نوبت شما نیست");
 const hand=gs.hands[seat]||[], card=hand.find((c:any)=>c.id===cardId);
 if(!card)throw new Error("این کارت در دست شما نیست");
 if(!hokmLegalCards(gs,seat).some((c:any)=>c.id===cardId))throw new Error("باید از خال شروع‌شده کارت بدهید");
 gs.hands[seat]=hand.filter((c:any)=>c.id!==cardId);
 gs.trick=[...(gs.trick||[]),{seat,card}];
 gs.last_action_at=Date.now();
 if(gs.trick.length<4){gs.turn=(seat+1)%4;gs.turn_started_at=Date.now();return;}
 const lead=gs.trick[0].card.suit;
 const winner=gs.trick.reduce((best:any,item:any)=>{
   const a=item.card,b=best.card;
   const strength=(c:any)=>c.suit===gs.trump?100+c.value:c.suit===lead?50+c.value:c.value;
   return strength(a)>strength(b)?item:best;
 }).seat;
 const winningTeam=winner%2===0?0:1;
 gs.tricks[winningTeam]=(gs.tricks[winningTeam]||0)+1;
 gs.last_trick_winner=winner;gs.trick=[];
 if(gs.tricks[winningTeam]>=7){
   const losingTeam=1-winningTeam, kot=gs.tricks[losingTeam]===0;
   const points=kot?(winningTeam===(gs.hakem%2)?2:3):1;
   gs.series_points[winningTeam]=(gs.series_points[winningTeam]||0)+points;
   gs.last_hand={winner_team:winningTeam,points,kot, tricks:[...gs.tricks]};
   gs.phase=gs.series_points[winningTeam]>=Number(gs.rounds_to_win||3)?"finished":"round_end";
   gs.match_winner=gs.phase==="finished"?winningTeam:null;
   gs.turn_started_at=Date.now();
 }else{gs.turn=winner;gs.leader=winner;gs.turn_started_at=Date.now();}
}
async function hokmAction(roomCode:string,userId:string,action:string,payload:any={}){
 const code=roomCode.trim().toUpperCase();
 const {data:room,error}=await supabase.from("rooms").select("*").eq("code",code).single();
 if(error||!room||room.status!=="playing"||room.game_state?.game_type!=="hokm")throw new Error("اتاق حکم فعال نیست");
 const {data:player,error:pe}=await supabase.from("players").select("seat").eq("room_id",room.id).eq("auth_user_id",userId).single();
 if(pe||!player)throw new Error("شما عضو این اتاق نیستید");
 const gs=structuredClone(room.game_state);
 if(action==="trump")hokmApplyTrump(gs,player.seat,String(payload.suit||""));
 else if(action==="play")hokmApplyPlay(gs,player.seat,String(payload.cardId||""));
 else throw new Error("حرکت حکم نامعتبر است");
 const {error:ue}=await supabase.from("rooms").update({game_state:gs,current_turn:gs.turn,updated_at:new Date().toISOString()}).eq("id",room.id);
 if(ue)throw ue;
 return await getRoomSnapshot(code,userId);
}
async function hokmAuto(room:any){
 const gs=structuredClone(room.game_state||{});
 if(gs.phase==="round_end"&&Date.now()-Number(gs.turn_started_at||Date.now())>=2200){
   const winner=Number(gs.last_hand?.winner_team??0), last=Number(gs.last_trick_winner??winner);
   const hakem=(last%2===(winner%2))?last:(winner===0?0:1);
   const next=hokmStartHand(gs,hakem,Number(gs.round_no||1)+1);
   const {error}=await supabase.from("rooms").update({game_state:next,current_turn:hakem,updated_at:new Date().toISOString()}).eq("id",room.id);
   if(error)throw error;
   return {success:true,bot:false,newHand:true};
 }
 if(!["choose","play"].includes(gs.phase)||Date.now()-Number(gs.turn_started_at||Date.now())<15000)return {success:false,skipped:true};
 const seat=Number(gs.turn);
 if(gs.phase==="choose")hokmApplyTrump(gs,seat,hokmChooseTrump(gs.hands[seat]||[]));
 else {
   const legal=hokmLegalCards(gs,seat);
   if(!legal.length)return {success:false,skipped:true};
   // Conservative automatic play: lowest legal card, retaining high cards when possible.
   const card=[...legal].sort((a,b)=>a.value-b.value)[0];
   hokmApplyPlay(gs,seat,card.id);
 }
 gs.last_bot_action_at=Date.now();
 const {error}=await supabase.from("rooms").update({game_state:gs,current_turn:gs.turn,updated_at:new Date().toISOString()}).eq("id",room.id);
 if(error)throw error;
 return {success:true,bot:true,seat};
}

// =========================================
// شروع بازی
// =========================================

async function startGame(
  roomCode: string,
  userId: string,
) {
  const code = roomCode.trim().toUpperCase();

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code)
    .single();

  if (roomError || !room) {
    throw new Error("اتاق پیدا نشد");
  }

  const { data: hostPlayer, error: hostError } = await supabase
    .from("players")
    .select("id, is_host, seat")
    .eq("room_id", room.id)
    .eq("auth_user_id", userId)
    .single();

  if (hostError || !hostPlayer || !hostPlayer.is_host) {
    throw new Error("فقط سازنده اتاق می‌تواند بازی را شروع کند");
  }

  if (room.status !== "waiting") {
    throw new Error("این بازی قبلاً شروع شده است");
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("seat")
    .eq("room_id", room.id);

  if (playersError) throw playersError;

  const gameType = room.game_state?.game_type || "snakes";
  const requiredPlayers = gameType === "hokm" ? 4 : 2;
  if ((players || []).length !== (gameType === "hokm" ? 4 : (players || []).length) || (players || []).length < requiredPlayers) {
    throw new Error(gameType === "hokm" ? "برای شروع حکم باید هر چهار صندلی پر باشد" : "برای شروع بازی حداقل دو بازیکن لازم است");
  }
  const firstSeat = gameType === "hokm" ? 0 : Math.min(...(players || []).map((p: any) => Number(p.seat)));
  const initialState = gameType === "hokm"
    ? hokmStartHand(room.game_state, Math.floor(Math.random()*4), 1)
    : (room.game_state || { game_type: "snakes" });

  const { error: updateError } = await supabase
    .from("rooms")
    .update({
      status: "playing",
      current_turn: gameType === "hokm" ? initialState.turn : firstSeat,
      game_state: initialState,
      updated_at: new Date().toISOString(),
    })
    .eq("id", room.id);

  if (updateError) throw updateError;

  return await getRoomSnapshot(code, userId);
}

// =========================================
// تاس و حرکت؛ توابع SQL مرحله قبل
// =========================================

async function rollDice(roomCode: string, userId: string) {
  const code = roomCode.trim().toUpperCase();

  const { data: room } = await supabase.from("rooms").select("game_state").eq("code", code).maybeSingle();
  const isLudo = room?.game_state?.game_type === "ludo";
  const { data, error } = isLudo
    ? await supabase.rpc("roll_ludo_room", { p_room_code: code, p_user_id: userId })
    : await supabase.rpc("roll_game_room", { p_room_code: code, p_user_id: userId });

  if (error) throw error;

  const snapshot = await getRoomSnapshot(code, userId);

  return {
    ...data,
    ...snapshot,
    dice: data.dice,
    rollId: data.rollId,
    fromPosition: data.fromPosition,
    targetPosition: data.targetPosition,
  };
}

async function movePlayer(roomCode: string, userId: string, tokenIndex?: number) {
  const code = roomCode.trim().toUpperCase();

  const { data: room } = await supabase.from("rooms").select("game_state").eq("code", code).maybeSingle();
  const isLudo = room?.game_state?.game_type === "ludo";
  const { data, error } = isLudo
    ? await supabase.rpc("move_ludo_room", { p_room_code: code, p_user_id: userId, p_token_index: Number(tokenIndex) })
    : await supabase.rpc("move_game_room", { p_room_code: code, p_user_id: userId });

  if (error) throw error;

  const snapshot = await getRoomSnapshot(code, userId);

  return {
    ...data,
    ...snapshot,
    dice: data.dice,
    rollId: data.rollId,
    fromPosition: data.fromPosition,
    targetPosition: data.targetPosition,
    finalPosition: data.finalPosition,
    event: data.event,
    eventFrom: data.eventFrom,
    eventTo: data.eventTo,
    path: data.path,
    nextTurn: data.nextTurn,
  };
}


async function leaveRoom(roomCode: string, userId: string) {
  const { data, error } = await supabase.rpc("leave_game_room", {
    p_room_code: roomCode.trim().toUpperCase(),
    p_user_id: userId,
  });
  if (error) throw error;
  return data;
}

async function heartbeatRoom(roomCode: string, userId: string) {
  const code = roomCode.trim().toUpperCase();
  const { data: room, error: roomError } = await supabase
    .from("rooms").select("id").eq("code", code).maybeSingle();
  if (roomError) throw roomError;
  if (!room) throw new Error("اتاق پیدا نشد");
  const { data, error } = await supabase
    .from("players").update({ last_seen_at: new Date().toISOString(), bot_controlled: false })
    .eq("room_id", room.id).eq("auth_user_id", userId)
    .select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("شما عضو این اتاق نیستید");
  return { success: true };
}

async function autoPlayRoom(roomCode: string, userId: string) {
  // Require the caller to be an actual room member before allowing idle-turn processing.
  await getRoomSnapshot(roomCode, userId);
  const { data: room } = await supabase.from("rooms").select("*").eq("code", roomCode.trim().toUpperCase()).maybeSingle();
  if (room?.game_state?.game_type === "hokm") return await hokmAuto(room);
  const { data, error } = await supabase.rpc(room?.game_state?.game_type === "ludo" ? "auto_play_ludo_room" : "auto_play_game_room", {
    p_room_code: roomCode.trim().toUpperCase(),
  });
  if (error) throw error;
  return data;
}

// =========================================
// ورودی اصلی Edge Function
// =========================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return fail("فقط درخواست POST پشتیبانی می‌شود", 405);
  }

  try {
    const body = await req.json();
    const action = String(body.action || "");

    // ثبت‌نام و ورود قبل از احراز هویت نشست
    if (action === "register" || action === "signup") {
      return response(await registerAccount(body));
    }

    if (action === "login") {
      return response(await loginAccount(body));
    }

    // تمام عملیات بازی نیازمند نشست معتبر هستند
    const { userId, username } = await authenticate(req);

    const roomCode = String(body.roomCode || "");

    switch (action) {
      case "create":
        return response(
          await createRoom(body, userId, username),
        );

      case "join":
        return response(
          await joinRoom(body, userId, username),
        );

      case "state":
        return response(
          await getRoomSnapshot(roomCode, userId),
        );

      case "leave":
        return response(await leaveRoom(roomCode, userId));

      case "heartbeat":
        return response(await heartbeatRoom(roomCode, userId));
      case "auto":
        return response(await autoPlayRoom(roomCode, userId));

      case "hokm_trump":
        return response(await hokmAction(roomCode, userId, "trump", body));

      case "hokm_play":
        return response(await hokmAction(roomCode, userId, "play", body));

      case "start":
        return response(
          await startGame(roomCode, userId),
        );

      case "roll":
        return response(
          await rollDice(roomCode, userId),
        );

      case "move":
        return response(
          await movePlayer(roomCode, userId, body.tokenIndex),
        );

      default:
        return fail("دستور ناشناخته است");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "خطای ناشناخته سرور";

    console.error("SINX game-room error:", error);

    return fail(message);
  }
});
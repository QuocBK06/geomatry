
// =============================
// CAC BIEN CHINH TOAN GAME
// =============================

const khungNgoai = document.getElementById("khungNgoai");
const khungGame = document.getElementById("khungGame");
const nhanVat = document.getElementById("nhanVat");
const vatCam = document.getElementById("vatCam");
const cong = document.getElementById("cong");
const cauHoi = document.getElementById("cauHoi");
const thongBao = document.getElementById("thongBao");
const hintNhat = document.getElementById("hintNhat");

const amThanhNhat = document.getElementById("amThanhNhat");
const amThanhMoCong = document.getElementById("amThanhMoCong");
const amThanhQuaMan = document.getElementById("amThanhQuaMan");
const amThanhDie = document.getElementById("amThanhDie");

let manHienTai = 1;
let diemSo = 0;
function capNhatDiem(){
  const diemDiv = document.getElementById("diemSo");
  if (diemDiv) {
    diemDiv.textContent = "⭐ Điểm: " + diemSo;
    diemDiv.style.animation = "none";
    diemDiv.offsetHeight; // reset animation
    diemDiv.style.animation = "diemTang 0.4s ease";
  }
}



// bai toan cho cong
let soA_cong = 0;
let soB_cong = 0;
let dapAnCong = 0;

// bai toan cho boss dac biet
let soA_boss = 0;
let soB_boss = 0;
let dapAnBoss = 0;

let x = 50;   // toa do ngang nhan vat
let y = 0;    // toa do doc nhan vat
let vanTocX = 0;
let vanTocY = 0;
let dungTrenNen = true;

let vatDangCam = null;     // thong tin vat pham nhan vat dang cam (object {loai,giaTri})
let nodeDangCam = null;    // khong dung nua cho hi hien, chi su dung vatCam.textContent
let ketThucMan = false;
let chet = false;

let congDaMo = false;
let ganItemDeNhat = null;  // DOM item gan nhan vat
let huongNhin = 1;         // 1 la phai, -1 la trai (cho nem dan B)

const tocDo = 4;
const lucNhay = 13;
const trongLuc = 0.5;

const phim = { trai:false, phai:false };

let danhSachNen = [];      // nen va nen di chuyen
let danhSachGai = [];      // {x,y,w,h,chaIndex?} neu gai gan tren nen moving
let danhSachQuaiThuong = []; // quai thuong duoi dat
let quaiBoss = null;         // duy nhat 1 boss dac biet
let nodeQuaiBoss = null;     // DOM boss
let danhSachItem = [];       // tat ca item (DOM + data)
let danBay = [];             // cac vien dan (item do nem ra) dang bay tren khungGame

// =============================
// DIEU KHIEN PHIM (A/D/W hoặc mũi tên)
// =============================
document.addEventListener("keydown", e => {
  const k = e.key.toLowerCase();

  // chặn scroll mặc định cho các phím di chuyển
  if(["a","d","w","arrowleft","arrowright","arrowup","n","m","b"].includes(k))
    e.preventDefault();

  // di sang phai
  if(k === "d" || k === "arrowright"){
    phim.phai = true;
    phim.trai = false; // tránh lỗi “kẹt A”
    huongNhin = 1;
  }

  // di sang trai
  if(k === "a" || k === "arrowleft"){
    phim.trai = true;
    phim.phai = false; // tránh lỗi “kẹt D”
    huongNhin = -1;
  }

  // nhay (W, ↑ hoặc Space)
if((k === "w" || k === "arrowup" || k === " ") && dungTrenNen && !chet && !ketThucMan){
  e.preventDefault(); // chặn scroll trang
  vanTocY = lucNhay;
  dungTrenNen = false;
  nhanVat.style.transform = "scaleX(0.8) scaleY(1.2)";
}
// =============================
// PHIM HANH DONG (N hoặc R)
// =============================
if((k === "n" || k === "r") && !chet && !ketThucMan){
  if(!vatDangCam){
    // không cầm gì => nhặt
    thuNhatItemGan();
  } else {
    // đang cầm item => hành động theo loại
    if(vatDangCam.loai === "doBoss"){
      nemDan(); // chỉ ném để tấn công boss, không mở cổng
    } else {
      // các loại khác (doCong hoặc sai) thì đặt xuống
      thuThaItem();
    }
  }
}
});
document.addEventListener("keyup", e => {
  const k = e.key.toLowerCase();

  if(k === "d" || k === "arrowright") phim.phai = false;
  if(k === "a" || k === "arrowleft") phim.trai = false;
});

// =============================
// HAM HO TRO
// =============================

// random tu min den max
function randFloat(min,max){
  return min + Math.random()*(max-min);
}
function randInt(min,max){
  return Math.floor(randFloat(min,max+1));
}

// kiem tra overlap hinh chu nhat
function overlap(ax,ay,aw,ah,bx,by,bw,bh){
  return !(ax+aw<bx || ax>bx+bw || ay+ah<by || ay>by+bh);
}
// kiểm tra xem vị trí (x, y) có nằm trong gai không
function viTriTrongGai(x, y) {
  for (const g of danhSachGai) {
    if (overlap(x, y, 30, 30, g.x, g.y, g.w, g.h)) {
      return true;
    }
  }
  return false;
}

// kiểm tra xem vị trí (x, y) có đè lên item khác không
function viTriItemHopLe(x, y) {
  for (const it of danhSachItem) {
    const ix = parseFloat(it.node.style.left);
    const iy = parseFloat(it.node.style.bottom);
    if (overlap(x, y, 30, 30, ix, iy, 30, 30)) {
      return false; // bị đè
    }
  }
  return true;
}

// kiem tra nen overlap
function nenOverlap(n1,n2){
  return overlap(n1.x,n1.y,n1.w,n1.h,n2.x,n2.y,n2.w,n2.h);
}

// tao text thong bao
function setThongBao(msg,mau){
  thongBao.textContent = msg;
  if(mau) thongBao.style.color = mau;
}

// an hint nhat item
function hideHint(){
  hintNhat.style.display="none";
}

// hien hint nhat item
function showHint(xItem,yItem){
  hintNhat.textContent="Nhấn n hoặc r để nhặt ";
  hintNhat.style.left=xItem+"px";
  hintNhat.style.bottom=(yItem+35)+"px";
  hintNhat.style.display="block";
}

// =============================
// SINH MAN MOI
// =============================
function taoMan(){
///  Đổi màu nền trời + nền đất theo lớp học (1–5)
switch (lopHoc) {
  case 1: // Sáng sớm
    khungGame.style.background = "linear-gradient(to top, #c8e6c9 0%, #81c784 100%)"; // trời xanh lá nhạt
    document.documentElement.style.setProperty('--mau-dat', '#a1887f'); // đất nâu sáng
    nhanVat.style.background = "#e53935"; // đỏ tươi
    document.documentElement.style.setProperty('--mau-quai-thuong', '#4caf50'); // xanh lá
    document.documentElement.style.setProperty('--mau-quai-boss', '#ff9800'); // cam nhạt
    break;

  case 2: // Buổi trưa
    khungGame.style.background = "linear-gradient(to top, #81d4fa 0%, #4fc3f7 100%)"; // trời xanh trong
    document.documentElement.style.setProperty('--mau-dat', '#8d6e63'); // đất nâu trung bình
    nhanVat.style.background = "#2196f3"; // xanh dương
    document.documentElement.style.setProperty('--mau-quai-thuong', '#ffeb3b'); // vàng
    document.documentElement.style.setProperty('--mau-quai-boss', '#d32f2f'); // đỏ
    break;

  case 3: // Buổi chiều
    khungGame.style.background = "linear-gradient(to top, #ffe0b2 0%, #ffb74d 100%)"; // vàng cam chiều
    document.documentElement.style.setProperty('--mau-dat', '#795548'); // đất nâu cam
    nhanVat.style.background = "#ff9800"; // cam
    document.documentElement.style.setProperty('--mau-quai-thuong', '#8d6e63'); // nâu đất
    document.documentElement.style.setProperty('--mau-quai-boss', '#6a1b9a'); // tím đậm
    break;

  case 4: // Hoàng hôn
    khungGame.style.background = "linear-gradient(to top, #f8bbd0 0%, #ce93d8 100%)"; // hồng tím hoàng hôn
    document.documentElement.style.setProperty('--mau-dat', '#6d4c41'); // đất nâu đậm
    nhanVat.style.background = "#ab47bc"; // hồng tím
    document.documentElement.style.setProperty('--mau-quai-thuong', '#7b1fa2'); // tím
    document.documentElement.style.setProperty('--mau-quai-boss', '#1a237e'); // xanh đậm
   
    break;

  case 5: // Ban đêm
    khungGame.style.background = "linear-gradient(to top, #0d47a1 0%, #1a237e 100%)"; // xanh đậm đêm
    document.documentElement.style.setProperty('--mau-dat', '#3e2723'); // đất rất tối
    nhanVat.style.background = "#fafafa"; // trắng sáng
    document.documentElement.style.setProperty('--mau-quai-thuong', '#0d47a1'); // xanh đen
    document.documentElement.style.setProperty('--mau-quai-boss', '#b71c1c'); // đỏ đậm
    break;
}



  // reset
  setThongBao("", "#d00");
  // xoa tat ca con cu tru item dang co (tru nhanVat, cong, lopCo, may, hint)
  khungGame.querySelectorAll(".nen,.gai,.quaiThuong,.quaiBoss,.vatPham,.vatPhamDo,.danItem,.bongPhepToan")
    .forEach(el=>el.remove());

  danhSachNen=[];
  danhSachGai=[];
  danhSachQuaiThuong=[];
  quaiBoss=null;
  nodeQuaiBoss=null;
  danhSachItem=[];
  danBay=[];

  ganItemDeNhat=null;
  hideHint();

  vatDangCam=null;
  vatCam.style.display="none";
  nhanVat.style.transform = "scale(1,1)";
  nhanVat.classList.remove("chet");

  x=50;
  y=0;
  vanTocY=0;
  dungTrenNen=true;
  ketThucMan=false;
  chet=false;
  congDaMo=false;
  cong.classList.remove("mo","flasher");
  cong.textContent="Cong";

  // =============================
// TẠO BÀI TOÁN THEO CẤP ĐỘ LỚP
// =============================
let phepTinhCong = "+";
let phepTinhBoss = "+";

switch (lopHoc) {
  case 1: // Toán cộng trừ trong phạm vi 20
    soA_cong = randInt(1, 18);
    soB_cong = randInt(1, 18 - soA_cong);
    if (Math.random() < 0.5) {
      phepTinhCong = "+";
      dapAnCong = soA_cong + soB_cong;
    } else {
      phepTinhCong = "-";
      dapAnCong = soA_cong;
      soA_cong = soA_cong + soB_cong;
    }

    // Boss = phép cộng lớn hơn, ví dụ 9+10
    soA_boss = randInt(5, 12);
    soB_boss = randInt(5, 12);
    phepTinhBoss = "+";
    dapAnBoss = soA_boss + soB_boss;
    break;

  case 2: // Cộng trừ có nhớ và phép nhân chia 2–9
    if (Math.random() < 0.5) {
      // Cộng trừ trong phạm vi 100
      soA_cong = randInt(10, 90);
      soB_cong = randInt(1, 50);
      phepTinhCong = Math.random() < 0.5 ? "+" : "-";
      dapAnCong = phepTinhCong === "+" ? soA_cong + soB_cong : soA_cong - soB_cong;
    } else {
      // Nhân chia
      const n = randInt(2, 9);
      const m = randInt(2, 9);
      phepTinhCong = "×";
      soA_cong = n;
      soB_cong = m;
      dapAnCong = n * m;
    }
    soA_boss = randInt(2, 9);
    soB_boss = randInt(2, 9);
    phepTinhBoss = "×";
    dapAnBoss = soA_boss * soB_boss;
    break;

  case 3: {
  // Lớp 3: phép chia hết, cộng/trừ đơn giản, và nhân cho boss
  const type3 = randInt(1, 3);
  if (type3 === 1) {
    const chiaCho = [2,3,4,5][randInt(0,3)];
    const k = randInt(2, 15); 
    soA_cong = chiaCho * k;
    soB_cong = chiaCho;
    phepTinhCong = "÷";
    dapAnCong = k; 
  } else if (type3 === 2) {
    // BÀI MỞ CỔNG DẠNG CỘNG/TRỪ SỐ TỰ NHIÊN
    soA_cong = randInt(10, 50);
    soB_cong = randInt(1, 20);
    if (Math.random() < 0.5) {
      phepTinhCong = "+";
      dapAnCong = soA_cong + soB_cong;
    } else {
      phepTinhCong = "-";
      // đảm bảo không âm
      if (soB_cong > soA_cong) {
        // đảo lại
        const t = soA_cong;
        soA_cong = soB_cong;
        soB_cong = t;
      }
      dapAnCong = soA_cong - soB_cong;
    }
  } else {
    // BÀI MỞ CỔNG DẠNG "BƯỚC TIẾP THEO TRONG DÃY"
    // ví dụ: 4, 7, 10, ?  (cộng 3 mỗi lần)
    // hiển thị dạng "a, b, ... cộng mấy ?"
    const start = randInt(1, 10);
    const step = randInt(2, 6);
    const next1 = start + step;
    const next2 = next1 + step;
    // ta sẽ hỏi "start, next1, ? (tăng đều bao nhiêu)"
    // nhưng để khớp cơ chế hiện tại (soA_cong, soB_cong, phépTinhCong)
    // ta hiển thị như cộng step cho số trước
    soA_cong = next1;
    soB_cong = step;
    phepTinhCong = "+";
    dapAnCong = next1 + step; // chính là next2
  }

  // BOSS Ở LỚP 3: phép nhân / chia đơn giản (nguyên)
  if (Math.random() < 0.7) {
    phepTinhBoss = "×";
    soA_boss = randInt(2,12);
    soB_boss = randInt(2,12);
    dapAnBoss = soA_boss * soB_boss;
  } else {
    // boss dạng chia hết
    const chiaChoBoss = [2,3,4,5][randInt(0,3)];
    const kBoss = randInt(2,15);
    phepTinhBoss = "÷";
    soA_boss = chiaChoBoss * kBoss;
    soB_boss = chiaChoBoss;
    dapAnBoss = kBoss;
  }

  break;
}

 case 4: // Tính nhanh biểu thức, thời gian, đồng hồ
  // Bài thường: cộng nhanh số lớn
  soA_cong = randInt(10, 60);
  soB_cong = randInt(10, 60);
  phepTinhCong = "+";
  dapAnCong = soA_cong + soB_cong;

  // Bài boss: giờ + phút → hiển thị kiểu "6 giờ 3 phút"
  soA_boss = randInt(1, 11);   // giờ
  soB_boss = randInt(1, 59);   // phút
  phepTinhBoss = "Giờ + phút";
  dapAnBoss = `${soA_boss}g${soB_boss}p`; // ✅ hiển thị dạng giờ phút
  break;


  case 5: // Chu vi, diện tích
    soA_cong = randInt(4, 20);
    phepTinhCong = "Chu vi hình vuông (cạnh ×4)";
    soB_cong = 4;
    dapAnCong = soA_cong * 4;

    soA_boss = randInt(4, 10);
    phepTinhBoss = "Diện tích hình vuông (cạnh²)";
    dapAnBoss = soA_boss * soA_boss;
    break;
}

if (phepTinhBoss === "+") dapAnBoss = soA_boss + soB_boss;

// hiển thị câu hỏi trên thanh
cauHoi.textContent =
  `Lớp ${lopHoc} | Màn ${manHienTai}: Mở cổng = ${soA_cong} ${phepTinhCong} ${soB_cong} ; Tiêu diệt boss = ${soA_boss} ${phepTinhBoss} ${soB_boss} ?`;


//  Tính đáp án thật theo loại phép toán
if (phepTinhCong === "+") dapAnCong = soA_cong + soB_cong;
else if (phepTinhCong === "-") dapAnCong = soA_cong - soB_cong;
else if (phepTinhCong === "×") dapAnCong = soA_cong * soB_cong;
else if (phepTinhCong === "÷") dapAnCong = Math.floor(soA_cong / soB_cong);

// Boss (tính đáp án hiển thị trên item đỏ)
if (phepTinhBoss === "+") {
  dapAnBoss = soA_boss + soB_boss;
} else if (phepTinhBoss === "-") {
  dapAnBoss = soA_boss - soB_boss;
} else if (phepTinhBoss === "×") {
  dapAnBoss = soA_boss * soB_boss;
} else if (phepTinhBoss === "÷") {
  dapAnBoss = Math.floor(soA_boss / soB_boss);
} else if (phepTinhBoss === "Giờ + phút") {
  // dùng định dạng ngắn gọn g/p thay vì "giờ ... phút"
  dapAnBoss = `${soA_boss}g${soB_boss}p`;
} else if (phepTinhBoss === "Diện tích hình vuông (cạnh²)") {
  dapAnBoss = soA_boss * soA_boss;
}


// tránh trùng nhau
if (dapAnBoss === dapAnCong) dapAnBoss += randInt(1, 3);




  // tham so man
  const chieuCaoToiDa = 200;
  const soNenThuong = 6;
  const soNenDiChuyen = 6;

  // tao nen thuong
  for(let i=0;i<soNenThuong;i++){
    let hopLe=false;
    let nenMoi;
    while(!hopLe){
      const rong = randInt(100,220);
      const viTriX = randFloat(200, khungGame.clientWidth - rong - 200);
      const viTriY = randFloat(50,50+chieuCaoToiDa);
      nenMoi={
        x:viTriX,
        y:viTriY,
        w:rong,
        h:20,
        diChuyen:false
      };
      hopLe=true;
      for(const n of danhSachNen){
        if(nenOverlap(nenMoi,n)){hopLe=false;break;}
      }
    }
    danhSachNen.push(nenMoi);

    const div=document.createElement("div");
    div.className="nen";
    div.style.left=nenMoi.x+"px";
    div.style.bottom=nenMoi.y+"px";
    div.style.width=nenMoi.w+"px";
    khungGame.appendChild(div);
  }

  // tao nen di chuyen
  const caoDaDung=[];
  for(let i=0;i<soNenDiChuyen;i++){
    let hopLe=false;
    let nenMoi;
    let baoVe=0;
    while(!hopLe && baoVe<200){
      baoVe++;
      const rong = randInt(90,180);
      const viTriY = randFloat(60,60+chieuCaoToiDa);
      const trai = randFloat(200, khungGame.clientWidth - rong - 600);
      const phai = trai + randFloat(300,450);
      const viTriX = randFloat(trai, phai-rong);

      nenMoi={
        x:viTriX,
        y:viTriY,
        w:rong,
        h:20,
        diChuyen:true,
        huong: Math.random()<0.5?1:-1,
        trai:trai,
        phai:phai,
        tocDo:0.8
      };
      hopLe=true;

      // khong de len nen khac
      for(const n of danhSachNen){
        if(nenOverlap(nenMoi,n)){hopLe=false;break;}
      }
      // tranh chong nen di chuyen cung do cao
      if(hopLe){
        for(const cao of caoDaDung){
          if(Math.abs(cao-nenMoi.y)<40){hopLe=false;break;}
        }
      }
    }
    if(hopLe){
      danhSachNen.push(nenMoi);
      caoDaDung.push(nenMoi.y);

      const div=document.createElement("div");
      div.className="nen moving";
      div.style.left=nenMoi.x+"px";
      div.style.bottom=nenMoi.y+"px";
      div.style.width=nenMoi.w+"px";
      khungGame.appendChild(div);
    }
  }

  // tao gai
  const soGai=5;
  for(let i=0;i<soGai;i++){
    // 50% gai tren dat, 50% gai tren nen
    let gaiX,gaiY,chaNenMovingIndex=null;
    if(Math.random()<0.5){
      gaiX = randFloat(150, khungGame.clientWidth-200);
      gaiY = 0;
    }else{
      // pick nen bat ky
      const nenBatKyIndex = randInt(0,danhSachNen.length-1);
      const nenBatKy = danhSachNen[nenBatKyIndex];
      gaiX = nenBatKy.x + randFloat(0, nenBatKy.w-30);
      gaiY = nenBatKy.y + 20;
      // neu nenBatKy diChuyen thi gai phai di chuyen theo
      if(nenBatKy.diChuyen){
        chaNenMovingIndex = nenBatKyIndex;
      }
    }
    const gaiObj={x:gaiX,y:gaiY,w:30,h:30,cha:chaNenMovingIndex};
    danhSachGai.push(gaiObj);

    const gaiDiv=document.createElement("div");
    gaiDiv.className="gai";
    gaiDiv.style.left=gaiObj.x+"px";
    gaiDiv.style.bottom=gaiObj.y+"px";
    khungGame.appendChild(gaiDiv);
    gaiObj.node=gaiDiv;
  }

  
  // tao quai thuong duoi dat (thua ra va di cham hon)
const soQuaiThuong = 3; // so luong quai
for (let i = 0; i < soQuaiThuong; i++) {
  // tao vi tri trai-phai xa nhau de quai khong tu tap
  const trai = 300 + i * 400; // moi quai cach nhau 700px
  const phai = trai + 200;    // vung di chuyen 300px
  const batDau = randFloat(trai, phai - 35);

  const q = {
    x: batDau,
    y: 0,
    w: 35,
    h: 30,
    trai: trai,
    phai: phai,
    huong: Math.random() < 0.5 ? 1 : -1,
    tocDo: 0.5 
  };

  danhSachQuaiThuong.push(q);
  const qDiv = document.createElement("div");
  qDiv.className = "quaiThuong";
  qDiv.style.left = q.x + "px";
  qDiv.style.bottom = q.y + "px";
  qDiv.innerHTML = '<div class="matQuai">:(</div>';
  khungGame.appendChild(qDiv);
  q.node = qDiv;
}
  // tao boss dac biet 1 con
  {
    const trai = randFloat(600, khungGame.clientWidth-400);
    const phai = trai + randFloat(180,260);
    const batDau = randFloat(trai, phai-45);
    quaiBoss={
      x:batDau,
      y:0,
      w:45,
      h:38,
      trai:trai,
      phai:phai,
      huong: Math.random()<0.5?1:-1,
      tocDo:0.5,
      song:true
    };
    const bossDiv=document.createElement("div");
    bossDiv.className="quaiBoss";
    bossDiv.style.left=quaiBoss.x+"px";
    bossDiv.style.bottom=quaiBoss.y+"px";
    bossDiv.innerHTML='<div class="matQuaiBoss">>:)</div>';
    khungGame.appendChild(bossDiv);
    // bong phep toan hien soA_boss + soB_boss
    let chuDeBoss;

if (phepTinhBoss === "Giờ + phút") {
  // hiển thị gọn kiểu 5g + 23p = ?
  chuDeBoss = `${soA_boss}g + ${soB_boss}p = ?`;
} else if (phepTinhBoss === "Diện tích hình vuông (cạnh²)") {
  chuDeBoss = `Diện tích hình vuông cạnh ${soA_boss} = ?`;
} else if (phepTinhBoss === "×") {
  chuDeBoss = `${soA_boss} × ${soB_boss} = ?`;
} else if (phepTinhBoss === "÷") {
  chuDeBoss = `${soA_boss} ÷ ${soB_boss} = ?`;
} else if (phepTinhBoss === "+") {
  chuDeBoss = `${soA_boss} + ${soB_boss} = ?`;
} else if (phepTinhBoss === "-") {
  chuDeBoss = `${soA_boss} - ${soB_boss} = ?`;
} else {
  chuDeBoss = `${soA_boss} ${phepTinhBoss} ${soB_boss} = ?`;
}

const bong=document.createElement("div");
bong.className="bongPhepToan";
bong.textContent = chuDeBoss;
khungGame.appendChild(bong);


    quaiBoss.node = bossDiv;
    quaiBoss.nodeBong = bong;
  }
// ===== TIỆN ÍCH: tạo 1 giá trị sai gần đáp án đúng =====
function taoGiaTriSaiGan(dapAnCong, dapAnBoss) {
  // Lớp 4: luôn là dạng thời gian giờ/phút -- tạo sai gần
  if (lopHoc === 4) {
    // Lấy giờ & phút gốc từ đề boss
    // dapAnBoss bây giờ dạng "10g15p"
    // tách số giờ/phút từ đó
    let gioGoc = 0;
    let phutGoc = 0;

    if (typeof dapAnBoss === "string" && dapAnBoss.includes("g") && dapAnBoss.includes("p")) {
      // ví dụ "10g15p"
      const parts = dapAnBoss.split("g");
      gioGoc = parseInt(parts[0]);
      phutGoc = parseInt(parts[1].replace("p",""));
    } else {
      // fallback nếu vì lý do gì đó dapAnBoss lại là số
      gioGoc = randInt(1,11);
      phutGoc = randInt(0,59);
    }

    let saiGio = gioGoc + randInt(-1,1);
    let saiPhut = phutGoc + randInt(-5,5);

    // chuẩn hoá phút
    if (saiPhut < 0) {
      saiPhut += 60;
      saiGio--;
    } else if (saiPhut >= 60) {
      saiPhut -= 60;
      saiGio++;
    }
    if (saiGio < 0) saiGio = 0;

    return `${saiGio}g${saiPhut}p`;
  }
  // Các lớp khác: số bình thường lệch nhẹ ±3 quanh đáp án thực
  const goc = (typeof dapAnCong === "number")
      ? dapAnCong
      : (typeof dapAnBoss === "number")
      ? dapAnBoss
      : parseInt(dapAnBoss); // fallback nếu là chuỗi số

  let v = goc + randInt(-3,3);
  if (v < 0) v = 0;
  return v;
}


  // tao ITEM
  // 1) item do dung cho cong (dapAnCong)
  // 2) item do dung cho boss (dapAnBoss)
  // 3) item vang sai

function taoViTriItemHopLe(yeuCauXaNguoi){
  let viTriX = 200, viTriY = 0, nenIndex = null;
  let hopLe = false;
  let baoVe = 0;

  while (!hopLe && baoVe < 500) {
    baoVe++;

    // 30% sinh trên đất, 70% trên nền
    if (Math.random() < 0.3) {
      viTriX = randFloat(200, khungGame.clientWidth - 200);
      viTriY = 0;
      nenIndex = null;
    } else {
      nenIndex = randInt(0, danhSachNen.length - 1);
      const nenChon = danhSachNen[nenIndex];
      viTriX = nenChon.x + randFloat(0, nenChon.w - 30);
      viTriY = nenChon.y + 20;
    }

    // tránh spawn gần người chơi
    if (yeuCauXaNguoi && viTriX < 450) continue;

    // tránh trong gai
    if (viTriTrongGai(viTriX, viTriY)) continue;

    // tránh chồng item khác
    let trungItem = false;
    for (const it of danhSachItem) {
      if (overlap(viTriX, viTriY, 30, 30, it.x, it.y, 30, 30)) {
        trungItem = true;
        break;
      }
    }
    if (trungItem) continue;

    hopLe = true;
  }

  // Nếu vẫn chưa tìm được vị trí hợp lệ, fallback ra chỗ an toàn
  if (!hopLe) {
    viTriX = randFloat(200, khungGame.clientWidth - 200);
    viTriY = 0;
    nenIndex = null;
  }

  return { x: viTriX, y: viTriY, nenIndex: nenIndex };
}
  // tao item do cong (chìa khóa vàng)
{
  const vitri = taoViTriItemHopLe(true); // phai xa nguoi choi
  const nodeDoCong = document.createElement("div");
  nodeDoCong.className="vatPhamVang"; // đổi màu vàng
  nodeDoCong.textContent = dapAnCong;

    nodeDoCong.style.left = vitri.x+"px";
    nodeDoCong.style.bottom = vitri.y+"px";
    khungGame.appendChild(nodeDoCong);

    const obj={
      node:nodeDoCong,
      loai:"doCong", // dung de mo cong
      giaTri:dapAnCong,
      x:vitri.x,
      y:vitri.y,
      nenIndex:vitri.nenIndex // co the null
    };
    danhSachItem.push(obj);
  }

  // tao item do boss
  {
    const vitri = taoViTriItemHopLe(true); // cung xa
    const nodeDoBoss = document.createElement("div");
    nodeDoBoss.className="vatPhamDo";
    nodeDoBoss.textContent = dapAnBoss;
    nodeDoBoss.style.left = vitri.x+"px";
    nodeDoBoss.style.bottom = vitri.y+"px";
    khungGame.appendChild(nodeDoBoss);

    const obj={
      node:nodeDoBoss,
      loai:"doBoss", // dan tieu diet boss
      giaTri:dapAnBoss,
      x:vitri.x,
      y:vitri.y,
      nenIndex:vitri.nenIndex
    };
    danhSachItem.push(obj);
  }
// tao them 2 item do "giả boss": nhìn giống hàng xịn, để troll người chơi
for (let i = 0; i < 2; i++) {
  const vitri = taoViTriItemHopLe(false);

  let giaTriTroll;

  if (lopHoc === 4) {
    // lớp 4: boss dùng dạng giờ/phút => tạo giờ/phút gần giống
    // dùng hàm taoGiaTriSaiGan để tạo giá trị giờ/phút lệch nhẹ
    // đảm bảo khác đáp án boss thật
    do {
      giaTriTroll = taoGiaTriSaiGan(null, dapAnBoss); // trả về "XgYp"
    } while (giaTriTroll === dapAnBoss);
  } else {
    // các lớp khác: boss là số -> tạo số lệch nhẹ quanh dapAnBoss
    if (typeof dapAnBoss === "number") {
      do {
        giaTriTroll = taoGiaTriSaiGan(dapAnBoss, dapAnBoss);
      } while (giaTriTroll === dapAnBoss);
    } else {
      // fallback nếu vì lý do nào đó dapAnBoss không phải số
      do {
        giaTriTroll = taoGiaTriSaiGan(dapAnCong, dapAnBoss);
      } while (giaTriTroll === dapAnBoss);
    }
  }

  const nodeDoSai = document.createElement("div");
  nodeDoSai.className = "vatPhamDo"; 
  nodeDoSai.textContent = giaTriTroll;
  nodeDoSai.style.left = vitri.x + "px";
  nodeDoSai.style.bottom = vitri.y + "px";
  khungGame.appendChild(nodeDoSai);

  const obj = {
    node: nodeDoSai,
    loai: "doBoss", 
    giaTri: giaTriTroll,
    x: vitri.x,
    y: vitri.y,
    nenIndex: vitri.nenIndex
  };
  danhSachItem.push(obj);
}

// tạo giá trị sai để nhái chìa khóa mở cổng
function taoGiaTriSaiChoCong(dapAnCong) {
  // dapAnCong luôn là dạng số (ví dụ 27, 42,...)
  // ta tạo số lệch nhẹ ±3 để nhìn giống thật
  let v = dapAnCong + randInt(-3, 3);
  if (v < 0) v = 0;
  return v;
}


// Tạo list item vàng sai (nhìn giống chìa khóa mở cổng nhưng sai)
const giaTriSai = [];
while (giaTriSai.length < 4) {
  // luôn sinh giá trị kiểu "chìa khóa" (số), KHÔNG phải giờ/phút
  let v = taoGiaTriSaiChoCong(dapAnCong);

  // tránh trùng đáp án đúng cổng và tránh lặp
  if (
    v !== dapAnCong &&
    !giaTriSai.includes(v)
  ) {
    giaTriSai.push(v);
  }
}

// spawn các item vàng sai
for (const v of giaTriSai) {
  const vitri = taoViTriItemHopLe(false);

  const nodeSai = document.createElement("div");
  nodeSai.className = "vatPham"; // vàng
  nodeSai.textContent = v;
  nodeSai.style.left = vitri.x + "px";
  nodeSai.style.bottom = vitri.y + "px";
  khungGame.appendChild(nodeSai);

  danhSachItem.push({
    node: nodeSai,
    loai: "sai",
    giaTri: v,
    x: vitri.x,
    y: vitri.y,
    nenIndex: vitri.nenIndex
  });
}


  
}

// =============================
// NHAT ITEM (phim N)
// =============================
function thuNhatItemGan(){
  if(vatDangCam) return; // dang cam roi
  if(!ganItemDeNhat) return;

  // tim object item khop voi DOM ganItemDeNhat
  const idx = danhSachItem.findIndex(it=>it.node===ganItemDeNhat);
  if(idx===-1) return;

  const it = danhSachItem[idx];

  // nhat
  vatDangCam = {
    loai: it.loai,
    giaTri: it.giaTri
  };

  // xoa node vat pham tren map vi da nhat len
  it.node.remove();
  danhSachItem.splice(idx,1);
  ganItemDeNhat = null;
  hideHint();

  // cap nhat hinh tren dau
  vatCam.textContent = vatDangCam.giaTri;
  vatCam.style.display="block";
 if(vatDangCam.loai === "doBoss"){
  vatCam.style.background = "#ff2b2b";
  vatCam.style.color = "#fff";
}else{
  vatCam.style.background = "yellow";
  vatCam.style.color = "#000";
}


  if(amThanhNhat){
    amThanhNhat.currentTime=0;
    amThanhNhat.play().catch(()=>{});
  }

  setThongBao("Bạn đang nhặt vật phẩm " + vatDangCam.giaTri,"#222");
}

// =============================
// THA ITEM (phim r hoặc n)
// =============================
function thuThaItem(){
  if(!vatDangCam) return;

  // vị trí thả ban đầu quanh nhân vật
  const viTriX = x + 10;
  const viTriY = y + 10;

  // nếu đang cầm chìa khóa mở cổng (doCong)
  if(vatDangCam.loai === "doCong"){
    const oDe = document.getElementById("oDeItem");
    const oX = khungGame.clientWidth - 110;

    // nếu đứng trước ô thì đặt vào ô
    // vùng kiểm tra rộng hơn để dễ đặt vào ô
if (x > oX - 120 && x < oX + 80 && y < 150) {

      oDe.textContent = vatDangCam.giaTri;
      oDe.style.background = "#ffe65c";
      // giữ nguyên màu vàng khi đặt xuống
      oDe.style.background = "yellow";
      oDe.style.color = "#000";
      oDe.style.boxShadow = "0 0 8px rgba(255,220,0,0.5)";


      oDe.style.color = "#000";
      oDe.style.boxShadow = "0 0 10px rgba(255,200,0,0.6)";

            //  Cho phép mở cổng nếu boss đã chết hoặc chìa khóa đã đặt trước
      if (!quaiBoss || !quaiBoss.song) {
        moCong();
      } else {
        // nếu boss chưa chết, đánh dấu đã đặt chìa khóa trước
        oDe.dataset.datChiaKhoa = "true";
        setThongBao("Chìa khóa đã được đặt, hãy tiêu diệt boss để mở cổng!", "#c90");
      }


      // đã đặt vào ô => không spawn thêm item trên đất

    } else {
      // nếu không đứng đúng ô thì thả xuống đất 1 bản sao (chìa khóa rơi xuống)
      // chống spam vô hạn
      if (!vatDangCam._daTha) {
        vatDangCam._daTha = true;

        const nodeRoi = document.createElement("div");
nodeRoi.className = "vatPham"; 
nodeRoi.style.background = "yellow";
nodeRoi.style.color = "#000";

        nodeRoi.textContent = vatDangCam.giaTri;
        nodeRoi.style.left = viTriX + "px";
        nodeRoi.style.bottom = viTriY + "px";
        // nếu bị đè lên item khác hoặc gai, dịch sang phải 1 chút
let dich = 0;
while ((!viTriItemHopLe(viTriX + dich, viTriY) || viTriTrongGai(viTriX + dich, viTriY)) && dich < 120) {
  dich += 10;
}
nodeRoi.style.left = (viTriX + dich) + "px";

        khungGame.appendChild(nodeRoi);

        danhSachItem.push({
          node: nodeRoi,
          loai: "doCong",
          giaTri: vatDangCam.giaTri,
          x: viTriX,
          y: viTriY,
          nenIndex: null,
          vy: 0
        });

        setThongBao("Đã thả vật phẩm");
      }
    }

    // SAU KHI XỬ LÝ doCong -> tay trống
    vatDangCam = null;
    vatCam.style.display = "none";
    return;
  }

  // nếu đang cầm item đỏ bắn boss (doBoss)
  if(vatDangCam.loai === "doBoss"){
    // thả xuống đất như 1 item đỏ bình thường
    const nodeRoi = document.createElement("div");
    nodeRoi.className = "vatPhamDo";
    nodeRoi.textContent = vatDangCam.giaTri;
    nodeRoi.style.left = viTriX + "px";
    nodeRoi.style.bottom = viTriY + "px";
    // nếu bị đè lên item khác hoặc gai, dịch sang phải 1 chút
let dich = 0;
while ((!viTriItemHopLe(viTriX + dich, viTriY) || viTriTrongGai(viTriX + dich, viTriY)) && dich < 120) {
  dich += 10;
}
nodeRoi.style.left = (viTriX + dich) + "px";

    khungGame.appendChild(nodeRoi);

    danhSachItem.push({
      node: nodeRoi,
      loai: "doBoss",
      giaTri: vatDangCam.giaTri,
      x: viTriX,
      y: viTriY,
      nenIndex: null,
      vy: 0
    });

    // bỏ khỏi tay
    vatDangCam = null;
    vatCam.style.display = "none";
    setThongBao("Đã thả vũ khí xuống đất.", "#222");
    return;
  }

  // nếu đang cầm item sai (vàng)
  if(vatDangCam.loai === "sai"){
    const nodeRoi = document.createElement("div");
    nodeRoi.className = "vatPham";
    nodeRoi.textContent = vatDangCam.giaTri;
    nodeRoi.style.left = viTriX + "px";
    nodeRoi.style.bottom = viTriY + "px";// nếu bị đè lên item khác hoặc gai, dịch sang phải 1 chút
let dich = 0;
while ((!viTriItemHopLe(viTriX + dich, viTriY) || viTriTrongGai(viTriX + dich, viTriY)) && dich < 120) {
  dich += 10;
}
nodeRoi.style.left = (viTriX + dich) + "px";

    khungGame.appendChild(nodeRoi);

    danhSachItem.push({
      node: nodeRoi,
      loai: "sai",
      giaTri: vatDangCam.giaTri,
      x: viTriX,
      y: viTriY,
      nenIndex: null,
      vy: 0
    });

    // bỏ khỏi tay
    vatDangCam = null;
    vatCam.style.display = "none";
    setThongBao("Đã thả vật phẩm.", "#222");
    return;
  }
}



// =============================
// NEM DAN (phim n hoac r)
// =============================

function nemDan() {
  // chi nem duoc item doBoss
  if (!vatDangCam || vatDangCam.loai !== "doBoss") return;

  // tao vien dan (item duoc nem)
  const danNode = document.createElement("div");
  danNode.className = "danItem";
  danNode.textContent = vatDangCam.giaTri;
  danNode.style.left = (x + 10) + "px";
  danNode.style.bottom = (y + 20) + "px";
  khungGame.appendChild(danNode);

  const danObj = {
    node: danNode,
    x: x + 10,
    y: y + 20,
    vx: huongNhin * 6,
    vy: 3,
    hieuLucBoss: vatDangCam.giaTri === dapAnBoss,
    daChamDat: false
  };
  // giới hạn đạn không vượt ranh giới màn hình
    danObj.x = Math.max(10, Math.min(danObj.x, khungGame.clientWidth - 30));

  danBay.push(danObj);

  // xoa item khoi tay
  vatDangCam = null;
  vatCam.style.display = "none";

  setThongBao("Đã Ném", "#222");
}


// =============================
// MO CONG
// =============================
function moCong(){
  congDaMo=true;
  cong.classList.add("flasher");
  if(amThanhMoCong){
    amThanhMoCong.currentTime=0;
    amThanhMoCong.play().catch(()=>{});
  }
  // sau khi chay nhap nhay 1s thi giu trang thai mo vang
  setTimeout(()=>{
    cong.classList.remove("flasher");
    cong.classList.add("mo");
    cong.textContent=" >>Mở";
  },1000);
  setThongBao("Cong da mo! Buoc vao de qua man.","#0a0");
}

// =============================
// CAP NHAT NEN DI CHUYEN
// va keo item/gai dang dan theo nen do
// =============================
function capNhatNenDiChuyen(){
  const nenDom = khungGame.querySelectorAll(".nen");
  for(let i=0;i<danhSachNen.length;i++){
    const nen=danhSachNen[i];
    if(!nen.diChuyen) continue;
    nen.x += nen.tocDo*nen.huong;
    if(nen.x<nen.trai){
      nen.x=nen.trai;
      nen.huong=1;
    }
    if(nen.x+nen.w>nen.phai){
      nen.x=nen.phai-nen.w;
      nen.huong=-1;
    }
    nenDom[i].style.left=nen.x+"px";
    for(const g of danhSachGai){
      if(g.cha===i){
        if(g.offsetX===undefined){
          g.offsetX = g.x - nen.x;
        }
        g.x = nen.x + g.offsetX;
        g.node.style.left=g.x+"px";
        g.node.style.bottom=g.y+"px";
      }
    }

    // keo item nao dat tren nen nay
    for(const it of danhSachItem){
      if(it.nenIndex===i){
        if(it.offsetX===undefined){
          it.offsetX = it.x - nen.x;
        }
        it.x = nen.x + it.offsetX;
        it.node.style.left = it.x+"px";
        it.node.style.bottom = it.y+"px";
      }
    }
  }
}

// =============================
// CAP NHAT QUAI THUONG
// =============================
function capNhatQuaiThuong(){
  for(const q of danhSachQuaiThuong){
    q.x += q.tocDo*q.huong;
    if(q.x<q.trai){
      q.x=q.trai;
      q.huong=1;
    }
    if(q.x+q.w>q.phai){
      q.x=q.phai-q.w;
      q.huong=-1;
    }
    q.node.style.left=q.x+"px";
    q.node.style.bottom=q.y+"px";

    // va cham nhan vat -> chet
    if(!chet && overlap(x,y,40,40,q.x,q.y,q.w,q.h)){
      chetNhanVat("Bị quái ăn 💀");
    }
  }
}

// =============================
// CAP NHAT BOSS
// =============================
function capNhatBoss(){
  if(!quaiBoss || !quaiBoss.song) return;
  const q=quaiBoss;
  q.x += q.tocDo*q.huong;
  if(q.x<q.trai){
    q.x=q.trai;
    q.huong=1;
  }
  if(q.x+q.w>q.phai){
    q.x=q.phai-q.w;
    q.huong=-1;
  }
  q.node.style.left=q.x+"px";
  q.node.style.bottom=q.y+"px";
  // bong phep toan theo boss
  q.nodeBong.style.left=(q.x+q.w/2)+"px";
  q.nodeBong.style.bottom=(q.y+40)+"px";
  // va cham nhan vat -> chet
  if(!chet && overlap(x,y,40,40,q.x,q.y,q.w,q.h)){
    chetNhanVat("Bị quái đặc biệt giết 💀");
  }
}

// =============================
// CAP NHAT GAI (va cham voi nhan vat)
// =============================
function kiemTraGai(){
  for(const g of danhSachGai){
    if(!chet && overlap(x,y,40,40,g.x,g.y,g.w,g.h)){
      chetNhanVat("Chạm gai 💀");
      break;
    }
  }
}

// =============================
// CAP NHAT DAN BAY
// =============================
// dan bay co trong luc, check va cham boss dac biet
function capNhatDanBay(){
  for(let i=danBay.length-1;i>=0;i--){
    const d=danBay[i];
    // cap nhat
    d.x += d.vx;
    d.y += d.vy;
    d.vy -= trongLuc*0.5; 
    // cap nhat DOM
    d.node.style.left=d.x+"px";
    d.node.style.bottom=d.y+"px";

   d.node.style.left=d.x+"px";
d.node.style.bottom=d.y+"px";
// kiểm tra ranh giới ngang: nếu chạm biên, bật ngược lại
if (d.x <= 0) {
  d.x = 0;
  d.vx = Math.abs(d.vx) * 0.7;
}
if (d.x >= khungGame.clientWidth - 20) {
  d.x = khungGame.clientWidth - 20;
  d.vx = -Math.abs(d.vx) * 0.7; 
}
// kiểm tra ranh giới dọc
if (d.y <= 0) {
  d.y = 0;
  d.vy = 0;
}
if (d.y > 600) {
  d.node.remove();
  danBay.splice(i,1);
  continue;
}
// check va cham boss dac biet
if (d.x <= 0 || d.x >= khungGame.clientWidth - 20) {
  d.vx *= -0.5; // bật ngược lại, yếu dần
  d.x = Math.max(0, Math.min(d.x, khungGame.clientWidth - 20));
}
if (d.y < 0) {
  d.y = 0;
  d.vy = 0;
}
if (d.y > 600) {
  d.node.remove();
  danBay.splice(i, 1);
  continue;
}
if(d.vy <= 0 && d.y <= 0 && !d.daChamDat){
  d.daChamDat = true;
  const nodeRoi = document.createElement("div");
  nodeRoi.className = "vatPhamDo";
  nodeRoi.textContent = d.node.textContent;
  nodeRoi.style.left = d.x + "px";
  nodeRoi.style.bottom = "0px";
  khungGame.appendChild(nodeRoi);
  danhSachItem.push({
    node: nodeRoi,
    loai: "doBoss",
    giaTri: parseInt(d.node.textContent),
    x: d.x,
    y: 0,
    nenIndex: null,
    vy: 0
  });
  d.node.remove();
  danBay.splice(i,1);
    }
  }
}

// boss chet loe vang roi bien mat
function tieuDietBoss(){
  if (!quaiBoss || !quaiBoss.song) return;

  // đánh dấu boss đã chết
  quaiBoss.song = false;

  // nếu chìa khóa đã đặt vào ô rồi thì mở cổng ngay
  const oDe = document.getElementById("oDeItem");
  if (oDe && oDe.dataset.datChiaKhoa === "true") {
    moCong();
  }

  // hiệu ứng lóe vàng
  quaiBoss.node.classList.add("bossBiTieuDiet");

  // bỏ bong toán trên đầu boss
  if (quaiBoss.nodeBong){
    quaiBoss.nodeBong.remove();
    quaiBoss.nodeBong = null;
  }

  // remove boss sau chút xíu
  setTimeout(()=>{
    if (quaiBoss && quaiBoss.node){
      quaiBoss.node.remove();
      quaiBoss.node = null;
    }
  },300);
}


// =============================
// CHET NHAN VAT
// =============================
function chetNhanVat(msg){
  if (chet) return; // tránh gọi 2 lần trong cùng frame

  chet = true;
  nhanVat.classList.add("chet");
  nhanVat.style.transform = "scale(0.6) rotate(20deg)";
  setThongBao(msg + " 💀","#900");

  if(amThanhDie){
    amThanhDie.currentTime=0;
    amThanhDie.play().catch(()=>{});
  }
  // không tự taoMan() lại ở đây nữa.
  // việc hiển thị màn hình thua và cho restart sẽ được làm ở bản override bên dưới (hienGameOver()).
}


// =============================
// VONG LOOP CHINH
// =============================
function capNhat(){
  if(!ketThucMan && !chet){
    // di chuyen ngang
    if(phim.phai && !phim.trai) vanTocX = tocDo;
    else if(phim.trai && !phim.phai) vanTocX = -tocDo;
    else vanTocX = 0;
    x += vanTocX;
    if(x<0) x=0;
    if(x>khungGame.clientWidth-40) x=khungGame.clientWidth-40;
    // nhay / trong luc
    y += vanTocY;
    vanTocY -= trongLuc;
    // cham dat
    if(y<=0){
      if(!dungTrenNen){
        nhanVat.style.transform="scaleX(1.2) scaleY(0.8)";
        setTimeout(()=>{ if(!chet) nhanVat.style.transform="scale(1,1)"; },150);
      }
      y=0;
      vanTocY=0;
      dungTrenNen=true;
    }
    capNhatNenDiChuyen();
    let dangDung=false;
    for(const nen of danhSachNen){
      const trenX = (x+40>nen.x && x<nen.x+nen.w);
      const ganY  = (y<=nen.y+25 && y>=nen.y-5);
      const dangRoi = (vanTocY<=0);
      if(trenX && ganY && dangRoi){
        if(!dungTrenNen){
          nhanVat.style.transform="scaleX(1.2) scaleY(0.8)";
          setTimeout(()=>{ if(!chet) nhanVat.style.transform="scale(1,1)"; },150);
        }
        y = nen.y + 20;
        vanTocY=0;
        dangDung=true;
        // neu nen di chuyen thi keo nhan vat theo
        if(nen.diChuyen){
          x += nen.tocDo*nen.huong;
          if(x<0) x=0;
          if(x>khungGame.clientWidth-40) x=khungGame.clientWidth-40;
        }
      }
    }
    dungTrenNen = dangDung || y===0;
    // cap nhat quai thuong
    capNhatQuaiThuong()
    // cap nhat boss
    capNhatBoss();
    // kiem tra gai
    kiemTraGai();
    // cap nhat vat ly cho tat ca item
    capNhatItemRoi();
    // cap nhat dan dang bay
    capNhatDanBay();
    // cap nhat vi tri nhan vat (DOM)
    nhanVat.style.left=x+"px";
    nhanVat.style.bottom=y+"px";
    // camera follow: dich toan bo khungGame nguoc lai
    const viewW = khungNgoai.clientWidth;
    const mucTieuCam = x - viewW/2 + 20;
    const gioiHanMin = 0;
    const gioiHanMax = khungGame.clientWidth - viewW;
    const camX = Math.max(gioiHanMin,Math.min(mucTieuCam,gioiHanMax));
    khungGame.style.transform=`translateX(${-camX}px)`;
    // cap nhat bong phep boss theo camera (da lam trong capNhatBoss)
    if(quaiBoss && quaiBoss.song && quaiBoss.nodeBong){
      // da set left/bottom tuyet doi nen OK
    }
    // hiển thị vật phẩm trên đầu nhân vật
if(vatDangCam){
  vatCam.textContent = vatDangCam.giaTri;
  vatCam.style.display = "block";
  // đổi màu theo loại vật phẩm
  if(vatDangCam.loai === "doBoss"){
    vatCam.style.background = "#ff2b2b"; // đỏ
    vatCam.style.color = "#fff";
  } 
  else if(vatDangCam.loai === "doCong"){
    vatCam.style.background = "#ffe65c"; // vàng sáng
    vatCam.style.color = "#000";
  } 
  else {
    vatCam.style.background = "yellow"; // item sai (vàng)
    vatCam.style.color = "#000";
  }

} else {
  vatCam.style.display = "none"; // không cầm gì thì ẩn
}
    // tim item gan nhan vat de show hint "Nhan N de nhat"
    ganItemDeNhat=null;
    hideHint();
    for(const it of danhSachItem){
      const ix = parseFloat(it.node.style.left);
      const iy = parseFloat(it.node.style.bottom);
      if(Math.abs(x-ix)<30 && Math.abs(y-iy)<30){
        ganItemDeNhat = it.node;
        showHint(ix,iy);
        break;
      }
    }
    // chi qua man khi cong da mo va boss da bi tieu diet
    if(congDaMo && (!quaiBoss || !quaiBoss.song)){
  const congVungX = khungGame.clientWidth - 100;
  if(x > congVungX && y < 140){
    ketThucMan = true;
    diemSo += 100; // cộng 100 điểm khi qua mỗi màn
    capNhatDiem();
    setThongBao("Qua màn " + manHienTai + " thành công! +100 điểm", "#0a0");

    if (amThanhQuaMan) {
      amThanhQuaMan.currentTime = 0;
      amThanhQuaMan.play().catch(() => {});
    }
    nhanVat.style.transform = "scale(1.2,1.2)";
    setTimeout(() => {
      manHienTai++;
      // nếu quá 5 màn thì kết thúc game
      if(manHienTai > 5){
        setThongBao("🎉 Qua màn " + manHienTai + " thành công! +100 điểm","#0a0");
// thêm hiệu ứng bung sáng cho thông báo
const thongBao = document.getElementById("thongBao");
if (thongBao) thongBao.style.animation = "thongBaoWin 0.5s ease";
        hienGameOver();
        return;
      }
      taoMan();
    }, 1200);
  }
}
 }
}
// =============================
// CAP NHAT VAT PHEP (ITEM ROI XUONG DAT)
// =============================
function capNhatItemRoi(){
  for (const it of danhSachItem) {
    // nếu item chưa có vy thì gán ban đầu
    if (it.vy === undefined) it.vy = 0;

    // chỉ xử lý nếu item không nằm trên nền
    if (!it.nenIndex) {
      // áp trọng lực
      it.vy -= trongLuc * 0.8;
      it.y += it.vy;

      // chạm đất
      if (it.y <= 0) {
        it.y = 0;
        it.vy = 0;
      }

      // cập nhật DOM
      it.node.style.bottom = it.y + "px";
    }
  }
}

// =============================
// CAP NHAT DAN BAY (CO VAT LY & GIOI HAN BIEN)
// =============================
function capNhatDanBay(){
  for (let i = danBay.length - 1; i >= 0; i--) {
    const d = danBay[i];

    // cập nhật vị trí
    d.x += d.vx;
    d.y += d.vy;
    d.vy -= trongLuc * 0.5;

    //  kiểm tra biên trái
    if (d.x <= 0) {
      d.x = 0;
      d.vx = Math.abs(d.vx) * 0.6; // bật ngược sang phải
    }

    //kiểm tra biên phải
    if (d.x >= khungGame.clientWidth - 20) {
      d.x = khungGame.clientWidth - 20;
      d.vx = -Math.abs(d.vx) * 0.6; // bật ngược sang trái
    }

    //  kiểm tra chạm đất
    if (d.y <= 0) {
      d.y = 0;
      d.vy = 0;
    }

    //  kiểm tra rơi quá xa
    if (d.y > 600) {
      d.node.remove();
      danBay.splice(i, 1);
      continue;
    }

    // cập nhật DOM
    d.node.style.left = d.x + "px";
    d.node.style.bottom = d.y + "px";

    //  kiểm tra va chạm boss
    if (quaiBoss && quaiBoss.song) {
      if (overlap(d.x, d.y, 20, 20, quaiBoss.x, quaiBoss.y, quaiBoss.w, quaiBoss.h)) {
        if (d.hieuLucBoss) {
          tieuDietBoss();
        }
        d.node.remove();
        danBay.splice(i, 1);
        continue;
      }
    }

    //  nếu đạn rơi xuống đất -> trở thành item
    if (d.vy <= 0 && d.y <= 0 && !d.daChamDat) {
      d.daChamDat = true;
      const nodeRoi = document.createElement("div");
      nodeRoi.className = "vatPhamDo";
      nodeRoi.textContent = d.node.textContent;
      nodeRoi.style.left = d.x + "px";
      nodeRoi.style.bottom = "0px";
      // nếu rơi vào chỗ có item hoặc gai, dịch sang phải dần
let dich = 0;
while ((!viTriItemHopLe(d.x + dich, 0) || viTriTrongGai(d.x + dich, 0)) && dich < 120) {
  dich += 10;
}
nodeRoi.style.left = (d.x + dich) + "px";

      khungGame.appendChild(nodeRoi);
      danhSachItem.push({
        node: nodeRoi,
        loai: "doBoss",
        giaTri: parseInt(d.node.textContent),
        x: d.x,
        y: 0,
        nenIndex: null,
        vy: 0
      });
      d.node.remove();
      danBay.splice(i, 1);
    }
  }
}

// =============================
// BAT DAU GAME + MENU
// =============================
const menuChinh = document.getElementById("menuChinh");
const nutStart = document.getElementById("nutStart");
const gameOver = document.getElementById("gameOver");

let gameDangChay = false;

let idCapNhat = null; // lưu id vòng lặp hiện tại
let lopHoc = 1;

// khi click chọn lớp
document.querySelectorAll(".nutLop").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".nutLop").forEach(b=>b.classList.remove("duocChon"));
    btn.classList.add("duocChon");
    lopHoc = parseInt(btn.dataset.lop);
    document.getElementById("nutStart").disabled = false;
  });
});

function batDauGame(){
  manHienTai = 1;
diemSo = 0;
capNhatDiem();
  // dừng vòng lặp cũ nếu đang chạy
  if (idCapNhat) {
    cancelAnimationFrame(idCapNhat);
    idCapNhat = null;
  }

  // reset toàn bộ trạng thái
  chet = false;
  ketThucMan = false;
  nhanVat.style.transform = "scale(1)";
  danhSachItem = [];
  danhSachQuaiThuong = [];
  danhSachNen = [];
  danhSachGai = [];
  danBay = [];
  document.querySelectorAll(".vatPham, .vatPhamDo, .vatPhamVang, .quai, .nen, .gai").forEach(e=>e.remove());

  // ẩn menu, khởi tạo lại map
  menuChinh.style.display="none";
  gameOver.style.display="none";
  gameDangChay = true;

  taoMan();

  // chạy vòng lặp mới và lưu id
  function vongCapNhat(){
    if (!chet && gameDangChay) {
      capNhat();
      idCapNhat = requestAnimationFrame(vongCapNhat);
    }
  }
  vongCapNhat();
}


// Khi nhấn nút Start
nutStart.addEventListener("click", batDauGame);

// Khi bấm phím Enter hoặc Space để bắt đầu
document.addEventListener("keydown", e=>{
  if(!gameDangChay && (e.key==="Enter" || e.key===" ")){
    batDauGame();
  }
});

// Hàm hiển thị Game Over
function hienGameOver(){
  gameOver.style.display="flex";
  gameDangChay = false;
}

// Sửa lại chetNhanVat để gọi game over
const chetNhanVatCu = chetNhanVat;
chetNhanVat = function(msg){
  chet=true;
  nhanVat.classList.add("chet");
  nhanVat.style.transform="scale(0.6) rotate(20deg)";
  setThongBao(msg+" 💀","#900");

  if(amThanhDie){
    amThanhDie.currentTime=0;
    amThanhDie.play().catch(()=>{});
  }

  setTimeout(()=>{
    hienGameOver();
  },1000);
};

// Bắt phím để restart khi Game Over
document.addEventListener("keydown", e=>{
  if(!gameDangChay && gameOver.style.display==="flex"){
    if(["r","t"," ","enter","arrowup","arrowdown","arrowleft","arrowright","a","d","w"].includes(e.key.toLowerCase())){
      batDauGame();
    }
  }
});
// =============================
// PHÍM ESC: quay về menu chính
// =============================
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if (gameDangChay) {
      // dừng vòng lặp
      gameDangChay = false;
      cancelAnimationFrame(idCapNhat);
      idCapNhat = null;

      // ẩn Game Over nếu có
      gameOver.style.display = "none";

      // hiển thị lại menu
      diemSo = 0;
manHienTai = 1;
capNhatDiem();

      menuChinh.style.display = "flex";
      setThongBao("Đã quay lại menu chính", "#b00");
    }
  }
});

//Live Server
// <![CDATA[  <-- For SVG support
	if ('WebSocket' in window) {
		(function () {
			function refreshCSS() {
				var sheets = [].slice.call(document.getElementsByTagName("link"));
				var head = document.getElementsByTagName("head")[0];
				for (var i = 0; i < sheets.length; ++i) {
					var elem = sheets[i];
					var parent = elem.parentElement || head;
					parent.removeChild(elem);
					var rel = elem.rel;
					if (elem.href && typeof rel != "string" || rel.length == 0 || rel.toLowerCase() == "stylesheet") {
						var url = elem.href.replace(/(&|\?)_cacheOverride=\d+/, '');
						elem.href = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_cacheOverride=' + (new Date().valueOf());
					}
					parent.appendChild(elem);
				}
			}
			var protocol = window.location.protocol === 'http:' ? 'ws://' : 'wss://';
			var address = protocol + window.location.host + window.location.pathname + '/ws';
			var socket = new WebSocket(address);
			socket.onmessage = function (msg) {
				if (msg.data == 'reload') window.location.reload();
				else if (msg.data == 'refreshcss') refreshCSS();
			};
			if (sessionStorage && !sessionStorage.getItem('IsThisFirstTime_Log_From_LiveServer')) {
				console.log('Live reload enabled.');
				sessionStorage.setItem('IsThisFirstTime_Log_From_LiveServer', true);
			}
		})();
	}
	else {
		console.error('Upgrade your browser. This Browser is NOT supported WebSocket for Live-Reloading.');
	}
	// ]]>


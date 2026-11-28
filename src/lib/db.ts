import fs from 'fs';
import path from 'path';
import { User, Wallet, Story, Chapter, UnlockedChapter, Order, AnalyticsEvent, Comment, FeedbackItem, SupportMessage, SupportConversation } from './types';

export interface LuckyWheelPrize {
  id: number;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  textColor: string;
  type: 'coins' | 'vip' | 'none';
  value: number;
  weight: number;
}

export interface LuckyWheelSpinRecord {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  userAvatar?: string;
  spinType: 'free' | 'coins';
  costCoins: number;
  prizeId: number;
  prizeLabel: string;
  prizeSublabel?: string;
  prizeIcon: string;
  prizeType: 'coins' | 'vip' | 'none';
  prizeValue: number;
  createdAt: string;
}

export interface ChapterTipRecord {
  id: string;
  storyId: string;
  chapterIndex: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  amountCoins?: number;
  amountVnd?: number; // Tiền thật VND (vd: 10000, 20000, 50000...)
  message?: string;
  isPrivate?: boolean;
  orderCode?: string;
  createdAt: string;
}

export interface LuckyWheelSettings {
  spinCostCoins: number;
  freeSpinDaily: boolean;
  prizes: LuckyWheelPrize[];
}

export const DEFAULT_LUCKY_WHEEL_SETTINGS: LuckyWheelSettings = {
  spinCostCoins: 3,
  freeSpinDaily: true,
  prizes: [
    { id: 0, label: '+2 Điểm', sublabel: 'Thưởng xu', icon: '🎁', color: '#4F46E5', textColor: '#FFFFFF', type: 'coins', value: 2, weight: 28 },
    { id: 1, label: '+5 Điểm', sublabel: 'Mở 1 tập', icon: '💎', color: '#2563EB', textColor: '#FFFFFF', type: 'coins', value: 5, weight: 20 },
    { id: 2, label: '+4 Điểm', sublabel: 'Thưởng lớn', icon: '⭐', color: '#D97706', textColor: '#FFFFFF', type: 'coins', value: 4, weight: 8 },
    { id: 3, label: '+10 Điểm', sublabel: 'Gấp đôi vui', icon: '🔥', color: '#059669', textColor: '#FFFFFF', type: 'coins', value: 10, weight: 10 },
    { id: 4, label: 'May Mắn Lần Sau', sublabel: 'Cố lên nhé', icon: '🍀', color: '#374151', textColor: '#D1D5DB', type: 'none', value: 0, weight: 18 },
    { id: 5, label: '+3 Điểm', sublabel: 'Thưởng xu', icon: '⭐', color: '#DB2777', textColor: '#FFFFFF', type: 'coins', value: 3, weight: 11 },
    { id: 6, label: '+8 Điểm', sublabel: 'Siêu giải', icon: '🏆', color: '#EA580C', textColor: '#FFFFFF', type: 'coins', value: 8, weight: 3 },
    { id: 7, label: '+1 Điểm', sublabel: 'Thưởng nhẹ', icon: '🪙', color: '#7C3AED', textColor: '#FFFFFF', type: 'coins', value: 1, weight: 2 },
  ],
};

interface DatabaseSchema {
  users: User[];
  wallets: Wallet[];
  stories: Story[];
  chapters: Chapter[];
  unlockedChapters: UnlockedChapter[];
  orders: Order[];
  analytics?: AnalyticsEvent[];
  comments?: Comment[];
  feedback?: FeedbackItem[];
  luckyWheelSettings?: LuckyWheelSettings;
  luckyWheelHistory?: LuckyWheelSpinRecord[];
  chapterTips?: ChapterTipRecord[];
  supportConversations?: SupportConversation[];
  supportMessages?: SupportMessage[];
}

const IS_VERCEL = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BUNDLED_DATA_FILE = path.join(process.cwd(), 'data.json');
// Trên Vercel / Serverless, thư mục duy nhất có quyền ghi là /tmp
const WRITABLE_DATA_FILE = IS_VERCEL ? path.join('/tmp', 'data.json') : BUNDLED_DATA_FILE;

let inMemoryCache: DatabaseSchema | null = null;

// Dữ liệu hạt giống ban đầu (Seed Data phong cách TikTok @carrot.tia)
const INITIAL_DATA: DatabaseSchema = {
  users: [],
  wallets: [],
  stories: [
    {
      id: "story-01",
      code: "01",
      title: "Căn Hầm Bí Mật Dưới Gian Bếp Cổ",
      slug: "can-ham-bi-mat-duoi-gian-bep-co",
      coverImage: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop",
      genre: "Kinh Dị - Giật Gân",
      summary: "Sau khi dọn về căn nhà thừa kế ở bìa rừng, Lâm liên tục nghe thấy tiếng móng tay cào sột soạt dưới nền gạch bông phòng bếp. Đến đêm thứ bảy, một viên gạch nứt toác hé lộ bậc thang dẫn xuống một mật thất...",
      views: 12480,
      status: "completed",
      chaptersCount: 5,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
    {
      id: "story-02",
      code: "02",
      title: "Bức Họa Chân Dung Lúc Nửa Đêm",
      slug: "buc-hoa-chan-dung-luc-nua-dem",
      coverImage: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=600&auto=format&fit=crop",
      genre: "Tâm Linh - Bí Ẩn",
      summary: "Một họa sĩ vô danh mua được khung tranh cổ ở chợ đồ cũ. Mỗi đêm khi anh chìm vào giấc ngủ, bức tranh tự động vẽ thêm một chi tiết rùng rợn: một bóng người đang từng bước bước ra khỏi khung gỗ...",
      views: 9320,
      status: "completed",
      chaptersCount: 5,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: "story-03",
      code: "03",
      title: "Chuyến Xe Buýt Cuối Cùng Số 04",
      slug: "chuyen-xe-buyt-cuoi-cung-so-04",
      coverImage: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?q=80&w=600&auto=format&fit=crop",
      genre: "Đô Thị Kỳ Dị",
      summary: "Chuyến xe chạy chuyến 0h sáng không bao giờ có trên lịch trình bến xe. Những hành khách bước lên xe đều có chung một điểm kỳ lạ: gương mặt họ không hề chớp mắt và ai cũng cầm trên tay một chiếc vé màu đỏ...",
      views: 15890,
      status: "completed",
      chaptersCount: 5,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    }
  ],
  chapters: [
    // Story 01 chapters
    {
      id: "chap-01-1",
      storyId: "story-01",
      chapterIndex: 1,
      title: "Tập 1: Tiếng Cào Dưới Nền Gạch",
      content: `Lâm đẩy cánh cổng sắt gỉ sét của ngôi nhà số 47. Không khí ẩm mốc xộc thẳng vào mũi, mùi hương trầm cũ kỹ còn vương lại từ đám tang của người chú họ cách đây tròn một tháng. Căn nhà này thuộc về anh theo di chúc, một căn biệt thự kiểu Pháp cũ kỹ nằm lẻ loi ở rìa thị trấn.\n\nĐêm đầu tiên trôi qua trong yên tĩnh lạ thường, ngoại trừ tiếng gió rít qua khe cửa sổ gỗ. Nhưng sang đến đêm thứ ba, chính xác là lúc 1 giờ 15 phút sáng, Lâm bị đánh thức bởi một chuỗi âm thanh kỳ dị.\n\n"Sột... sột... xoẹt..."\n\nÂm thanh không phát ra từ trên trần nhà, cũng chẳng phải tiếng chuột chạy sau hốc tường. Nó vang lên ngay dưới sàn nhà, chính xác là vị trí dưới chân bàn ăn gian bếp. Giống hệt như có ai đó dùng những đầu móng tay sắc nhọn, kiên trì cào từng vệt dài vào mặt dưới của những viên gạch bông cổ.`,
      priceCoins: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: "chap-01-2",
      storyId: "story-01",
      chapterIndex: 2,
      title: "Tập 2: Bậc Thang Bằng Đá Xuống Lòng Đất",
      content: `Lâm cầm chiếc đèn pin bước rón rén vào gian bếp. Tiếng cào đột ngột im bặt ngay khi bước chân anh chạm vào sàn đá lạnh ngắt.\n\nAnh quỳ xuống, soi sát ánh đèn vàng vào viên gạch bông hoa văn cổ ở góc bàn. Bụi vữa xung quanh viên gạch đã bị cọ xát đến tơi tả. Lâm thử dùng mũi dao thái găm vào khe nứt rồi cậy nhẹ. Bất ngờ, cả một phiến gạch vuông kích thước lớn bật lên, để lộ một tay nắm bằng đồng đen bóng, có hình đầu một con dê mắt tròn xoe.\n\nKéo mạnh tay nắm, sàn bếp hé mở một lối đi ngầm hình chữ nhật, sâu hun hút với những bậc thang bằng đá bám đầy rêu xanh. Một luồng khí lạnh buốt, tanh nồng mùi rỉ sét phả thẳng vào mặt khiến sống lưng anh lạnh toát.\n\nTừ dưới đáy sâu của căn hầm, một âm thanh thì thầm đứt quãng bỗng vọng lên: "Cứu... mở cửa ra..."`,
      priceCoins: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: "chap-01-3",
      storyId: "story-01",
      chapterIndex: 3,
      title: "Tập 3: Chiếc Lồng Sắt Và Bộ Nhật Ký Cũ",
      content: `Lâm nuốt nước bọt, từng bước dò dẫm đi xuống 24 bậc đá. Ánh đèn pin quét qua trần hầm thấp tè chỉ cao vừa đầu người. Ở góc phòng giam ẩm ướt, đập vào mắt anh là một chiếc lồng sắt lớn bị khóa bằng ba ổ khóa xích hoen gỉ.\n\nBên trong lồng không có người, chỉ có một chiếc bàn gỗ mục nát, trên đó đặt một cuốn sổ tay bìa da đã ngả màu ố vàng cùng một chiếc gương đồng nứt đôi.\n\nLâm run run mở trang đầu tiên của cuốn sổ. Nét chữ nguệch ngoạc của người chú quá cố hiện ra: "Ngày 14 tháng 10 năm 1998... Nó không phải là người. Nó mang khuôn mặt của vợ tôi, nói giọng của vợ tôi, nhưng khi đêm xuống, nó không thở. Tôi buộc phải nhốt nó lại trước khi nó ăn hết từng người trong nhà..."`,
      priceCoins: 1, // 1 Xu
      createdAt: new Date().toISOString(),
    },
    {
      id: "chap-01-4",
      storyId: "story-01",
      chapterIndex: 4,
      title: "Tập 4: Cú Lừa Của Chiếc Gương Đồng",
      content: `Đọc đến đây, tay Lâm run rẩy suýt đánh rơi cuốn sổ. Anh bất giác đưa đèn pin soi vào chiếc gương đồng trên bàn. Trong mặt gương mờ đục, Lâm không thấy hình ảnh phản chiếu của chính mình.\n\nThay vào đó, trong gương là một người phụ nữ trẻ mặc áo dài trắng, mái tóc đen dài rũ rượi, đang đứng sát ngay sau lưng anh, đầu gục sát vào hõm cổ anh và nở một nụ cười quái dị đến tận mang tai.\n\nLâm giật mình quay phắt lại ra sau — không có ai cả. Căn phòng hoàn toàn trống trơn. Nhưng khi anh quay lại nhìn chiếc lồng sắt, ba chiếc ổ khóa xích từ bao giờ đã bị đứt gãy gỉ vụn rơi đầy dưới đất. Cánh cửa lồng đang từ từ kẽo kẹt mở toang...`,
      priceCoins: 1, // 1 Xu
      createdAt: new Date().toISOString(),
    },
    {
      id: "chap-01-5",
      storyId: "story-01",
      chapterIndex: 5,
      title: "Tập 5 (Cái Kết): Kẻ Thế Mạng Dưới Đáy Hầm",
      content: `Lâm hoảng loạn lao về phía cầu thang để chạy ngược lên bếp. Nhưng rầm một tiếng, nắp hầm bằng đá phía trên đột ngột sập xuống, khóa chặt lối thoát duy nhất trong bóng tối đặc quánh.\n\nTiếng cười the thé vang lên từ trong bóng tối: "Cảm ơn cháu đã đến thay thế chú..."\n\nChiếc điện thoại của Lâm rơi xuống đất bỗng sáng màn hình. Một tin nhắn vừa gửi đến từ số điện thoại của người chú họ — người được cho là đã chết một tháng trước: "Tao đã thoát ra ngoài bằng thân xác mới rồi. Chúc mày ở lại vui vẻ cùng 'nó' trong 30 năm tới!"\n\nÁnh đèn pin cuối cùng vụt tắt. Trong bóng tối, hai bàn tay lạnh ngắt như băng từ từ chụp lấy vai Lâm...`,
      priceCoins: 2, // 2 Xu (Tập kết cao trào)
      createdAt: new Date().toISOString(),
    },

    // Story 02 chapters
    {
      id: "chap-02-1",
      storyId: "story-02",
      chapterIndex: 1,
      title: "Tập 1: Bức Tranh Mua Ở Chợ Trời",
      content: `Hoàng là sinh viên năm cuối trường mỹ thuật. Trong một lần dạo chợ đồ cổ cuối tuần, anh bị hút hồn bởi một bức tranh sơn dầu cũ vẽ một thiếu nữ ngồi bên khung cửa sổ nhìn ra hồ nước mùa đông. Bức tranh không có chữ ký họa sĩ nhưng các nét cọ ma mị đến nghẹt thở. Người bán hàng chỉ lấy anh 50 ngàn đồng với ánh mắt lấm lét: "Mua rồi không trả lại nhé cậu bé".`,
      priceCoins: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: "chap-02-2",
      storyId: "story-02",
      chapterIndex: 2,
      title: "Tập 2: Đôi Mắt Thay Đổi Hướng Nhìn",
      content: `Hoàng treo bức tranh ngay đối diện bàn học. Tối hôm đó, khi đang ngồi làm đồ án, anh bỗng cảm thấy có ánh mắt dõi theo mình. Ngước nhìn lên bức tranh, Hoàng giật thót: thiếu nữ trong tranh ban đầu nhìn nghiêng về phía cửa sổ, nhưng lúc này, đôi mắt đen láy của cô ta đang nhìn thẳng trừng trừng vào anh.`,
      priceCoins: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: "chap-02-3",
      storyId: "story-02",
      chapterIndex: 3,
      title: "Tập 3: Nước Nhỏ Từng Giọt Từ Khung Gỗ",
      content: `Đêm thứ hai, phòng trọ nồng nặc mùi nước bùn ao ẩm mốc. Từng giọt nước đen ngòm bắt đầu rỉ ra từ mép dưới khung tranh, nhỏ tong tong xuống sàn nhà tạo thành một vũng nước loang lổ. Người thiếu nữ trong tranh nay đã đứng dậy, hai tay bám vào mép khung tranh như muốn trèo ra ngoài...`,
      priceCoins: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: "chap-02-4",
      storyId: "story-02",
      chapterIndex: 4,
      title: "Tập 4: Bí Mật Dưới Lớp Sơn Dầu",
      content: `Hoàng không chịu nổi bèn lấy dao cạo lớp sơn dầu đi để tiêu hủy. Nhưng khi mũi dao rạch vào bề mặt vải bố, dòng chất lỏng đỏ tươi rỉ ra ròng ròng như máu sống. Dưới lớp sơn dầu không phải là vải bạt thông thường, mà là một mảnh da người thật được căng trên khung gỗ!`,
      priceCoins: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: "chap-02-5",
      storyId: "story-02",
      chapterIndex: 5,
      title: "Tập 5 (Cái Kết): Ai Mới Là Người Trong Tranh?",
      content: `Sáng hôm sau, người chủ nhà trọ đến đòi tiền phòng thì thấy cửa phòng Hoàng mở toang. Trong phòng không có một bóng người, đồ đạc vẫn nguyên vẹn. Chỉ có bức tranh sơn dầu treo trên tường đã thay đổi hoàn toàn: Khung cảnh hồ nước mùa đông vẫn vậy, nhưng nhân vật trong tranh không còn là cô gái nữa, mà là một chàng trai trẻ đang gào thét đập tay vào mặt kính đòi thoát ra... gương mặt đó chính là Hoàng!`,
      priceCoins: 2,
      createdAt: new Date().toISOString(),
    },

    // Story 03 chapters
    {
      id: "chap-03-1",
      storyId: "story-03",
      chapterIndex: 1,
      title: "Tập 1: Chuyến Xe 0 Giờ Sáng",
      content: `Trời mưa tầm tã lúc nửa đêm. Minh tan ca làm thêm, đứng run rẩy dưới trạm xe buýt vắng ngắt. Theo lịch trình, chuyến cuối cùng đã hết từ 23h. Bất ngờ, ánh đèn pha vàng đục xé tan màn sương mù, một chiếc xe buýt cũ kỹ số 04 từ từ trờ tới và mở cửa với tiếng xì hơi ghê rợn.`,
      priceCoins: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: "chap-03-2",
      storyId: "story-03",
      chapterIndex: 2,
      title: "Tập 2: Những Vị Khách Không Khuôn Mặt",
      content: `Minh bước lên xe vì lạnh cóng. Bác tài xế trùm mũ kín mít không quay lại, chỉ chìa tay nhận tiền rồi xé cho anh một chiếc vé màu đỏ tươi như máu. Minh bước xuống hàng ghế sau. Trên xe có khoảng 7 hành khách, nhưng lạ lùng thay, không ai phát ra tiếng thở, và khi xe chạy qua bóng đèn đường, họ không hề có bóng đổ trên sàn xe.`,
      priceCoins: 0,
      createdAt: new Date().toISOString(),
    },
    {
      id: "chap-03-3",
      storyId: "story-03",
      chapterIndex: 3,
      title: "Tập 3: Con Đường Không Có Điểm Dừng",
      content: `Xe chạy bon bon qua những con phố thân quen rồi đột ngột rẽ vào một con đường tối om không có nhà dân hai bên. Minh nhìn đồng hồ: đã 45 phút trôi qua mà xe không dừng ở bất kỳ trạm nào. Anh tiến lên định hỏi tài xế thì bàng hoàng nhận ra vô lăng xe đang tự quay tròn, trên ghế lái hoàn toàn không có người!`,
      priceCoins: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: "chap-03-4",
      storyId: "story-03",
      chapterIndex: 4,
      title: "Tập 4: Tấm Vé Một Chiều",
      content: `Minh quay lại nhìn các hành khách khác để cầu cứu. Lúc này, tất cả 7 hành khách đồng loạt quay đầu 180 độ về phía anh. Gương mặt họ trắng bệch, hốc mắt trống rỗng và miệng đồng thanh lẩm bẩm: "Tấm vé đỏ chỉ đưa người sang sông... không có vé về..." Minh nhìn lại chiếc vé trên tay mình: ngày in trên vé chính là ngày giỗ tương lai của anh!`,
      priceCoins: 1,
      createdAt: new Date().toISOString(),
    },
    {
      id: "chap-03-5",
      storyId: "story-03",
      chapterIndex: 5,
      title: "Tập 5 (Cái Kết): Tin Tức Trên Báo Sáng Mai",
      content: `6 giờ sáng hôm sau, trang tin địa phương giật tít: "Tìm thấy thi thể một nam sinh viên bị tai nạn giao thông lúc 23h30 đêm qua tại ngã tư vắng. Nạn nhân được xác định tử vong tại chỗ do xe buýt số 04 đâm trúng. Đáng chú ý, tuyến xe buýt số 04 này đã bị đình chỉ hoạt động từ 10 năm trước sau một tai nạn thảm khốc..." Minh đã chết từ trước khi bước lên chuyến xe ấy.`,
      priceCoins: 2,
      createdAt: new Date().toISOString(),
    }
  ],
  unlockedChapters: [],
  orders: []
};

// Đảm bảo file database luôn tồn tại và an toàn trên Vercel Serverless (Read-only /var/task)
function ensureDataFile(): DatabaseSchema {
  if (inMemoryCache) {
    return inMemoryCache;
  }

  // 1. Thử đọc từ WRITABLE_DATA_FILE (/tmp/data.json nếu trên Vercel)
  if (fs.existsSync(WRITABLE_DATA_FILE)) {
    try {
      const raw = fs.readFileSync(WRITABLE_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.analytics) parsed.analytics = [];
      if (!parsed.comments) parsed.comments = [];
      if (!parsed.feedback) parsed.feedback = [];
      inMemoryCache = parsed;
      return parsed;
    } catch (e) {
      console.warn('[DB] Lỗi đọc WRITABLE_DATA_FILE:', e);
    }
  }

  // 2. Thử đọc từ BUNDLED_DATA_FILE (data.json đóng gói cùng mã nguồn)
  if (fs.existsSync(BUNDLED_DATA_FILE)) {
    try {
      const raw = fs.readFileSync(BUNDLED_DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.analytics) parsed.analytics = [];
      if (!parsed.comments) parsed.comments = [];
      if (!parsed.feedback) parsed.feedback = [];
      inMemoryCache = parsed;

      // Nếu trên Vercel, copy sẵn sang /tmp để các lần sau ghi an toàn
      if (IS_VERCEL) {
        try {
          fs.writeFileSync(WRITABLE_DATA_FILE, raw, 'utf-8');
        } catch (copyErr) {
          console.warn('[DB] Không thể copy sang /tmp:', copyErr);
        }
      }

      return parsed;
    } catch (err) {
      console.warn('[DB] Lỗi đọc BUNDLED_DATA_FILE:', err);
    }
  }

  // 3. Fallback INITIAL_DATA
  inMemoryCache = JSON.parse(JSON.stringify(INITIAL_DATA));
  if (IS_VERCEL) {
    try {
      fs.writeFileSync(WRITABLE_DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    } catch (e) {}
  } else {
    try {
      fs.writeFileSync(BUNDLED_DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
    } catch (e) {}
  }
  return inMemoryCache!;
}

function saveData(data: DatabaseSchema): void {
  inMemoryCache = data;
  try {
    fs.writeFileSync(WRITABLE_DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[DB] Không thể ghi vào WRITABLE_DATA_FILE (read-only):', err);
    try {
      // Thử ghi fallback vào /tmp nếu đường dẫn hiện tại không phải /tmp
      const fallbackTmp = path.join('/tmp', 'data.json');
      if (WRITABLE_DATA_FILE !== fallbackTmp) {
        fs.writeFileSync(fallbackTmp, JSON.stringify(data, null, 2), 'utf-8');
      }
    } catch (tmpErr) {
      console.warn('[DB] Fallback /tmp cũng thất bại, lưu an toàn trong memory:', tmpErr);
    }
  }
}

export const db = {
  getStories: (): Story[] => {
    const data = ensureDataFile();
    return data.stories;
  },

  getStoryById: (id: string): Story | undefined => {
    const data = ensureDataFile();
    return data.stories.find(s => s.id === id);
  },

  getStoryBySlug: (slug: string): Story | undefined => {
    const data = ensureDataFile();
    return data.stories.find(s => s.slug === slug);
  },

  getStoryByCode: (code: string): Story | undefined => {
    const data = ensureDataFile();
    const clean = code.replace('#', '').trim();
    return data.stories.find(s => s.code === clean);
  },

  getChaptersByStoryId: (storyId: string): Chapter[] => {
    const data = ensureDataFile();
    return data.chapters
      .filter(c => c.storyId === storyId)
      .sort((a, b) => a.chapterIndex - b.chapterIndex);
  },

  getChapterByIndex: (storyId: string, index: number): Chapter | undefined => {
    const data = ensureDataFile();
    return data.chapters.find(c => c.storyId === storyId && c.chapterIndex === index);
  },

  getUserByPhone: (phone: string): User | undefined => {
    const data = ensureDataFile();
    return data.users.find(u => u.phone === phone || u.id === phone);
  },

  getUserByIdOrPhone: (idOrPhone: string): User | undefined => {
    const data = ensureDataFile();
    return data.users.find(u => u.id === idOrPhone || u.phone === idOrPhone);
  },

  createUser: (phone: string, pin: string, customId?: string): User => {
    const data = ensureDataFile();
    const user: User = {
      id: customId || phone || `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      phone,
      pin,
      vipUntil: null,
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    // Khởi tạo ví 0 xu
    data.wallets.push({
      userId: user.id,
      balance: 0,
      updatedAt: new Date().toISOString(),
    });
    saveData(data);
    return user;
  },

  getWallet: (userId: string): Wallet => {
    const data = ensureDataFile();
    let wallet = data.wallets.find(w => w.userId === userId);
    if (!wallet) {
      wallet = {
        userId,
        balance: 0,
        updatedAt: new Date().toISOString(),
      };
      data.wallets.push(wallet);
      saveData(data);
    }
    return wallet;
  },

  addCoins: (userId: string, coins: number): Wallet => {
    const data = ensureDataFile();
    let wallet = data.wallets.find(w => w.userId === userId);
    if (!wallet) {
      wallet = { userId, balance: coins, updatedAt: new Date().toISOString() };
      data.wallets.push(wallet);
    } else {
      wallet.balance += coins;
      wallet.updatedAt = new Date().toISOString();
    }
    saveData(data);
    return wallet;
  },

  deductCoins: (userId: string, coins: number): boolean => {
    const data = ensureDataFile();
    const wallet = data.wallets.find(w => w.userId === userId);
    if (!wallet || wallet.balance < coins) {
      return false;
    }
    wallet.balance -= coins;
    wallet.updatedAt = new Date().toISOString();
    saveData(data);
    return true;
  },

  addVipDays: (userId: string, days: number): User | undefined => {
    const data = ensureDataFile();
    let user = data.users.find(u => u.id === userId || u.phone === userId);
    if (!user) {
      user = {
        id: userId,
        phone: userId,
        pin: '1234',
        vipUntil: null,
        createdAt: new Date().toISOString(),
      };
      data.users.push(user);
    }

    const now = new Date();
    let expireDate = now;
    if (user.vipUntil && new Date(user.vipUntil) > now) {
      expireDate = new Date(user.vipUntil);
    }
    expireDate.setDate(expireDate.getDate() + days);
    user.vipUntil = expireDate.toISOString();
    saveData(data);
    return user;
  },

  isVip: (userId: string): boolean => {
    const data = ensureDataFile();
    const user = data.users.find(u => u.id === userId || u.phone === userId);
    if (!user || !user.vipUntil) return false;
    return new Date(user.vipUntil) > new Date();
  },

  hasUnlockedChapter: (userId: string, chapterId: string): boolean => {
    const data = ensureDataFile();
    return (data.unlockedChapters || []).some(u => u.userId === userId && u.chapterId === chapterId);
  },

  hasUnlockedStory: (userId: string, storyId: string): boolean => {
    const data = ensureDataFile();
    return (data.unlockedChapters || []).some(u => u.userId === userId && u.storyId === storyId);
  },

  unlockChapter: (userId: string, chapterId: string, storyId: string): void => {
    const data = ensureDataFile();
    if (!data.unlockedChapters.some(u => u.userId === userId && u.chapterId === chapterId)) {
      data.unlockedChapters.push({
        id: `unlock-${Date.now()}`,
        userId,
        chapterId,
        storyId,
        unlockedAt: new Date().toISOString(),
      });
      saveData(data);
    }
  },

  createOrder: (order: Order): Order => {
    const data = ensureDataFile();
    data.orders.push(order);
    saveData(data);
    return order;
  },

  getOrderByCode: (orderCode: string): Order | undefined => {
    const data = ensureDataFile();
    return data.orders.find(o => o.orderCode === orderCode);
  },

  completeOrder: (orderCode: string, sepayTransactionId?: string): Order | undefined => {
    const data = ensureDataFile();
    const order = data.orders.find(o => o.orderCode === orderCode);
    if (!order || order.status === 'completed') return order;

    order.status = 'completed';
    order.sepayTransactionId = sepayTransactionId;
    order.completedAt = new Date().toISOString();

    // Thực hiện logic cộng Xu hoặc VIP
    if (order.packageType === 'VIP_39K') {
      const user = data.users.find(u => u.id === order.userId);
      if (user) {
        const now = new Date();
        let exp = now;
        if (user.vipUntil && new Date(user.vipUntil) > now) {
          exp = new Date(user.vipUntil);
        }
        exp.setDate(exp.getDate() + (order.vipDaysReceived || 30));
        user.vipUntil = exp.toISOString();
      }

      if (order.coinsReceived && order.coinsReceived > 0) {
        let wallet = data.wallets.find(w => w.userId === order.userId);
        if (!wallet) {
          wallet = { userId: order.userId, balance: order.coinsReceived, updatedAt: new Date().toISOString() };
          data.wallets.push(wallet);
        } else {
          wallet.balance += order.coinsReceived;
          wallet.updatedAt = new Date().toISOString();
        }
      }
    } else {
      let wallet = data.wallets.find(w => w.userId === order.userId);
      if (!wallet) {
        wallet = { userId: order.userId, balance: order.coinsReceived, updatedAt: new Date().toISOString() };
        data.wallets.push(wallet);
      } else {
        wallet.balance += order.coinsReceived;
        wallet.updatedAt = new Date().toISOString();
      }
    }

    // Nếu đơn hàng có tipDetails (Mời Cà Phê bằng tiền thật)
    if (order.tipDetails && order.tipDetails.storyId) {
      if (!data.chapterTips) data.chapterTips = [];
      const user = data.users.find(u => u.id === order.userId);
      const uName = (user as any)?.name || (user as any)?.phone || 'Độc giả';
      const uAvatar = (user as any)?.avatar || '';

      const tipRecord: ChapterTipRecord = {
        id: `tip-vnd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        storyId: order.tipDetails.storyId,
        chapterIndex: order.tipDetails.chapterIndex || 1,
        userId: order.userId,
        userName: uName,
        userAvatar: uAvatar,
        amountVnd: order.amountVnd,
        amountCoins: order.coinsReceived || 0,
        message: order.tipDetails.message,
        isPrivate: order.tipDetails.isPrivate,
        orderCode: order.orderCode,
        createdAt: new Date().toISOString(),
      };
      data.chapterTips.unshift(tipRecord);

      // Đăng bình luận vinh danh vào tập truyện
      try {
        const commentContent = order.tipDetails.isPrivate
          ? `☕ [Mời Cà Phê] Đã ủng hộ ${order.amountVnd.toLocaleString('vi-VN')}đ tiền cà phê và gửi lời nhắn riêng tư! 🔒❤️`
          : order.tipDetails.message
          ? `☕ Đã mời tác giả ${order.amountVnd.toLocaleString('vi-VN')}đ ly cà phê: "${order.tipDetails.message}" ❤️`
          : `☕ Đã mời tác giả ${order.amountVnd.toLocaleString('vi-VN')}đ ly cà phê ấm áp! ❤️`;

        if (!data.comments) data.comments = [];
        data.comments.unshift({
          id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          storyId: order.tipDetails.storyId,
          chapterIndex: order.tipDetails.chapterIndex || 1,
          userId: order.userId,
          userName: uName,
          userAvatar: uAvatar,
          content: commentContent,
          likes: 0,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {}
    }

    saveData(data);
    return order;
  },

  getAllOrders: (): Order[] => {
    const data = ensureDataFile();
    return [...data.orders].reverse();
  },

  getAllUsersWithWallets: () => {
    const data = ensureDataFile();
    return (data.users || []).map(u => {
      const wallet = (data.wallets || []).find(w => w.userId === u.id);
      const unlockedCount = (data.unlockedChapters || []).filter(uc => uc.userId === u.id).length;
      const isVip = Boolean(u.vipUntil && new Date(u.vipUntil) > new Date());
      return {
        id: u.id,
        phone: u.phone,
        name: u.name || u.phone || u.id,
        email: u.email || '',
        balance: wallet?.balance || 0,
        coins: wallet?.balance || 0,
        isVip,
        vipUntil: u.vipUntil,
        unlockedCount,
        createdAt: u.createdAt,
      };
    }).reverse();
  },

  adjustCoins: (userId: string, amount: number) => {
    const data = ensureDataFile();
    let wallet = (data.wallets || []).find(w => w.userId === userId);
    if (!wallet) {
      wallet = { userId, balance: Math.max(0, amount), updatedAt: new Date().toISOString() };
      data.wallets.push(wallet);
    } else {
      wallet.balance = Math.max(0, wallet.balance + amount);
      wallet.updatedAt = new Date().toISOString();
    }
    saveData(data);
    return wallet;
  },

  addStory: (story: Story): Story => {
    const data = ensureDataFile();
    data.stories.unshift(story);
    saveData(data);
    return story;
  },

  addChapter: (chapter: Chapter): Chapter => {
    const data = ensureDataFile();
    data.chapters.push(chapter);
    const story = data.stories.find(s => s.id === chapter.storyId);
    if (story) {
      story.chaptersCount += 1;
    }
    saveData(data);
    return chapter;
  },

  deleteStory: (storyId: string): void => {
    const data = ensureDataFile();
    data.stories = (data.stories || []).filter((s: Story) => s.id !== storyId);
    data.chapters = (data.chapters || []).filter((c: Chapter) => c.storyId !== storyId);
    saveData(data);
  },

  updateStory: (storyId: string, updates: Partial<Story>): Story | undefined => {
    const data = ensureDataFile();
    const story = data.stories.find(s => s.id === storyId);
    if (!story) return undefined;
    Object.assign(story, updates);
    saveData(data);
    return story;
  },

  replaceChaptersForStory: (storyId: string, newChapters: Chapter[]): void => {
    const data = ensureDataFile();
    data.chapters = (data.chapters || []).filter(c => c.storyId !== storyId);
    data.chapters.push(...newChapters);
    const story = data.stories.find(s => s.id === storyId);
    if (story) {
      story.chaptersCount = newChapters.length;
    }
    saveData(data);
  },

  setVip: (userId: string, vipUntil: string | null) => {
    const data = ensureDataFile();
    let user = data.users.find(u => u.id === userId);
    if (!user) {
      user = {
        id: userId,
        phone: userId,
        pin: '0000',
        vipUntil: vipUntil || null,
        createdAt: new Date().toISOString()
      };
      data.users.push(user);
    } else {
      user.vipUntil = vipUntil || null;
    }
    saveData(data);
    return user;
  },

  cleanupTestData: (clearAllOrders: boolean = true) => {
    const data = ensureDataFile();
    const testPatterns = ['audit_user_', 'test_truth_', 'guest-'];
    const isTest = (str: string) => testPatterns.some(p => str && str.includes(p));

    data.users = (data.users || []).filter(u => !isTest(u.id) && !isTest(u.phone));
    data.wallets = (data.wallets || []).filter(w => !isTest(w.userId));
    data.unlockedChapters = [];
    data.orders = [];
    data.analytics = [];
    data.comments = [];

    saveData(data);
    return true;
  },

  recordAnalytics: (event: Omit<AnalyticsEvent, 'id' | 'createdAt'> & { id?: string }): AnalyticsEvent => {
    const data = ensureDataFile();
    if (!data.analytics) data.analytics = [];

    const deviceId = event.id || `dev-${Date.now()}`;
    const existingIndex = data.analytics.findIndex(e => e.id === deviceId);

    if (existingIndex >= 0) {
      // 1 Máy cũ: Chỉ cập nhật trang đang xem và thời gian hoạt động mới nhất, KHÔNG TĂNG SỐ LƯỢNG MÁY
      data.analytics[existingIndex] = {
        ...data.analytics[existingIndex],
        path: event.path,
        storyId: event.storyId,
        storyTitle: event.storyTitle,
        createdAt: new Date().toISOString(),
      };
      saveData(data);
      return data.analytics[existingIndex];
    }

    // Máy mới lần đầu truy cập
    const newEvent: AnalyticsEvent = {
      ...event,
      id: deviceId,
      createdAt: new Date().toISOString(),
    };
    data.analytics.unshift(newEvent);
    if (data.analytics.length > 5000) {
      data.analytics = data.analytics.slice(0, 5000);
    }
    saveData(data);
    return newEvent;
  },

  getAnalyticsSummary: () => {
    const data = ensureDataFile();
    const events = data.analytics || [];
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const todayEvents = events.filter(e => e.createdAt && e.createdAt.startsWith(todayStr));
    const totalViews = events.length;
    const todayViews = todayEvents.length;

    const sources: Record<string, number> = {};
    events.forEach(e => {
      const src = e.referrer || 'direct';
      sources[src] = (sources[src] || 0) + 1;
    });

    const devices: Record<string, number> = {};
    events.forEach(e => {
      const dev = e.device || 'Khác';
      devices[dev] = (devices[dev] || 0) + 1;
    });

    const storyViews: Record<string, { title: string; count: number }> = {};
    events.filter(e => e.storyId).forEach(e => {
      const sId = e.storyId!;
      const title = e.storyTitle || sId;
      if (!storyViews[sId]) {
        storyViews[sId] = { title, count: 0 };
      }
      storyViews[sId].count += 1;
    });

    return {
      totalViews,
      todayViews,
      sources,
      devices,
      topStories: Object.values(storyViews).sort((a, b) => b.count - a.count).slice(0, 5),
      recentEvents: events.slice(0, 30),
    };
  },

  incrementStoryViews: (storyId: string) => {
    const data = ensureDataFile();
    const story = data.stories.find(s => s.id === storyId);
    if (story) {
      story.views = (story.views || 0) + 1;
      saveData(data);
      return story.views;
    }
    return 0;
  },

  getComments: (storyId: string, chapterIndex?: number): Comment[] => {
    const data = ensureDataFile();
    let comments = data.comments || [];
    comments = comments.filter(c => c.storyId === storyId);
    if (chapterIndex !== undefined) {
      comments = comments.filter(c => c.chapterIndex === chapterIndex);
    }
    return comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  addComment: (comment: Omit<Comment, 'id' | 'createdAt' | 'likes' | 'likedBy'>): Comment => {
    const data = ensureDataFile();
    if (!data.comments) data.comments = [];
    const newComment: Comment = {
      ...comment,
      id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      likes: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
    };
    data.comments.unshift(newComment);
    saveData(data);
    return newComment;
  },

  likeComment: (commentId: string, userId: string): { likes: number; liked: boolean } => {
    const data = ensureDataFile();
    const comment = (data.comments || []).find(c => c.id === commentId);
    if (!comment) return { likes: 0, liked: false };
    if (!comment.likedBy) comment.likedBy = [];

    const idx = comment.likedBy.indexOf(userId);
    let liked = false;
    if (idx >= 0) {
      comment.likedBy.splice(idx, 1);
      comment.likes = Math.max(0, (comment.likes || 1) - 1);
      liked = false;
    } else {
      comment.likedBy.push(userId);
      comment.likes = (comment.likes || 0) + 1;
      liked = true;
    }
    saveData(data);
    return { likes: comment.likes, liked };
  },

  deleteComment: (commentId: string): boolean => {
    const data = ensureDataFile();
    const prevLen = (data.comments || []).length;
    data.comments = (data.comments || []).filter(c => c.id !== commentId);
    saveData(data);
    return data.comments.length < prevLen;
  },

  getAllFeedback: (): FeedbackItem[] => {
    const data = ensureDataFile();
    return [...(data.feedback || [])].reverse();
  },

  addFeedback: (item: Omit<FeedbackItem, 'id' | 'createdAt' | 'status'>): FeedbackItem => {
    const data = ensureDataFile();
    if (!data.feedback) data.feedback = [];
    const newFeedback: FeedbackItem = {
      ...item,
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    data.feedback.unshift(newFeedback);
    if (data.feedback.length > 1000) {
      data.feedback = data.feedback.slice(0, 1000);
    }
    saveData(data);
    return newFeedback;
  },

  updateFeedbackStatus: (id: string, status: 'new' | 'reviewed'): boolean => {
    const data = ensureDataFile();
    const item = (data.feedback || []).find(f => f.id === id);
    if (!item) return false;
    item.status = status;
    saveData(data);
    return true;
  },

  deleteFeedback: (id: string): boolean => {
    const data = ensureDataFile();
    const prevLen = (data.feedback || []).length;
    data.feedback = (data.feedback || []).filter(f => f.id !== id);
    saveData(data);
    return data.feedback.length < prevLen;
  },

  getLuckyWheelSettings: (): LuckyWheelSettings => {
    const data = ensureDataFile();
    if (!data.luckyWheelSettings || !data.luckyWheelSettings.prizes?.length) {
      return DEFAULT_LUCKY_WHEEL_SETTINGS;
    }
    return data.luckyWheelSettings;
  },

  saveLuckyWheelSettings: (settings: Partial<LuckyWheelSettings>): LuckyWheelSettings => {
    const data = ensureDataFile();
    const current = data.luckyWheelSettings || DEFAULT_LUCKY_WHEEL_SETTINGS;
    data.luckyWheelSettings = {
      spinCostCoins: typeof settings.spinCostCoins === 'number' ? settings.spinCostCoins : current.spinCostCoins,
      freeSpinDaily: typeof settings.freeSpinDaily === 'boolean' ? settings.freeSpinDaily : current.freeSpinDaily,
      prizes: Array.isArray(settings.prizes) && settings.prizes.length >= 2 ? settings.prizes : current.prizes,
    };
    saveData(data);
    return data.luckyWheelSettings;
  },

  getLuckyWheelHistory: (): LuckyWheelSpinRecord[] => {
    const data = ensureDataFile();
    return data.luckyWheelHistory || [];
  },

  recordLuckyWheelSpin: (record: LuckyWheelSpinRecord): LuckyWheelSpinRecord => {
    const data = ensureDataFile();
    if (!data.luckyWheelHistory) {
      data.luckyWheelHistory = [];
    }
    data.luckyWheelHistory.unshift(record);
    if (data.luckyWheelHistory.length > 2000) {
      data.luckyWheelHistory = data.luckyWheelHistory.slice(0, 2000);
    }
    saveData(data);
    return record;
  },

  getChapterTips: (storyId?: string, chapterIndex?: number): ChapterTipRecord[] => {
    const data = ensureDataFile();
    let tips = data.chapterTips || [];
    if (storyId) {
      tips = tips.filter(t => t.storyId === storyId);
    }
    if (chapterIndex !== undefined) {
      tips = tips.filter(t => t.chapterIndex === chapterIndex);
    }
    return tips;
  },

  recordChapterTip: (record: ChapterTipRecord): ChapterTipRecord => {
    const data = ensureDataFile();
    if (!data.chapterTips) {
      data.chapterTips = [];
    }
    data.chapterTips.unshift(record);
    if (data.chapterTips.length > 2000) {
      data.chapterTips = data.chapterTips.slice(0, 2000);
    }
    saveData(data);
    return record;
  },

  // === LIVE CHAT 1-1 HỖ TRỢ ĐỘC GIẢ ===
  getOrCreateConversation: (userId: string, userName?: string, userContact?: string): SupportConversation => {
    const data = ensureDataFile();
    if (!data.supportConversations) data.supportConversations = [];
    let conv = data.supportConversations.find(c => c.userId === userId);
    if (!conv) {
      conv = {
        id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId,
        userName: userName || `Độc giả ${userId.slice(-4)}`,
        userContact: userContact || '',
        lastMessage: 'Cuộc trò chuyện đã được tạo',
        lastSender: 'admin',
        unreadAdmin: 0,
        unreadUser: 0,
        updatedAt: new Date().toISOString(),
      };
      data.supportConversations.unshift(conv);
      saveData(data);
    } else {
      let changed = false;
      if (userName && conv.userName !== userName) {
        conv.userName = userName;
        changed = true;
      }
      if (userContact && conv.userContact !== userContact) {
        conv.userContact = userContact;
        changed = true;
      }
      if (changed) saveData(data);
    }
    return conv;
  },

  getAllConversations: (): SupportConversation[] => {
    const data = ensureDataFile();
    return (data.supportConversations || []).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  getConversationById: (convId: string): SupportConversation | undefined => {
    const data = ensureDataFile();
    return (data.supportConversations || []).find(c => c.id === convId);
  },

  getConversationByUserId: (userId: string): SupportConversation | undefined => {
    const data = ensureDataFile();
    return (data.supportConversations || []).find(c => c.userId === userId);
  },

  getMessagesByConversationId: (convId: string): SupportMessage[] => {
    const data = ensureDataFile();
    return (data.supportMessages || [])
      .filter(m => m.conversationId === convId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  addSupportMessage: (
    convId: string,
    sender: 'user' | 'admin',
    content: string,
    imageUrl?: string
  ): SupportMessage => {
    const data = ensureDataFile();
    if (!data.supportMessages) data.supportMessages = [];
    if (!data.supportConversations) data.supportConversations = [];

    const msg: SupportMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      conversationId: convId,
      sender,
      content,
      imageUrl: imageUrl || '',
      createdAt: new Date().toISOString(),
    };
    data.supportMessages.push(msg);

    // Cập nhật cuộc trò chuyện
    const conv = data.supportConversations.find(c => c.id === convId);
    if (conv) {
      conv.lastMessage = content || (imageUrl ? '[Đã gửi một hình ảnh]' : '');
      conv.lastSender = sender;
      conv.updatedAt = msg.createdAt;
      if (sender === 'user') {
        conv.unreadAdmin = (conv.unreadAdmin || 0) + 1;
      } else {
        conv.unreadUser = (conv.unreadUser || 0) + 1;
      }
    }

    saveData(data);
    return msg;
  },

  markConversationRead: (convId: string, reader: 'admin' | 'user') => {
    const data = ensureDataFile();
    if (!data.supportConversations) return;
    const conv = data.supportConversations.find(c => c.id === convId);
    if (conv) {
      if (reader === 'admin') {
        conv.unreadAdmin = 0;
      } else {
        conv.unreadUser = 0;
      }
      saveData(data);
    }
  }
};

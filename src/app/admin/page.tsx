'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Plus, DollarSign, BookOpen, 
  Trash2, ArrowLeft, Lock, LogOut, Loader2,
  Upload, Image as ImageIcon, X, FileImage,
  Users, Search, Coins, ExternalLink,
  Copy, Check, ChevronLeft, ChevronRight,
  FolderPlus, AlertCircle, ArrowUpRight, RefreshCw, Pencil,
  Maximize2, ZoomIn, Move
} from 'lucide-react';
import { Story, Order } from '@/lib/types';
import { compressImage, formatFileSize } from '@/lib/image-compressor';

interface ChapterItem {
  title: string;
  content: string;
  images: string[];
  imageLinks: string;
  priceCoins: number;
  uploading?: boolean;
  uploadProgress?: {
    current: number;
    total: number;
    percent: number;
  } | null;
  uploadStats?: {
    count: number;
    original: number;
    compressed: number;
    reduction: number;
  } | null;
}

const PRESET_GENRES = [
  'Tuổi Thơ - Đời Thường',
  'Chuyện Làng Quê - Hoài Niệm',
  'Học Đường - Tuổi Học Trò',
  'Gia Đình - Cha Mẹ',
  'Châm Biếm - Tấu Hài Đời Thực',
  'Kinh Dị - Giật Gân',
  'Tâm Linh - Bí Ẩn Dân Gian',
  'Đô Thị Kỳ Dị - Bóc Phốt',
  'Trinh Thám - Phá Án',
  'Tình Cảm - Thanh Xuân',
  'Mưu Sinh - Khởi Nghiệp',
  'Truyện Ngụ Ngôn - Bài Học Sống',
];

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPass, setInputPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // 5 Phân khu chính: stories | customers | revenue | analytics | feedback
  const [activeTab, setActiveTab] = useState<'stories' | 'customers' | 'revenue' | 'analytics' | 'feedback'>('stories');
  const [analytics, setAnalytics] = useState<any>(null);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  
  // Bộ lọc
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'recharged' | 'google' | 'vip' | 'has_coins'>('all');
  const [storySearch, setStorySearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'completed' | 'pending' | 'expired'>('all');
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<'all' | 'bug' | 'content' | 'payment' | 'other'>('all');
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState<'all' | 'new' | 'reviewed'>('all');

  // Toast
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);
  const [copiedStoryId, setCopiedStoryId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  const [stats, setStats] = useState({
    totalStories: 0,
    totalOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    totalUsers: 0,
  });
  const [stories, setStories] = useState<Story[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form đăng truyện mới
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Tuổi Thơ - Đời Thường');
  const [isCustomGenre, setIsCustomGenre] = useState(false);
  const [coverImage, setCoverImage] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverStats, setCoverStats] = useState<{ original: number; compressed: number; reduction: number } | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const chapterInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);

  const [summary, setSummary] = useState('');
  const [creating, setCreating] = useState(false);

  const [chapters, setChapters] = useState<ChapterItem[]>([
    { title: 'Tập 1', content: '', images: [], imageLinks: '', priceCoins: 0 },
  ]);
  const [defaultLockPrice, setDefaultLockPrice] = useState<number>(5);
  const [defaultLockFrom, setDefaultLockFrom] = useState<number>(2);

  // Lightbox Preview ảnh lớn
  const [previewModal, setPreviewModal] = useState<{
    images: string[];
    currentIndex: number;
    chapterTitle?: string;
  } | null>(null);

  // Kéo thả thay đổi thứ tự ảnh (Drag and Drop)
  const [draggedImg, setDraggedImg] = useState<{ chapIdx: number; imgIdx: number } | null>(null);
  const [dragOverImg, setDragOverImg] = useState<{ chapIdx: number; imgIdx: number } | null>(null);

  // Vị trí thanh trượt ngang xem toàn bộ ảnh slide (0 - 100%)
  const [sliderPositions, setSliderPositions] = useState<{ [chapIdx: number]: number }>({});

  const scrollSlider = (chapIdx: number, direction: 'left' | 'right') => {
    const el = document.getElementById(`chap-slider-${chapIdx}`);
    if (el) {
      el.scrollBy({ left: direction === 'left' ? -350 : 350, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (!previewModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewModal(null);
      } else if (e.key === 'ArrowLeft') {
        setPreviewModal((prev) =>
          prev ? { ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) } : null
        );
      } else if (e.key === 'ArrowRight') {
        setPreviewModal((prev) =>
          prev ? { ...prev, currentIndex: Math.min(prev.images.length - 1, prev.currentIndex + 1) } : null
        );
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [previewModal]);

  const getAdminHeaders = () => {
    const token = typeof window !== 'undefined' ? sessionStorage.getItem('hoidonho_admin_token') : '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'x-admin-token': token } : {}),
    };
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = sessionStorage.getItem('hoidonho_admin_token');
        const res = await fetch('/api/admin/check-auth', {
          headers: token ? { 'x-admin-token': token } : {},
        });
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          fetchData();
        }
      } catch (e) {
        // unauthenticated
      }
    };
    checkAuth();
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: inputPass }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.token) {
          sessionStorage.setItem('hoidonho_admin_token', data.token);
        }
        setIsAuthenticated(true);
        fetchData();
        showToast('Đăng nhập thành công');
      } else {
        setLoginError(data.message || 'Mật khẩu quản trị không đúng');
      }
    } catch (e) {
      setLoginError('Lỗi kết nối xác thực máy chủ');
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {}
    sessionStorage.removeItem('hoidonho_admin_token');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('admin_auth_changed'));
    }
    setIsAuthenticated(false);
    showToast('Đã đăng xuất quản trị', 'info');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stories', {
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats || { totalStories: 0, totalOrders: 0, completedOrders: 0, totalRevenue: 0, totalUsers: 0 });
        setStories(Array.isArray(data.stories) ? data.stories : []);
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        if (Array.isArray(data.users)) {
          const normalized = data.users.map((u: any) => ({
            ...u,
            coins: u.coins ?? u.balance ?? 0,
            unlockedCount: u.unlockedCount ?? (u.unlockedChapters?.length || 0),
          }));
          setUsers(normalized);
        } else {
          setUsers([]);
        }
      }

      try {
        const aRes = await fetch('/api/admin/analytics', { headers: getAdminHeaders() });
        const aData = await aRes.json();
        if (aData.success && aData.analytics) {
          setAnalytics(aData.analytics);
        }
      } catch (aErr) {}

      try {
        const fbRes = await fetch('/api/feedback', { headers: getAdminHeaders() });
        const fbData = await fbRes.json();
        if (fbData.success && Array.isArray(fbData.feedback)) {
          setFeedbackList(fbData.feedback);
        }
      } catch (fbErr) {}
    } catch (e) {
      console.error(e);
      showToast('Không thể tải dữ liệu', 'error');
    }
    setLoading(false);
  };

  // Tự động đồng bộ đơn hàng bên Admin khi có đơn đang chờ hoặc đang xử lý
  useEffect(() => {
    if (!isAuthenticated) return;
    const hasActiveOrder = Array.isArray(orders) && orders.some((o) => o.status === 'pending' || o.status === 'processing');
    if (!hasActiveOrder) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/admin/stories', { headers: getAdminHeaders() });
        const data = await res.json();
        if (data.success) {
          setStats(data.stats || { totalStories: 0, totalOrders: 0, completedOrders: 0, totalRevenue: 0, totalUsers: 0 });
          setOrders(Array.isArray(data.orders) ? data.orders : []);
          if (Array.isArray(data.users)) {
            setUsers(
              data.users.map((u: any) => ({
                ...u,
                coins: u.coins ?? u.balance ?? 0,
                unlockedCount: u.unlockedCount ?? (u.unlockedChapters?.length || 0),
              }))
            );
          }
        }
      } catch {}
    }, 4000);

    return () => clearInterval(poll);
  }, [isAuthenticated, orders]);

  const handleUpdateFeedbackStatus = async (id: string, status: 'new' | 'reviewed') => {
    try {
      const res = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: getAdminHeaders(),
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackList((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
        showToast('Đã cập nhật trạng thái');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa góp ý này?')) return;
    try {
      const res = await fetch(`/api/feedback?id=${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackList((prev) => prev.filter((f) => f.id !== id));
        showToast('Đã xóa góp ý');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleAdjustCoins = async (userId: string, amount: number, userPhone: string) => {
    try {
      const res = await fetch('/api/admin/stories', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ action: 'adjust_coins', userId, amount }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`${amount > 0 ? 'Cộng' : 'Trừ'} ${Math.abs(amount)} Điểm cho ${userPhone}`);
        fetchData();
      } else {
        showToast(data.message || 'Lỗi cập nhật', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleToggleVip = async (userId: string, userName: string, currentVip: boolean) => {
    const actionText = currentVip ? 'thu hồi VIP của' : 'cấp VIP 30 ngày cho';
    if (!confirm(`Bạn có chắc muốn ${actionText} ${userName}?`)) return;

    try {
      const res = await fetch('/api/admin/stories', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ action: 'toggle_vip', userId, days: 30 }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.isVip ? `Đã cấp VIP 30 ngày cho ${userName}` : `Đã thu hồi VIP của ${userName}`);
        fetchData();
      } else {
        showToast(data.message || 'Lỗi cập nhật', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleCleanupTestData = async () => {
    if (!confirm('XÁC NHẬN: Dọn dẹp sạch toàn bộ tài khoản test và đơn hàng test để chuẩn bị ra mắt chính thức?')) return;
    try {
      const res = await fetch('/api/admin/stories', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ action: 'cleanup_test_data' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã dọn dẹp sạch sẽ tài khoản & đơn hàng test!');
        fetchData();
      } else {
        showToast(data.message || 'Lỗi khi dọn test', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleApproveOrder = async (orderCode: string) => {
    if (!confirm(`XÁC NHẬN: Bạn muốn duyệt thủ công và cộng tiền/VIP cho đơn ${orderCode}?`)) return;
    try {
      const res = await fetch('/api/admin/stories', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ action: 'approve_order', orderCode }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Đã duyệt đơn thành công!');
        fetchData();
      } else {
        showToast(data.message || 'Lỗi khi duyệt đơn', 'error');
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleCopyStoryLink = (story: Story) => {
    const fullUrl = `${window.location.origin}/truyen/${story.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedStoryId(story.id);
    showToast(`Đã copy link: ${fullUrl}`);
    setTimeout(() => setCopiedStoryId(null), 2500);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverUploading(true);
    try {
      const comp = await compressImage(file, 1080, 0.85);
      const formData = new FormData();
      formData.append('file', comp.file);

      const token = typeof window !== 'undefined' ? sessionStorage.getItem('hoidonho_admin_token') : '';
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: token ? { 'x-admin-token': token } : {},
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setCoverImage(data.url);
        setCoverStats({
          original: comp.originalSize,
          compressed: comp.compressedSize,
          reduction: comp.reductionPercentage,
        });
        showToast(`Đã nén ảnh bìa (-${comp.reductionPercentage}%)`);
      }
    } catch (err: any) {
      showToast('Lỗi tải ảnh bìa: ' + err.message, 'error');
    }
    setCoverUploading(false);
  };

  const uploadFilesToChapter = async (idx: number, incomingFiles: File[]) => {
    if (!incomingFiles || incomingFiles.length === 0) return;

    // Sắp xếp tự nhiên theo tên file (1, 2, ... 10)
    const rawFiles = [...incomingFiles];
    rawFiles.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );

    const totalFiles = rawFiles.length;
    const updated = [...chapters];
    updated[idx].uploading = true;
    updated[idx].uploadProgress = { current: 0, total: totalFiles, percent: 0 };
    setChapters(updated);

    try {
      let accumulatedUrls: string[] = [...(chapters[idx].images || [])];
      let totalOrig = 0;
      let totalComp = 0;

      const chunkSize = 5;
      for (let i = 0; i < totalFiles; i += chunkSize) {
        const chunk = rawFiles.slice(i, i + chunkSize);
        const compressionPromises = chunk.map((file) => compressImage(file, 1080, 0.82));
        const compressedResults = await Promise.all(compressionPromises);

        const formData = new FormData();
        compressedResults.forEach((comp) => {
          totalOrig += comp.originalSize;
          totalComp += comp.compressedSize;
          formData.append('files', comp.file);
        });

        const token = typeof window !== 'undefined' ? sessionStorage.getItem('hoidonho_admin_token') : '';
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: token ? { 'x-admin-token': token } : {},
          body: formData,
        });
        const data = await res.json();

        if (data.success && Array.isArray(data.files)) {
          const newUrls = data.files.map((f: any) => f.url);
          accumulatedUrls = [...accumulatedUrls, ...newUrls];
        }

        const processedCount = Math.min(i + chunkSize, totalFiles);
        const percent = Math.round((processedCount / totalFiles) * 100);

        const currentTarget = [...chapters];
        currentTarget[idx].images = accumulatedUrls;
        currentTarget[idx].imageLinks = accumulatedUrls.join(', ');
        currentTarget[idx].uploadProgress = {
          current: processedCount,
          total: totalFiles,
          percent,
        };
        setChapters(currentTarget);
      }

      const reduction = totalOrig > 0 ? Math.max(0, Math.round(((totalOrig - totalComp) / totalOrig) * 100)) : 0;
      const finalTarget = [...chapters];
      finalTarget[idx].uploading = false;
      finalTarget[idx].uploadProgress = null;
      finalTarget[idx].uploadStats = {
        count: totalFiles,
        original: totalOrig,
        compressed: totalComp,
        reduction,
      };
      setChapters(finalTarget);

      showToast(`Đã thêm ${totalFiles} ảnh cho ${chapters[idx].title} (-${reduction}%)`);
    } catch (err: any) {
      showToast('Lỗi tải ảnh: ' + err.message, 'error');
      const target = [...chapters];
      target[idx].uploading = false;
      target[idx].uploadProgress = null;
      setChapters(target);
    }
  };

  const handleChapterUpload = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      uploadFilesToChapter(idx, Array.from(fileList));
    }
    e.target.value = '';
  };

  const handleDropFiles = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    setDraggingIdx(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
      if (files.length > 0) {
        uploadFilesToChapter(idx, files);
      } else {
        showToast('Vui lòng kéo thả file hình ảnh (JPG, PNG, WebP)', 'error');
      }
    }
  };

  const handleMoveImage = (chapIdx: number, imgIdx: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? imgIdx - 1 : imgIdx + 1;
    const currentImgs = [...(chapters[chapIdx].images || [])];
    if (targetIdx < 0 || targetIdx >= currentImgs.length) return;

    const temp = currentImgs[imgIdx];
    currentImgs[imgIdx] = currentImgs[targetIdx];
    currentImgs[targetIdx] = temp;

    const updated = [...chapters];
    updated[chapIdx].images = currentImgs;
    updated[chapIdx].imageLinks = currentImgs.join(', ');
    setChapters(updated);
  };

  const handleDropImage = (chapIdx: number, targetImgIdx: number) => {
    if (!draggedImg || draggedImg.chapIdx !== chapIdx) return;
    const sourceImgIdx = draggedImg.imgIdx;
    if (sourceImgIdx === targetImgIdx) {
      setDraggedImg(null);
      setDragOverImg(null);
      return;
    }

    const updated = [...chapters];
    const currentImgs = [...(updated[chapIdx].images || [])];
    const [moved] = currentImgs.splice(sourceImgIdx, 1);
    currentImgs.splice(targetImgIdx, 0, moved);

    updated[chapIdx].images = currentImgs;
    updated[chapIdx].imageLinks = currentImgs.join(', ');
    setChapters(updated);
    setDraggedImg(null);
    setDragOverImg(null);
  };

  const handleRemoveImageFromChapter = (chapIdx: number, imgIdx: number) => {
    const updated = [...chapters];
    const currentImgs = [...(updated[chapIdx].images || [])];
    currentImgs.splice(imgIdx, 1);
    updated[chapIdx].images = currentImgs;
    updated[chapIdx].imageLinks = currentImgs.join(', ');
    setChapters(updated);
  };

  const handleClearAllImagesInChapter = (chapIdx: number) => {
    if (!confirm(`Xóa toàn bộ ảnh trong ${chapters[chapIdx].title}?`)) return;
    const updated = [...chapters];
    updated[chapIdx].images = [];
    updated[chapIdx].imageLinks = '';
    updated[chapIdx].uploadStats = null;
    setChapters(updated);
  };

  const handleAddChapter = () => {
    const nextIdx = chapters.length + 1;
    const autoPrice = nextIdx >= defaultLockFrom ? defaultLockPrice : 0;
    setChapters([
      ...chapters,
      {
        title: `Tập ${nextIdx}`,
        content: '',
        images: [],
        imageLinks: '',
        priceCoins: autoPrice,
      },
    ]);
    showToast(`Đã thêm Tập ${nextIdx} (Tự động ${autoPrice === 0 ? 'Free' : `Khóa ${autoPrice} Điểm`})`);
  };

  const handleRemoveChapter = (idx: number) => {
    if (chapters.length <= 1) {
      showToast('Cần ít nhất 1 tập truyện', 'error');
      return;
    }
    if (!confirm(`Xóa ${chapters[idx].title}?`)) return;
    const updated = chapters.filter((_, i) => i !== idx);
    setChapters(updated);
    showToast('Đã xóa tập');
  };

  const handleStartEditStory = async (st: Story) => {
    setEditingStoryId(st.id);
    setCode(st.code);
    setTitle(st.title);
    setGenre(st.genre);
    setIsCustomGenre(!PRESET_GENRES.includes(st.genre));
    setCoverImage(st.coverImage);
    setSummary(st.summary);

    try {
      const res = await fetch(`/api/chapter/list?storyId=${st.id}`);
      const data = await res.json();
      if (data.success && data.chapters && data.chapters.length > 0) {
        const mapped = data.chapters.map((c: any) => ({
          title: c.title,
          content: '',
          images: c.images || [],
          imageLinks: (c.images || []).join(', '),
          priceCoins: c.priceCoins ?? 0,
        }));
        setChapters(mapped);

        // Tự động nhận diện tập khóa đầu tiên và số điểm
        const firstLockedIdx = mapped.findIndex((c: any) => c.priceCoins > 0);
        if (firstLockedIdx >= 0) {
          setDefaultLockFrom(firstLockedIdx + 1);
          setDefaultLockPrice(mapped[firstLockedIdx].priceCoins || 5);
        } else {
          setDefaultLockFrom(2);
          setDefaultLockPrice(5);
        }
      }
    } catch (e) {
      console.error(e);
    }
    showToast(`Đang chỉnh sửa: #${st.code} - ${st.title}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingStoryId(null);
    setCode('');
    setTitle('');
    setGenre('Tuổi Thơ - Đời Thường');
    setIsCustomGenre(false);
    setCoverImage('');
    setCoverStats(null);
    setSummary('');
    setChapters([
      { title: 'Tập 1', content: '', images: [], imageLinks: '', priceCoins: 0 },
    ]);
  };

  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !title) {
      showToast('Vui lòng nhập mã và tiêu đề truyện', 'error');
      return;
    }

    setCreating(true);

    try {
      // Chỉ lưu các tập ĐÃ CÓ ẢNH HOẶC CÓ NỘI DUNG
      const finalChapters = chapters
        .map(ch => ({
          title: ch.title,
          content: ch.content || '',
          images: (ch.images && ch.images.length > 0)
            ? ch.images
            : (ch.imageLinks ? ch.imageLinks.split(/[\n,]+/).map(s => s.trim()).filter(Boolean) : []),
          priceCoins: ch.priceCoins,
        }))
        .filter(ch => ch.images.length > 0 || ch.content.trim().length > 0);

      if (finalChapters.length === 0) {
        showToast('Vui lòng tải ít nhất 1 ảnh cho tập truyện trước khi lưu', 'error');
        setCreating(false);
        return;
      }

      const res = await fetch('/api/admin/stories', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          action: editingStoryId ? 'update_story' : 'create_story',
          storyId: editingStoryId,
          code,
          title,
          genre,
          coverImage,
          summary,
          chapters: finalChapters,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(editingStoryId ? `Đã cập nhật bộ truyện #${code}` : `Đã xuất bản truyện #${code}`);
        handleCancelEdit();
        fetchData();
      } else {
        showToast(data.message || 'Lỗi khi lưu', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
    setCreating(false);
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('Xác nhận xóa bộ truyện này?')) return;
    try {
      await fetch('/api/admin/stories', {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({ action: 'delete_story', storyId }),
      });
      showToast('Đã xóa bộ truyện');
      fetchData();
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xóa', 'error');
    }
  };

  const safeUsers = Array.isArray(users) ? users : [];
  const safeStories = Array.isArray(stories) ? stories : [];
  const safeOrders = Array.isArray(orders) ? orders : [];

  const filteredUsers = safeUsers.filter((u) => {
    const q = customerSearch.trim().toLowerCase();
    const matchSearch = !q || 
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q);
    
    if (!matchSearch) return false;
    if (customerFilter === 'vip') return u.isVip;
    if (customerFilter === 'recharged') return Boolean(u.hasRecharged || (u.totalRechargedVnd || 0) > 0);
    if (customerFilter === 'google') return Boolean(u.isGoogle);
    if (customerFilter === 'has_coins') return (u.coins || 0) > 0;
    return true;
  });

  const filteredStories = safeStories.filter((s) => {
    if (!storySearch.trim()) return true;
    const q = storySearch.toLowerCase().replace('#', '').trim();
    return (s.code || '').toLowerCase().includes(q) || (s.title || '').toLowerCase().includes(q);
  });

  const filteredOrders = safeOrders.filter((o) => {
    if (orderFilter === 'completed') return o.status === 'completed';
    if (orderFilter === 'pending') return o.status === 'pending' || o.status === 'processing';
    if (orderFilter === 'expired') return o.status === 'expired';
    return true;
  });

  const totalCirculatingCoins = safeUsers.reduce((acc, u) => acc + (u.coins || 0), 0);
  const totalVipUsers = safeUsers.filter((u) => u.isVip).length;
  const totalRechargedUsers = safeUsers.filter((u) => u.hasRecharged || (u.totalRechargedVnd || 0) > 0).length;
  const totalGoogleUsers = safeUsers.filter((u) => u.isGoogle).length;

  // 1. MÀN HÌNH KHÓA QUẢN TRỊ
  if (!isAuthenticated) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#111116] border border-[#22222B] rounded-xl p-6 space-y-5">
          <div className="space-y-1.5">
            <div className="text-xs font-semibold tracking-wider text-[#9E9EA8] uppercase">
              Hồi Đó Nhỏ
            </div>
            <h1 className="text-base font-semibold text-white">
              Cổng Quản Trị Nội Dung
            </h1>
            <p className="text-xs text-[#71717A]">
              Dành riêng cho chủ kênh @carrot.tia quản lý truyện và đơn nạp.
            </p>
          </div>

          {loginError && (
            <div className="p-2.5 text-xs text-red-300 bg-red-950/40 border border-red-900/50 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-medium text-[#9E9EA8] mb-1">
                Mật khẩu quản trị
              </label>
              <input
                type="password"
                value={inputPass}
                onChange={(e) => setInputPass(e.target.value)}
                placeholder="Nhập mã bảo vệ quản trị..."
                autoFocus
                className="w-full px-3 py-2 bg-[#0A0A0D] border border-[#272733] rounded-lg text-white text-xs placeholder-[#52525B] focus:outline-none focus:border-[#7C5CFC]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white font-medium rounded-lg text-xs transition"
            >
              Mở Khóa Quản Trị
            </button>
          </form>

          <div className="pt-2 border-t border-[#1C1C24] text-center">
            <Link href="/" className="text-xs text-[#71717A] hover:text-white transition flex items-center justify-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Về trang độc giả
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. DASHBOARD CHUYÊN NGHIỆP KIỂU STUDIO
  return (
    <div className="space-y-6 pb-20 text-white">
      {/* Toast thông báo */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
          <div className={`px-3.5 py-2 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2 border ${
            toast.type === 'error'
              ? 'bg-[#1C1215] text-red-300 border-red-800/40'
              : 'bg-[#111A16] text-emerald-300 border-emerald-800/40'
          }`}>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      

      {/* Header Studio */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E1E26] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              HỒI ĐÓ NHỎ STUDIO
            </h1>
            <span className="text-[10px] font-medium text-[#A1A1AA] bg-[#1E1E26] px-2 py-0.5 rounded border border-[#272733]">
              @carrot.tia
            </span>
          </div>
          <p className="text-xs text-[#71717A] mt-0.5">
            Không gian làm việc & điều hành nội dung truyện tranh TikTok
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="px-3 py-1.5 bg-[#14141B] hover:bg-[#1C1C24] border border-[#272733] rounded-lg text-xs text-[#D4D4D8] flex items-center gap-1.5 transition font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Xem Web Khách</span>
          </Link>

          <button
            onClick={fetchData}
            className="p-1.5 bg-[#14141B] hover:bg-[#1C1C24] border border-[#272733] rounded-lg text-[#71717A] hover:text-white transition"
            title="Tải lại"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleAdminLogout}
            className="px-2.5 py-1.5 text-xs text-[#A1A1AA] hover:text-red-300 transition"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* Bảng Chỉ Số Thực Nhận (Flat Ledger Metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div 
          onClick={() => setActiveTab('revenue')}
          className={`p-4 bg-[#111116] border rounded-xl cursor-pointer transition ${
            activeTab === 'revenue' ? 'border-[#7C5CFC] bg-[#14141E]' : 'border-[#1E1E26] hover:border-[#2E2E3C]'
          }`}
        >
          <div className="text-[11px] font-medium text-[#71717A]">
            Doanh thu VietQR
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {(stats?.totalRevenue || 0).toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[10px] text-[#A1A1AA] mt-1">
            {stats?.completedOrders || 0} đơn chuyển khoản thành công
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('customers')}
          className={`p-4 bg-[#111116] border rounded-xl cursor-pointer transition ${
            activeTab === 'customers' ? 'border-[#7C5CFC] bg-[#14141E]' : 'border-[#1E1E26] hover:border-[#2E2E3C]'
          }`}
        >
          <div className="text-[11px] font-medium text-[#71717A]">
            Độc giả đăng ký
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {safeUsers.length} người
          </div>
          <div className="text-[10px] text-[#A1A1AA] mt-1">
            {totalVipUsers} VIP • {totalCirculatingCoins} Điểm trong ví
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('stories')}
          className={`p-4 bg-[#111116] border rounded-xl cursor-pointer transition ${
            activeTab === 'stories' ? 'border-[#7C5CFC] bg-[#14141E]' : 'border-[#1E1E26] hover:border-[#2E2E3C]'
          }`}
        >
          <div className="text-[11px] font-medium text-[#71717A]">
            Kho truyện xuất bản
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {stats?.totalStories || 0} bộ
          </div>
          <div className="text-[10px] text-[#A1A1AA] mt-1">
            Slide 9:16 lướt ngang
          </div>
        </div>

        <div className="p-4 bg-[#111116] border border-[#1E1E26] rounded-xl">
          <div className="text-[11px] font-medium text-[#71717A]">
            Tự động Gmail • Sacombank
          </div>
          <div className="text-xs font-semibold text-emerald-400 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Đã liên kết (040121635056)</span>
          </div>
          <div className="text-[10px] text-[#71717A] mt-1">
            congducc2k6@gmail.com • Tự động 24/7
          </div>
        </div>
      </div>

      {/* Segmented Control Bar (Kiểu Linear / Vercel) */}
      <div className="flex items-center gap-1 p-1 bg-[#111116] border border-[#1E1E26] rounded-lg w-max">
        <button
          onClick={() => setActiveTab('stories')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition ${
            activeTab === 'stories'
              ? 'bg-[#22222E] text-white shadow-sm'
              : 'text-[#71717A] hover:text-white'
          }`}
        >
          Kho Truyện & Đăng Bài ({stories.length})
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition ${
            activeTab === 'customers'
              ? 'bg-[#22222E] text-white shadow-sm'
              : 'text-[#71717A] hover:text-white'
          }`}
        >
          Độc Giả & Khách Hàng ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('revenue')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition ${
            activeTab === 'revenue'
              ? 'bg-[#22222E] text-white shadow-sm'
              : 'text-[#71717A] hover:text-white'
          }`}
        >
          Dòng Tiền & Doanh Thu
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition ${
            activeTab === 'analytics'
              ? 'bg-[#22222E] text-white shadow-sm'
              : 'text-[#71717A] hover:text-white'
          }`}
        >
          📊 Thống Kê & Traffic ({analytics?.totalViews || 0})
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
            activeTab === 'feedback'
              ? 'bg-[#22222E] text-white shadow-sm'
              : 'text-[#71717A] hover:text-white'
          }`}
        >
          <span>📬 Hòm Thư Góp Ý</span>
          {feedbackList.filter(f => f.status === 'new').length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#7C5CFC] text-white font-bold animate-pulse">
              {feedbackList.filter(f => f.status === 'new').length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================ */}
      {/* 1. KHO TRUYỆN & ĐĂNG BÀI                                      */}
      {/* ============================================================ */}
      {activeTab === 'stories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột Trái: Soạn thảo & Đăng bộ truyện mới (7 cột) */}
          <div className="lg:col-span-7 bg-[#111116] border border-[#1E1E26] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E1E26] pb-3">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  {editingStoryId ? `Chỉnh Sửa Bộ Truyện #${code}` : 'Soạn Thảo Bộ Truyện Mới'}
                </h2>
                <p className="text-[11px] text-[#71717A]">
                  {editingStoryId ? 'Thêm tập mới, thay ảnh và cập nhật nội dung' : 'Ảnh tự động nén WebP trước khi lưu'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {editingStoryId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-medium rounded-lg text-zinc-300 transition"
                  >
                    Hủy sửa
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddChapter}
                  className="px-2.5 py-1 bg-[#1A1A22] hover:bg-[#252530] border border-[#272733] text-xs font-medium rounded-lg transition text-[#D4D4D8] flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm Tập</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateStory} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#9E9EA8] font-medium mb-1">Mã TikTok (vd: 04, 05)</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="04"
                    className="w-full px-3 py-2 bg-[#0A0A0D] border border-[#272733] rounded-lg text-white focus:outline-none focus:border-[#7C5CFC]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#9E9EA8] font-medium">Thể loại / Chủ đề</label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !isCustomGenre;
                        setIsCustomGenre(next);
                        if (!next && !PRESET_GENRES.includes(genre)) {
                          setGenre(PRESET_GENRES[0]);
                        }
                      }}
                      className="text-[10px] text-[#A78BFA] hover:text-white transition underline"
                    >
                      {isCustomGenre ? '← Chọn danh sách' : '✏️ Tự đặt tên'}
                    </button>
                  </div>

                  {isCustomGenre ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        placeholder="Nhập tên chủ đề tùy ý (vd: Trinh Thám, Làng Quê...)"
                        className="w-full px-3 py-2 bg-[#0A0A0D] border border-[#7C5CFC] rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-[#7C5CFC]"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <select
                      value={genre}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomGenre(true);
                          setGenre('');
                        } else {
                          setGenre(e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#0A0A0D] border border-[#272733] rounded-lg text-white focus:outline-none focus:border-[#7C5CFC]"
                    >
                      {PRESET_GENRES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                      <option value="__custom__">✨ (+) Tự nhập tên chủ đề khác...</option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[#9E9EA8] font-medium mb-1">Tiêu đề truyện</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Chiếc xe Dream cọc cạch của bố..."
                  className="w-full px-3 py-2 bg-[#0A0A0D] border border-[#272733] rounded-lg text-white focus:outline-none focus:border-[#7C5CFC]"
                />
              </div>

              {/* Ảnh bìa */}
              <div className="p-3 bg-[#0A0A0D] border border-[#22222E] rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#9E9EA8]">Ảnh bìa (3:4 hoặc 9:16)</span>
                  {coverStats && (
                    <span className="text-[10px] text-emerald-400">
                      Đã nén -{coverStats.reduction}% ({formatFileSize(coverStats.compressed)})
                    </span>
                  )}
                </div>

                {coverImage && (
                  <div className="relative w-24 aspect-[3/4] rounded-lg overflow-hidden border border-[#2E2E3C] group">
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setCoverImage(''); setCoverStats(null); }}
                      className="absolute top-1 right-1 p-0.5 bg-black/80 hover:bg-red-600 rounded text-white transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={coverInputRef}
                    onChange={handleCoverUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={coverUploading}
                    className="px-3 py-1.5 bg-[#1C1C26] hover:bg-[#252533] border border-[#2A2A38] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    {coverUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>{coverUploading ? 'Đang nén WebP...' : 'Chọn ảnh bìa từ máy'}</span>
                  </button>
                  <span className="text-[11px] text-[#52525B]">hoặc dán URL</span>
                </div>

                <input
                  type="text"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://... hoặc /uploads/..."
                  className="w-full px-2.5 py-1.5 bg-[#14141B] border border-[#22222E] rounded-md text-white text-xs focus:outline-none focus:border-[#7C5CFC]"
                />
              </div>

              <div>
                <label className="block text-[#9E9EA8] font-medium mb-1">Tóm tắt nội dung</label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Đoạn văn ngắn giới thiệu bối cảnh câu chuyện..."
                  className="w-full px-3 py-2 bg-[#0A0A0D] border border-[#272733] rounded-lg text-white focus:outline-none focus:border-[#7C5CFC]"
                />
              </div>

              {/* Các tập slide ảnh */}
              <div className="space-y-3 pt-2 border-t border-[#1E1E26]">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-semibold text-white">Các tập truyện ({chapters.length})</span>
                      <span className="text-[11px] text-[#71717A] ml-2">Cài đặt tập khóa / miễn phí</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDefaultLockPrice(0);
                        setDefaultLockFrom(9999);
                        setChapters(chapters.map((c) => ({ ...c, priceCoins: 0 })));
                        showToast('Đã đặt Miễn Phí toàn bộ các tập (0đ)');
                      }}
                      className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-medium transition"
                      title="Đặt 0 xu cho tất cả các tập"
                    >
                      🔓 Miễn Phí Hết (0đ)
                    </button>
                  </div>

                  {/* Thanh cấu hình Khóa Full Bộ nhanh */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#121218] border border-[#232330] rounded-lg text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-medium text-white flex items-center gap-1">
                        <span>🔒 Khóa full bộ:</span>
                      </span>

                      {/* Tự đặt mức xu */}
                      <div className="flex items-center gap-1 bg-[#1A1A24] border border-[#2E2E3E] rounded px-2 py-0.5">
                        <span className="text-[10px] text-[#A1A1AA]">Mức khóa:</span>
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          value={defaultLockPrice}
                          onChange={(e) => setDefaultLockPrice(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-10 bg-transparent text-center font-bold text-[#F59E0B] focus:outline-none"
                          title="Tự đặt số xu/điểm để mở khóa full bộ"
                        />
                        <span className="text-[10px] text-[#A1A1AA]">Điểm</span>
                      </div>

                      {/* Khóa từ tập nào */}
                      <div className="flex items-center gap-1 bg-[#1A1A24] border border-[#2E2E3E] rounded px-2 py-0.5">
                        <span className="text-[10px] text-[#A1A1AA]">Từ tập:</span>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, chapters.length)}
                          value={defaultLockFrom}
                          onChange={(e) => setDefaultLockFrom(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-8 bg-transparent text-center font-bold text-white focus:outline-none"
                          title="Tập bắt đầu áp dụng khóa (các tập trước sẽ Free)"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setChapters(chapters.map((c, i) => {
                            const num = i + 1;
                            return {
                              ...c,
                              priceCoins: num >= defaultLockFrom ? defaultLockPrice : 0,
                            };
                          }));
                          showToast(`Đã áp dụng: Tập 1 -> ${defaultLockFrom - 1} Free, từ Tập ${defaultLockFrom} trở đi Khóa ${defaultLockPrice} Điểm (cả tập mới thêm)`);
                        }}
                        className="px-2.5 py-1 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white rounded text-[11px] font-medium transition shadow-sm"
                      >
                        Áp Dụng Khóa
                      </button>
                    </div>

                    <div className="text-[10px] text-[#71717A] italic">
                      * Các tập mới tải lên sau này sẽ tự động khóa theo cài đặt này
                    </div>
                  </div>
                </div>

                {chapters.map((chap, idx) => (
                  <div key={idx} className="p-3 bg-[#0A0A0D] border border-[#22222E] rounded-lg space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-[#71717A]">{idx + 1}.</span>
                        <input
                          type="text"
                          value={chap.title}
                          onChange={(e) => {
                            const updated = [...chapters];
                            updated[idx].title = e.target.value;
                            setChapters(updated);
                          }}
                          className="bg-transparent font-medium text-white focus:outline-none border-b border-transparent focus:border-[#7C5CFC]"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Nhập/chọn số điểm của tập này */}
                        <div className="flex items-center gap-1 bg-[#14141B] border border-[#272733] rounded px-1.5 py-0.5">
                          <input
                            type="number"
                            min={0}
                            max={1000}
                            value={chap.priceCoins}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              const updated = [...chapters];
                              updated[idx].priceCoins = val;
                              setChapters(updated);
                            }}
                            className="w-10 bg-transparent text-center font-bold text-[#F59E0B] text-xs focus:outline-none"
                            title="Số Điểm mở khóa tập này (0 = Free)"
                          />
                          <span className="text-[10px] text-[#A1A1AA]">{chap.priceCoins === 0 ? 'Free' : 'Điểm'}</span>
                        </div>

                        {/* Nút bấm nhanh Khóa tất cả các tập sau */}
                        <button
                          type="button"
                          onClick={() => {
                            const targetPrice = chap.priceCoins > 0 ? chap.priceCoins : (defaultLockPrice || 5);
                            const updated = chapters.map((c, i) => {
                              if (i >= idx) {
                                return { ...c, priceCoins: targetPrice };
                              }
                              return c;
                            });
                            setChapters(updated);
                            setDefaultLockPrice(targetPrice);
                            setDefaultLockFrom(idx + 1);
                            showToast(`Đã tự động khóa ${targetPrice} Điểm từ Tập ${idx + 1} đến hết (cả tập mới tải lên)`);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] bg-[#7C5CFC]/15 hover:bg-[#7C5CFC]/30 text-[#A78BFA] border border-[#7C5CFC]/30 transition font-medium whitespace-nowrap"
                          title="Tự động khóa mức xu này cho tập này và tất cả các tập sau"
                        >
                          🔒 Khóa full bộ từ tập này ({chap.priceCoins > 0 ? chap.priceCoins : (defaultLockPrice || 5)}đ)
                        </button>

                        {chapters.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveChapter(idx)}
                            className="text-[#52525B] hover:text-red-400 transition"
                            title="Xóa tập này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Khung tải nhiều ảnh slide chuẩn Studio */}
                    <div className="p-3 bg-[#111116] border border-[#1E1E26] rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-[#A1A1AA]">
                          {chap.images?.length || 0} ảnh slide trong tập
                        </span>

                        <div className="flex items-center gap-2">
                          {chap.images && chap.images.length > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleClearAllImagesInChapter(idx)}
                                className="text-[11px] text-red-400 hover:underline mr-1"
                              >
                                Xóa hết
                              </button>
                              <button
                                type="button"
                                onClick={() => chapterInputRefs.current[idx]?.click()}
                                disabled={chap.uploading}
                                className="px-3 py-1 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white rounded text-[11px] font-medium transition flex items-center gap-1.5"
                              >
                                <Upload className="w-3 h-3" />
                                <span>{chap.uploading ? 'Đang nén...' : '+ Thêm tiếp ảnh'}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Khung Drag & Drop to rõ ràng */}
                      {(!chap.images || chap.images.length === 0) && (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setDraggingIdx(idx); }}
                          onDragLeave={() => setDraggingIdx(null)}
                          onDrop={(e) => handleDropFiles(idx, e)}
                          onClick={() => chapterInputRefs.current[idx]?.click()}
                          className={`py-8 px-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center cursor-pointer transition ${
                            draggingIdx === idx
                              ? 'border-[#7C5CFC] bg-[#7C5CFC]/15 scale-[1.01]'
                              : 'border-[#2D2D3D] hover:border-[#7C5CFC]/60 bg-[#0A0A0D]'
                          }`}
                        >
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            ref={(el) => { chapterInputRefs.current[idx] = el; }}
                            disabled={chap.uploading}
                            onChange={(e) => handleChapterUpload(idx, e)}
                            className="hidden"
                          />
                          <div className="w-11 h-11 rounded-full bg-[#181824] text-[#7C5CFC] flex items-center justify-center mb-2.5">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-semibold text-white">
                            KÉO THẢ TOÀN BỘ ẢNH CỦA TẬP NÀY VÀO ĐÂY
                          </div>
                          <p className="text-[11px] text-[#71717A] mt-1">
                            hoặc click vào đây để chọn (Giữ <span className="text-[#F59E0B] font-mono">Ctrl</span> hoặc bấm <span className="text-[#F59E0B] font-mono">Ctrl + A</span> để chọn hàng loạt)
                          </p>
                          <div className="mt-2 text-[10px] text-[#52525B]">
                            Tự động xếp đúng số thứ tự 1, 2, ... 10 và nén WebP tốc độ cao
                          </div>
                        </div>
                      )}

                      {/* Input ẩn cho nút tải thêm nếu đã có ảnh */}
                      {chap.images && chap.images.length > 0 && (
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          ref={(el) => { chapterInputRefs.current[idx] = el; }}
                          disabled={chap.uploading}
                          onChange={(e) => handleChapterUpload(idx, e)}
                          className="hidden"
                        />
                      )}

                      {/* Tiến độ tải lên */}
                      {chap.uploading && chap.uploadProgress && (
                        <div className="space-y-1.5 p-3 bg-[#0A0A0D] rounded-lg border border-[#272733] animate-fadeIn">
                          <div className="flex justify-between text-xs text-[#A1A1AA]">
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7C5CFC]" />
                              <span>Đang nén & tải lên: <strong className="text-white">{chap.uploadProgress.current}/{chap.uploadProgress.total}</strong> ảnh</span>
                            </span>
                            <span className="font-mono text-[#7C5CFC] font-semibold">{chap.uploadProgress.percent}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#1C1C24] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#7C5CFC] to-[#9061F9] transition-all duration-200"
                              style={{ width: `${chap.uploadProgress.percent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Danh sách ảnh slide */}
                      {chap.images && chap.images.length > 0 ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-[#A1A1AA]">
                            <span className="flex items-center gap-1.5">
                              <Move className="w-3 h-3 text-[#7C5CFC]" />
                              <span>Kéo thả để đổi vị trí • Nhấn vào ảnh để xem to</span>
                            </span>
                            <span className="text-[#71717A] font-mono">{chap.images.length} ảnh</span>
                          </div>
                          <div
                            id={`chap-slider-${idx}`}
                            onScroll={(e) => {
                              const el = e.currentTarget;
                              const maxScroll = el.scrollWidth - el.clientWidth;
                              if (maxScroll > 0) {
                                const percent = Math.round((el.scrollLeft / maxScroll) * 100);
                                setSliderPositions((prev) => ({ ...prev, [idx]: percent }));
                              }
                            }}
                            onWheel={(e) => {
                              if (e.deltaY !== 0) {
                                e.currentTarget.scrollLeft += e.deltaY;
                              }
                            }}
                            className="flex items-center gap-2.5 overflow-x-auto admin-slider-scroll py-2 px-1 scroll-smooth"
                          >
                            {chap.images.map((imgUrl, imgIdx) => {
                              const isDraggingThis = draggedImg?.chapIdx === idx && draggedImg?.imgIdx === imgIdx;
                              const isOverThis = dragOverImg?.chapIdx === idx && dragOverImg?.imgIdx === imgIdx;
                              return (
                                <div
                                  key={imgIdx}
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('text/plain', String(imgIdx));
                                    setDraggedImg({ chapIdx: idx, imgIdx });
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = 'move';
                                    if (!dragOverImg || dragOverImg.imgIdx !== imgIdx || dragOverImg.chapIdx !== idx) {
                                      setDragOverImg({ chapIdx: idx, imgIdx });
                                    }
                                  }}
                                  onDragLeave={() => {
                                    if (dragOverImg?.chapIdx === idx && dragOverImg?.imgIdx === imgIdx) {
                                      setDragOverImg(null);
                                    }
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    handleDropImage(idx, imgIdx);
                                  }}
                                  onDragEnd={() => {
                                    setDraggedImg(null);
                                    setDragOverImg(null);
                                  }}
                                  onClick={() =>
                                    setPreviewModal({
                                      images: chap.images,
                                      currentIndex: imgIdx,
                                      chapterTitle: chap.title,
                                    })
                                  }
                                  className={`relative w-20 aspect-[9/16] rounded-lg overflow-hidden bg-black border cursor-grab active:cursor-grabbing flex-shrink-0 group transition-all duration-150 select-none ${
                                    isDraggingThis
                                      ? 'opacity-30 scale-95 border-dashed border-[#7C5CFC]'
                                      : isOverThis
                                      ? 'ring-2 ring-[#7C5CFC] ring-offset-2 ring-offset-[#0A0A0D] scale-105 border-[#7C5CFC]'
                                      : 'border-[#272733] hover:border-[#7C5CFC]/60 hover:shadow-lg hover:shadow-[#7C5CFC]/10'
                                  }`}
                                  title="Kéo thả để đổi thứ tự, hoặc nhấn để xem ảnh to"
                                >
                                  <img
                                    src={imgUrl}
                                    alt={`Slide ${imgIdx + 1}`}
                                    className="w-full h-full object-cover pointer-events-none"
                                  />

                                  {/* Badge số thứ tự slide */}
                                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/85 backdrop-blur-sm text-[9px] font-mono font-bold text-[#F59E0B] rounded border border-white/10 flex items-center gap-1 pointer-events-none">
                                    <Move className="w-2 h-2 text-[#71717A]" />
                                    #{imgIdx + 1}
                                  </div>

                                  {/* Nút xóa slide */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveImageFromChapter(idx, imgIdx);
                                    }}
                                    className="absolute top-1 right-1 p-1 bg-red-600/90 hover:bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition z-10"
                                    title="Xóa slide này"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>

                                  {/* Overlay hover: Biểu tượng xem to */}
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                    <div className="p-1.5 rounded-full bg-[#7C5CFC]/90 text-white shadow-lg">
                                      <ZoomIn className="w-3.5 h-3.5" />
                                    </div>
                                  </div>

                                  {/* Nút điều hướng phụ (trái/phải) */}
                                  <div
                                    className="absolute bottom-1 inset-x-1 flex justify-between opacity-0 group-hover:opacity-100 transition z-10"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      disabled={imgIdx === 0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveImage(idx, imgIdx, 'left');
                                      }}
                                      className="p-1 bg-black/80 hover:bg-[#7C5CFC] text-white rounded disabled:opacity-20 transition"
                                      title="Sang trái"
                                    >
                                      <ChevronLeft className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={imgIdx === (chap.images?.length || 0) - 1}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveImage(idx, imgIdx, 'right');
                                      }}
                                      className="p-1 bg-black/80 hover:bg-[#7C5CFC] text-white rounded disabled:opacity-20 transition"
                                      title="Sang phải"
                                    >
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Thanh trượt điều khiển kéo qua xem toàn bộ ảnh */}
                          {chap.images.length > 3 && (
                            <div className="flex items-center gap-2.5 pt-2 pb-1.5 px-3 bg-[#0D0D14] rounded-lg border border-[#222230]">
                              <button
                                type="button"
                                onClick={() => scrollSlider(idx, 'left')}
                                className="p-1 rounded bg-[#181822] hover:bg-[#7C5CFC] text-[#A1A1AA] hover:text-white transition flex items-center gap-1 text-[11px] font-medium flex-shrink-0"
                                title="Cuộn lùi về trước"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>

                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-[10px] text-[#A1A1AA] font-mono font-medium">#1</span>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={sliderPositions[idx] ?? 0}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setSliderPositions((prev) => ({ ...prev, [idx]: val }));
                                    const el = document.getElementById(`chap-slider-${idx}`);
                                    if (el) {
                                      const maxScroll = el.scrollWidth - el.clientWidth;
                                      el.scrollLeft = (val / 100) * maxScroll;
                                    }
                                  }}
                                  className="w-full h-2 bg-[#1C1C28] rounded-lg appearance-none cursor-ew-resize accent-[#7C5CFC] hover:accent-[#9061F9] transition"
                                  title="Kéo thanh trượt để lướt xem toàn bộ các ảnh trong tập"
                                />
                                <span className="text-[10px] text-[#A1A1AA] font-mono font-medium">#{chap.images.length}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => scrollSlider(idx, 'right')}
                                className="p-1 rounded bg-[#181822] hover:bg-[#7C5CFC] text-[#A1A1AA] hover:text-white transition flex items-center gap-1 text-[11px] font-medium flex-shrink-0"
                                title="Cuộn tới tiếp theo"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-[#52525B] py-2 text-center border border-dashed border-[#1E1E26] rounded">
                          Bấm "+ Thêm nhiều ảnh" để chọn 10, 20 hoặc 50 ảnh cùng lúc
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Nút thêm tập tiếp theo (khi nào có tập mới mới thêm) */}
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = chapters.length + 1;
                    const autoPrice = nextNum >= defaultLockFrom ? defaultLockPrice : 0;
                    setChapters([
                      ...chapters,
                      {
                        title: `Tập ${nextNum}`,
                        content: '',
                        images: [],
                        imageLinks: '',
                        priceCoins: autoPrice,
                      },
                    ]);
                    showToast(`Đã thêm Tập ${nextNum} (${autoPrice === 0 ? 'Free' : `Khóa ${autoPrice} Điểm`})`);
                  }}
                  className="w-full py-2.5 px-3 border border-dashed border-[#2E2E3C] hover:border-[#7C5CFC] bg-[#111116] hover:bg-[#14141D] text-[#A1A1AA] hover:text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5 text-[#7C5CFC]" />
                  <span>+ Thêm Tập {chapters.length + 1} (Tự động {chapters.length + 1 >= defaultLockFrom ? `Khóa ${defaultLockPrice} Điểm` : 'Free'})</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 bg-[#7C5CFC] hover:bg-[#6D4CF0] text-white font-medium rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-[#7C5CFC]/20"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingStoryId ? (
                  'Lưu Cập Nhật Bộ Truyện'
                ) : (
                  'Lưu & Xuất Bản Bộ Truyện'
                )}
              </button>
            </form>
          </div>

          {/* Cột Phải: Kho truyện hiện có (5 cột) */}
          <div className="lg:col-span-5 bg-[#111116] border border-[#1E1E26] rounded-xl p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#1E1E26] pb-3">
              <h2 className="text-sm font-semibold text-white">Kho Truyện ({stories.length})</h2>
              <div className="relative w-44">
                <Search className="w-3 h-3 text-[#52525B] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={storySearch}
                  onChange={(e) => setStorySearch(e.target.value)}
                  placeholder="Lọc mã hoặc tên..."
                  className="w-full pl-7 pr-2.5 py-1 bg-[#0A0A0D] border border-[#272733] rounded-md text-[11px] text-white focus:outline-none focus:border-[#7C5CFC]"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
              {filteredStories.map((st) => (
                <div
                  key={st.id}
                  className="p-2.5 bg-[#0A0A0D] border border-[#1E1E26] hover:border-[#2E2E3C] rounded-lg flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-2.5 truncate max-w-[210px]">
                    <img 
                      src={st.coverImage} 
                      alt={st.title} 
                      className="w-8 h-11 object-cover rounded bg-[#1C1C24] flex-shrink-0" 
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-[#F59E0B] font-bold">
                          #{st.code}
                        </span>
                        <span className="font-medium text-white truncate">{st.title}</span>
                      </div>
                      <div className="text-[10px] text-[#71717A] mt-0.5">
                        {st.chaptersCount} tập • {st.genre}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEditStory(st)}
                      className="p-1.5 bg-[#14141B] hover:bg-[#7C5CFC]/20 text-[#9E9EA8] hover:text-[#7C5CFC] rounded transition"
                      title="Sửa truyện & Thêm tập"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => handleCopyStoryLink(st)}
                      className="p-1.5 bg-[#14141B] hover:bg-[#1E1E28] text-[#9E9EA8] hover:text-white rounded transition"
                      title="Copy link dán TikTok"
                    >
                      {copiedStoryId === st.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>

                    <Link
                      href={`/truyen/${st.slug}`}
                      target="_blank"
                      className="p-1.5 bg-[#14141B] hover:bg-[#1E1E28] text-[#9E9EA8] hover:text-white rounded transition"
                      title="Xem truyện"
                    >
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>

                    <button
                      onClick={() => handleDeleteStory(st.id)}
                      className="p-1.5 bg-[#14141B] hover:bg-red-950/40 text-[#71717A] hover:text-red-400 rounded transition"
                      title="Xóa truyện"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      

      {/* ============================================================ */}
      {/* 2. ĐỘC GIẢ & KHÁCH HÀNG                                       */}
      {/* ============================================================ */}
      {activeTab === 'customers' && (
        <div className="bg-[#111116] border border-[#1E1E26] rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E1E26] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Danh Sách Độc Giả</h2>
              <p className="text-[11px] text-[#71717A]">
                Theo dõi số dư ví Điểm và lịch sử mở khóa
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#52525B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Tìm theo tài khoản hoặc SĐT..."
                  className="w-48 sm:w-64 pl-8 pr-3 py-1.5 bg-[#0A0A0D] border border-[#272733] rounded-lg text-xs text-white focus:outline-none focus:border-[#7C5CFC]"
                />
              </div>

              <div className="flex items-center gap-1 bg-[#0A0A0D] p-0.5 rounded-lg border border-[#272733] text-xs flex-wrap">
                <button
                  onClick={() => setCustomerFilter('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    customerFilter === 'all' ? 'bg-[#22222E] text-white' : 'text-[#71717A] hover:text-white'
                  }`}
                >
                  Tất cả ({safeUsers.length})
                </button>
                <button
                  onClick={() => setCustomerFilter('recharged')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    customerFilter === 'recharged' ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30' : 'text-[#71717A] hover:text-white'
                  }`}
                >
                  Đã nạp tiền ({totalRechargedUsers})
                </button>
                <button
                  onClick={() => setCustomerFilter('google')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    customerFilter === 'google' ? 'bg-sky-950/70 text-sky-300 border border-sky-500/30' : 'text-[#71717A] hover:text-white'
                  }`}
                >
                  Google ({totalGoogleUsers})
                </button>
                <button
                  onClick={() => setCustomerFilter('vip')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                    customerFilter === 'vip' ? 'bg-[#22222E] text-white' : 'text-[#71717A] hover:text-white'
                  }`}
                >
                  VIP ({totalVipUsers})
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1E1E26] text-[#71717A]">
                  <th className="pb-2.5 font-medium">Tài Khoản / Người Dùng</th>
                  <th className="pb-2.5 font-medium">Hạng</th>
                  <th className="pb-2.5 font-medium">Đã Nạp</th>
                  <th className="pb-2.5 font-medium">Số Dư Điểm</th>
                  <th className="pb-2.5 font-medium">Tập Đã Mở</th>
                  <th className="pb-2.5 font-medium">Ngày Tạo</th>
                  <th className="pb-2.5 font-medium text-right">Điều Chỉnh Điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C24]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#52525B]">
                      Không có độc giả nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#14141B] transition">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          {u.avatar ? (
                            <img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 border border-[#272733]" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#1E1E28] text-[#A1A1AA] flex items-center justify-center text-[11px] font-semibold flex-shrink-0 border border-[#272733]">
                              {(u.name || u.phone || u.email || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-white text-xs truncate max-w-[160px] sm:max-w-[200px]">
                                {u.name || u.phone || u.email || u.id}
                              </span>
                              {u.isGoogle && (
                                <span className="text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-1 py-0.2 rounded font-mono flex-shrink-0">
                                  Google
                                </span>
                              )}
                            </div>
                            {u.email && u.email !== u.name ? (
                              <div className="text-[10px] text-[#71717A] truncate max-w-[160px] sm:max-w-[200px] font-mono">
                                {u.email}
                              </div>
                            ) : u.phone && u.phone !== u.name ? (
                              <div className="text-[10px] text-[#71717A] truncate font-mono">
                                {u.phone}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        {u.isVip ? (
                          <span className="text-[10px] text-[#F59E0B] font-semibold bg-[#F59E0B]/10 px-1.5 py-0.5 rounded border border-[#F59E0B]/20">
                            VIP
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#71717A]">Thường</span>
                        )}
                      </td>
                      <td className="py-3">
                        {u.totalRechargedVnd > 0 ? (
                          <span className="font-semibold text-emerald-400 font-mono">
                            {u.totalRechargedVnd.toLocaleString('vi-VN')} đ
                          </span>
                        ) : (
                          <span className="text-[#52525B] font-mono">0 đ</span>
                        )}
                      </td>
                      <td className="py-3 font-semibold text-white font-mono">
                        {u.coins || 0} Điểm
                      </td>
                      <td className="py-3 text-[#A1A1AA]">
                        {u.unlockedCount ?? (u.unlockedChapters?.length || 0)} tập
                      </td>
                      <td className="py-3 text-[#71717A] text-[11px]">
                        {u.createdAt && !isNaN(new Date(u.createdAt).getTime()) ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleAdjustCoins(u.id, 5, u.phone || u.id)}
                            className="px-2 py-0.5 bg-[#1A1A24] hover:bg-[#252534] border border-[#2A2A3A] rounded text-[10px] text-[#D4D4D8] transition font-medium"
                          >
                            +5
                          </button>
                          <button
                            onClick={() => handleAdjustCoins(u.id, 15, u.phone || u.id)}
                            className="px-2 py-0.5 bg-[#1A1A24] hover:bg-[#252534] border border-[#2A2A3A] rounded text-[10px] text-[#D4D4D8] transition font-medium"
                          >
                            +15
                          </button>
                          {(u.coins || 0) >= 5 && (
                            <button
                              onClick={() => handleAdjustCoins(u.id, -5, u.phone || u.id)}
                              className="px-2 py-0.5 bg-[#1A1A24] hover:bg-red-950/40 border border-[#2A2A3A] rounded text-[10px] text-[#71717A] hover:text-red-400 transition font-medium"
                            >
                              -5
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleVip(u.id, u.name || u.phone || u.id, u.isVip)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition ${
                              u.isVip
                                ? 'bg-amber-950/40 text-amber-300 border-amber-800/40 hover:bg-amber-900/60'
                                : 'bg-[#1A1A24] text-[#A1A1AA] border-[#2A2A3A] hover:text-white hover:bg-[#252534]'
                            }`}
                            title={u.isVip ? 'Thu hồi VIP' : 'Cấp VIP 30 ngày'}
                          >
                            {u.isVip ? 'Hủy VIP' : '+VIP'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      

      {/* ============================================================ */}
      {/* 3. DÒNG TIỀN & DOANH THU                                      */}
      {/* ============================================================ */}
      {activeTab === 'revenue' && (
        <div className="bg-[#111116] border border-[#1E1E26] rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E1E26] pb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Sổ Nhật Ký Chuyển Khoản VietQR • Sacombank</h2>
              <p className="text-[11px] text-[#71717A]">
                Đối soát tự động qua thông báo Gmail ngân hàng Sacombank (040121635056 - TRAN CONG DUC)
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[#0A0A0D] p-0.5 rounded-lg border border-[#272733] text-xs">
              <button
                onClick={() => setOrderFilter('all')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  orderFilter === 'all' ? 'bg-[#22222E] text-white' : 'text-[#71717A] hover:text-white'
                }`}
              >
                Tất cả ({safeOrders.length})
              </button>
              <button
                onClick={() => setOrderFilter('completed')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  orderFilter === 'completed' ? 'bg-[#22222E] text-white' : 'text-[#71717A] hover:text-white'
                }`}
              >
                Thành công ({safeOrders.filter(o => o.status === 'completed').length})
              </button>
              <button
                onClick={() => setOrderFilter('pending')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  orderFilter === 'pending' ? 'bg-[#22222E] text-white' : 'text-[#71717A] hover:text-white'
                }`}
              >
                Chờ quét ({safeOrders.filter(o => o.status === 'pending' || o.status === 'processing').length})
              </button>
              <button
                onClick={() => setOrderFilter('expired')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  orderFilter === 'expired' ? 'bg-[#22222E] text-white' : 'text-[#71717A] hover:text-white'
                }`}
              >
                Đã hết hạn ({safeOrders.filter(o => o.status === 'expired').length})
              </button>
              <button
                onClick={handleCleanupTestData}
                className="px-2.5 py-1 rounded text-[11px] font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/30 transition ml-2"
                title="Xóa toàn bộ user test và đơn test để chuẩn bị ra mắt"
              >
                Dọn Data Test
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1E1E26] text-[#71717A]">
                  <th className="pb-2.5 font-medium">Mã Đơn / Nội Dung CK</th>
                  <th className="pb-2.5 font-medium">Khách Hàng</th>
                  <th className="pb-2.5 font-medium">Gói Nạp</th>
                  <th className="pb-2.5 font-medium">Số Tiền</th>
                  <th className="pb-2.5 font-medium">Trạng Thái</th>
                  <th className="pb-2.5 font-medium text-right">Thời Gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C24]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#52525B]">
                      Chưa có đơn nạp nào.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-[#14141B] transition">
                      <td className="py-3 font-mono font-medium text-white">
                        {ord.orderCode}
                      </td>
                      <td className="py-3 text-[#A1A1AA]">
                        <div className="font-medium text-white text-xs">{ord.userName || ord.userId}</div>
                        {ord.userEmail && (
                          <div className="text-[10px] text-[#71717A]">{ord.userEmail}</div>
                        )}
                      </td>
                      <td className="py-3 text-[#D4D4D8]">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#1E1E28] text-[#D4D4D8] border border-[#2A2A38] font-mono">
                          {ord.packageType}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-emerald-400">
                        {ord.amountVnd.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3">
                        {ord.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                            ✓ Thành công
                          </span>
                        ) : ord.status === 'processing' ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-[#7C5CFC]/20 text-[#A78BFA] border border-[#7C5CFC]/50 font-semibold animate-pulse">
                              🔄 Đang xử lý (Khách báo đã CK)
                            </span>
                            <button
                              onClick={() => handleApproveOrder(ord.orderCode)}
                              className="px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded text-[10px] font-medium transition"
                            >
                              Duyệt ngay
                            </button>
                          </div>
                        ) : ord.status === 'pending' ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
                              Chờ quét QR
                            </span>
                            <button
                              onClick={() => handleApproveOrder(ord.orderCode)}
                              className="px-2 py-0.5 bg-[#7C5CFC]/20 hover:bg-[#7C5CFC] text-[#A78BFA] hover:text-white border border-[#7C5CFC]/40 rounded text-[10px] font-medium transition"
                            >
                              Duyệt ngay
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-[#181822] text-[#71717A] border border-[#272733] font-medium">
                            ✕ Đã hết hạn
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right text-[#71717A] text-[11px]">
                        {ord.createdAt && !isNaN(new Date(ord.createdAt).getTime())
                          ? `${new Date(ord.createdAt).toLocaleTimeString('vi-VN')} - ${new Date(ord.createdAt).toLocaleDateString('vi-VN')}`
                          : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      

      {/* ============================================================ */}
      {/* 4. THỐNG KÊ TRAFFIC & LƯỢT TRUY CẬP TỪ TIKTOK                */}
      {/* ============================================================ */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Hàng thẻ thống kê */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 bg-[#111116] border border-[#1E1E26] rounded-xl">
              <div className="text-[11px] font-medium text-[#71717A]">Tổng Số Máy Đã Vào (Khách Thực Tế)</div>
              <div className="text-2xl font-bold text-white mt-1">
                {(analytics?.totalMachines || analytics?.totalViews || 0).toLocaleString('vi-VN')}
              </div>
              <div className="text-[10px] text-emerald-400 mt-1">
                Chuẩn: 1 máy = tính 1 lần duy nhất
              </div>
            </div>

            <div className="p-4 bg-[#111116] border border-[#1E1E26] rounded-xl">
              <div className="text-[11px] font-medium text-[#71717A]">Số Máy Hoạt Động Hôm Nay</div>
              <div className="text-2xl font-bold text-sky-400 mt-1">
                {(analytics?.todayActiveMachines || analytics?.todayViews || 0).toLocaleString('vi-VN')}
              </div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">F5 / tải lại không bị tính trùng</div>
            </div>

            <div className="p-4 bg-[#111116] border border-[#1E1E26] rounded-xl">
              <div className="text-[11px] font-medium text-[#71717A]">Từ TikTok Bio</div>
              <div className="text-2xl font-bold text-[#F43F5E] mt-1">
                {(analytics?.sources?.['TikTok Bio'] || 0).toLocaleString('vi-VN')}
              </div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">Khách bấm từ link bio TikTok</div>
            </div>

            <div className="p-4 bg-[#111116] border border-[#1E1E26] rounded-xl">
              <div className="text-[11px] font-medium text-[#71717A]">Thiết Bị Di Động</div>
              <div className="text-2xl font-bold text-[#7C5CFC] mt-1">
                {((analytics?.devices?.['iPhone (iOS)'] || 0) + (analytics?.devices?.['Android Phone'] || 0)).toLocaleString('vi-VN')}
              </div>
              <div className="text-[10px] text-[#A1A1AA] mt-1">iPhone & Android chiếm ưu thế</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Phân tích nguồn & thiết bị (5 cột) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Nguồn truy cập */}
              <div className="bg-[#111116] border border-[#1E1E26] rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Nguồn Truy Cập (Referrer)
                </h3>
                <div className="space-y-2">
                  {analytics?.sources && Object.keys(analytics.sources).length > 0 ? (
                    Object.entries(analytics.sources).map(([src, count]: [string, any]) => {
                      const total = analytics.totalMachines || analytics.totalViews || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={src} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-[#D4D4D8] font-medium">{src}</span>
                            <span className="text-[#71717A]">{count} máy ({pct}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#1C1C24] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                src.includes('TikTok') ? 'bg-[#F43F5E]' : src.includes('Facebook') ? 'bg-[#1877F2]' : 'bg-[#7C5CFC]'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-[#71717A] py-2 text-center">Chưa có dữ liệu nguồn.</div>
                  )}
                </div>
              </div>

              {/* Phân loại thiết bị */}
              <div className="bg-[#111116] border border-[#1E1E26] rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Thiết Bị Độc Giả Sử Dụng
                </h3>
                <div className="space-y-2">
                  {analytics?.devices && Object.keys(analytics.devices).length > 0 ? (
                    Object.entries(analytics.devices).map(([dev, count]: [string, any]) => {
                      const total = analytics.totalMachines || analytics.totalViews || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <div key={dev} className="flex justify-between items-center text-xs p-2 bg-[#0A0A0D] rounded-lg border border-[#1C1C24]">
                          <span className="text-white font-medium">{dev}</span>
                          <span className="font-mono text-[#F59E0B] font-semibold">{count} ({pct}%)</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-[#71717A] py-2 text-center">Chưa có dữ liệu thiết bị.</div>
                  )}
                </div>
              </div>

              {/* Top truyện xem nhiều */}
              {analytics?.topStories && analytics.topStories.length > 0 && (
                <div className="bg-[#111116] border border-[#1E1E26] rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                    Top Bộ Truyện Xem Nhiều
                  </h3>
                  <div className="space-y-2">
                    {analytics.topStories.map((st: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 bg-[#0A0A0D] rounded-lg border border-[#1C1C24]">
                        <span className="text-white font-medium truncate max-w-[200px]">{st.title}</span>
                        <span className="font-mono text-emerald-400 font-semibold">{st.count} lượt đọc</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bảng danh sách thiết bị (1 Máy = 1 Lần, hiển thị cách đây bao lâu) */}
            <div className="lg:col-span-7 bg-[#111116] border border-[#1E1E26] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1E1E26] pb-2.5">
                <div>
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Danh Sách Thiết Bị Truy Cập (1 Máy = 1 Khách)
                  </h3>
                  <p className="text-[10px] text-[#71717A]">
                    F5 / reload không làm tăng số lượng • Hiển thị thời gian cách đây bao lâu
                  </p>
                </div>
                <button
                  onClick={fetchData}
                  className="px-2.5 py-1 bg-[#1A1A24] hover:bg-[#252534] border border-[#2A2A38] text-[11px] text-[#D4D4D8] rounded-md transition font-medium"
                >
                  Làm mới
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#1E1E26] text-[#71717A]">
                      <th className="pb-2 font-medium">Thiết Bị / Mã Máy</th>
                      <th className="pb-2 font-medium">Nguồn Đến</th>
                      <th className="pb-2 font-medium">Trang Xem Gần Nhất</th>
                      <th className="pb-2 font-medium text-right">Hoạt Động Gần Nhất</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C1C24]">
                    {!(analytics?.machineList || analytics?.recentEvents) || (analytics.machineList || analytics.recentEvents).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-[#52525B]">
                          Chưa có thiết bị nào được ghi nhận.
                        </td>
                      </tr>
                    ) : (
                      (analytics.machineList || analytics.recentEvents).map((evt: any) => {
                        const isRecent = evt.timeAgo === 'Vừa truy cập xong' || evt.timeAgo?.includes('phút');
                        const timeStr = evt.lastActive || evt.createdAt;
                        const displayTime = timeStr && !isNaN(new Date(timeStr).getTime()) 
                          ? new Date(timeStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                          : '';

                        return (
                          <tr key={evt.id} className="hover:bg-[#14141B] transition">
                            <td className="py-2.5">
                              <div className="font-medium text-white">{evt.device}</div>
                              <div className="text-[10px] text-[#71717A] font-mono">
                                ID: {evt.id ? evt.id.substring(0, 14) + '...' : 'Ẩn danh'}
                              </div>
                            </td>
                            <td className="py-2.5">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  evt.referrer?.includes('TikTok')
                                    ? 'bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30'
                                    : evt.referrer?.includes('Facebook')
                                    ? 'bg-[#1877F2]/15 text-[#1877F2] border border-[#1877F2]/30'
                                    : 'bg-[#1C1C26] text-[#A1A1AA]'
                                }`}
                              >
                                {evt.referrer}
                              </span>
                            </td>
                            <td className="py-2.5 font-medium text-[#D4D4D8] truncate max-w-[140px]" title={evt.storyTitle || evt.path}>
                              {evt.storyTitle || evt.path}
                            </td>
                            <td className="py-2.5 text-right">
                              <div className={`text-xs font-semibold ${isRecent ? 'text-emerald-400' : 'text-[#A1A1AA]'}`}>
                                {evt.timeAgo || 'Vừa xong'}
                              </div>
                              {displayTime && (
                                <div className="text-[10px] text-[#52525B]">
                                  lúc {displayTime}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      

      {/* Lightbox Modal Xem Ảnh Toàn Màn Hình */}
      {previewModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-fadeIn select-none"
          onClick={() => setPreviewModal(null)}
        >
          {/* Header */}
          <div
            className="w-full max-w-4xl flex items-center justify-between text-white py-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-[#7C5CFC]/20 text-[#A78BFA] border border-[#7C5CFC]/40 text-xs font-semibold rounded-md">
                {previewModal.chapterTitle || 'Tập truyện'}
              </span>
              <span className="text-sm font-medium text-white/90">
                Slide <strong className="text-[#F59E0B] font-mono text-base">{previewModal.currentIndex + 1}</strong> / {previewModal.images.length}
              </span>
              <span className="text-xs text-[#71717A] hidden sm:inline">
                (Dùng phím mũi tên ⬅️ ➡️ hoặc ESC để đóng)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setPreviewModal(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition flex items-center gap-1.5 text-xs"
            >
              <X className="w-5 h-5" />
              <span className="hidden sm:inline">Đóng</span>
            </button>
          </div>

          {/* Main Image View */}
          <div
            className="relative flex-1 flex items-center justify-center w-full max-w-4xl min-h-0 my-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút Prev */}
            <button
              type="button"
              disabled={previewModal.currentIndex === 0}
              onClick={(e) => {
                e.stopPropagation();
                setPreviewModal((prev) =>
                  prev ? { ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) } : null
                );
              }}
              className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-black/60 hover:bg-[#7C5CFC] text-white border border-white/10 disabled:opacity-20 disabled:pointer-events-none transition shadow-xl"
              title="Ảnh trước (Mũi tên trái)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Ảnh slide chuẩn tỉ lệ 9:16 sắc nét */}
            <div className="relative max-h-full aspect-[9/16] rounded-xl overflow-hidden border border-[#272733] shadow-2xl bg-black flex items-center justify-center">
              <img
                src={previewModal.images[previewModal.currentIndex]}
                alt={`Slide ${previewModal.currentIndex + 1}`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Nút Next */}
            <button
              type="button"
              disabled={previewModal.currentIndex === previewModal.images.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                setPreviewModal((prev) =>
                  prev ? { ...prev, currentIndex: Math.min(prev.images.length - 1, prev.currentIndex + 1) } : null
                );
              }}
              className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-[#7C5CFC] text-white border border-white/10 disabled:opacity-20 disabled:pointer-events-none transition shadow-xl"
              title="Ảnh tiếp theo (Mũi tên phải)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Thumbnails Strip */}
          <div
            className="w-full max-w-3xl flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-2 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {previewModal.images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPreviewModal((prev) => (prev ? { ...prev, currentIndex: i } : null))}
                className={`relative w-10 sm:w-12 aspect-[9/16] rounded-md overflow-hidden flex-shrink-0 transition-all ${
                  i === previewModal.currentIndex
                    ? 'ring-2 ring-[#7C5CFC] scale-105 opacity-100 shadow-md shadow-[#7C5CFC]/30'
                    : 'opacity-50 hover:opacity-80'
                }`}
              >
                <img src={img} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] text-white font-mono text-center">
                  #{i + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. HÒM THƯ GÓP Ý & BÁO LỖI TỪ ĐỘC GIẢ                       */}
      {/* ============================================================ */}
      {activeTab === 'feedback' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Header & Thống kê nhanh */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111116] border border-[#1E1E26] rounded-xl p-5">
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>📬 Hòm Thư Ý Kiến Độc Giả</span>
                {feedbackList.filter(f => f.status === 'new').length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#7C5CFC]/20 text-[#A78BFA] border border-[#7C5CFC]/40 font-bold">
                    {feedbackList.filter(f => f.status === 'new').length} tin mới
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-[#71717A] mt-0.5">
                Toàn bộ phản hồi, góp ý kịch bản, báo lỗi website và yêu cầu hỗ trợ từ độc giả
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="px-3 py-1.5 bg-[#1A1A24] hover:bg-[#252534] border border-[#2A2A38] text-xs text-[#D4D4D8] rounded-md transition font-medium"
              >
                Làm mới
              </button>
            </div>
          </div>

          {/* Danh sách góp ý */}
          <div className="bg-[#111116] border border-[#1E1E26] rounded-xl p-5 space-y-4">
            {/* Thanh Phân Loại & Bộ Lọc */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#1E1E26]">
              {/* Tabs phân loại Loại thư */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  onClick={() => setFeedbackTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    feedbackTypeFilter === 'all'
                      ? 'bg-[#7C5CFC] text-white shadow-sm'
                      : 'bg-[#16161F] text-[#A1A1AA] hover:text-white border border-[#22222E]'
                  }`}
                >
                  Tất cả ({feedbackList.length})
                </button>

                <button
                  onClick={() => setFeedbackTypeFilter('bug')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    feedbackTypeFilter === 'bug'
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'bg-[#16161F] text-[#A1A1AA] hover:text-white border border-[#22222E]'
                  }`}
                >
                  <span>🐛 Báo lỗi</span>
                  <span className="text-[10px] opacity-80">
                    ({feedbackList.filter(f => f.type === 'bug').length})
                  </span>
                </button>

                <button
                  onClick={() => setFeedbackTypeFilter('content')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    feedbackTypeFilter === 'content'
                      ? 'bg-amber-500 text-black font-semibold shadow-sm'
                      : 'bg-[#16161F] text-[#A1A1AA] hover:text-white border border-[#22222E]'
                  }`}
                >
                  <span>💡 Góp ý truyện</span>
                  <span className="text-[10px] opacity-80">
                    ({feedbackList.filter(f => f.type === 'content').length})
                  </span>
                </button>

                <button
                  onClick={() => setFeedbackTypeFilter('payment')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    feedbackTypeFilter === 'payment'
                      ? 'bg-emerald-500 text-black font-semibold shadow-sm'
                      : 'bg-[#16161F] text-[#A1A1AA] hover:text-white border border-[#22222E]'
                  }`}
                >
                  <span>💳 Mở khóa / Điểm</span>
                  <span className="text-[10px] opacity-80">
                    ({feedbackList.filter(f => f.type === 'payment').length})
                  </span>
                </button>

                <button
                  onClick={() => setFeedbackTypeFilter('other')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    feedbackTypeFilter === 'other'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-[#16161F] text-[#A1A1AA] hover:text-white border border-[#22222E]'
                  }`}
                >
                  <span>💬 Ý kiến khác</span>
                  <span className="text-[10px] opacity-80">
                    ({feedbackList.filter(f => f.type === 'other').length})
                  </span>
                </button>
              </div>

              {/* Lọc theo trạng thái: Chưa xem / Đã xem */}
              <div className="flex items-center gap-1 text-[11px] bg-[#0E0E14] p-1 rounded-lg border border-[#22222E] self-start lg:self-auto">
                <button
                  onClick={() => setFeedbackStatusFilter('all')}
                  className={`px-2.5 py-1 rounded transition ${
                    feedbackStatusFilter === 'all'
                      ? 'bg-[#22222E] text-white font-medium'
                      : 'text-[#71717A] hover:text-white'
                  }`}
                >
                  Toàn bộ
                </button>
                <button
                  onClick={() => setFeedbackStatusFilter('new')}
                  className={`px-2.5 py-1 rounded transition flex items-center gap-1 ${
                    feedbackStatusFilter === 'new'
                      ? 'bg-[#7C5CFC]/30 text-[#A78BFA] font-medium border border-[#7C5CFC]/40'
                      : 'text-[#71717A] hover:text-white'
                  }`}
                >
                  <span>Chưa xem</span>
                  {feedbackList.filter(f => f.status === 'new').length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CFC] animate-pulse" />
                  )}
                </button>
                <button
                  onClick={() => setFeedbackStatusFilter('reviewed')}
                  className={`px-2.5 py-1 rounded transition ${
                    feedbackStatusFilter === 'reviewed'
                      ? 'bg-[#22222E] text-white font-medium'
                      : 'text-[#71717A] hover:text-white'
                  }`}
                >
                  Đã xem
                </button>
              </div>
            </div>

            {/* Danh sách sau lọc */}
            {(() => {
              const displayList = feedbackList.filter(item => {
                if (feedbackTypeFilter !== 'all' && item.type !== feedbackTypeFilter) return false;
                if (feedbackStatusFilter === 'new' && item.status !== 'new') return false;
                if (feedbackStatusFilter === 'reviewed' && item.status !== 'reviewed') return false;
                return true;
              });

              if (displayList.length === 0) {
                return (
                  <div className="py-12 text-center text-[#52525B] space-y-2">
                    <div className="text-2xl">📭</div>
                    <div className="text-xs">Không có thư nào trong mục phân loại này.</div>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-[#1C1C24] space-y-3">
                  {displayList.map((item) => (
                  <div key={item.id} className="pt-3 first:pt-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {item.type === 'content' && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium">
                            💡 Nội dung truyện
                          </span>
                        )}
                        {item.type === 'bug' && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 font-medium">
                            🐛 Báo lỗi kỹ thuật
                          </span>
                        )}
                        {item.type === 'payment' && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                            💳 Sự cố mở khóa / Điểm
                          </span>
                        )}
                        {item.type === 'other' && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/30 font-medium">
                            💬 Ý kiến khác
                          </span>
                        )}

                        <span className="text-xs font-semibold text-white">
                          {item.userName || 'Độc giả ẩn danh'}
                        </span>

                        {item.contact && (
                          <span className="text-[11px] font-mono text-[#A78BFA] bg-[#7C5CFC]/10 px-2 py-0.5 rounded border border-[#7C5CFC]/20">
                            Liên hệ: {item.contact}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#71717A]">
                          {item.createdAt && !isNaN(new Date(item.createdAt).getTime())
                            ? `${new Date(item.createdAt).toLocaleTimeString('vi-VN')} - ${new Date(item.createdAt).toLocaleDateString('vi-VN')}`
                            : '—'}
                        </span>

                        {item.status === 'new' ? (
                          <button
                            onClick={() => handleUpdateFeedbackStatus(item.id, 'reviewed')}
                            className="px-2 py-0.5 rounded text-[10px] bg-[#7C5CFC]/20 hover:bg-[#7C5CFC] text-[#A78BFA] hover:text-white border border-[#7C5CFC]/40 font-medium transition"
                          >
                            Đánh dấu đã xem
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[#1C1C24] text-[#71717A] border border-[#272733]">
                            ✓ Đã xem
                          </span>
                        )}

                        <button
                          onClick={() => handleDeleteFeedback(item.id)}
                          className="p-1 rounded text-[#71717A] hover:text-red-400 hover:bg-red-950/30 transition text-xs"
                          title="Xóa góp ý"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Nội dung góp ý */}
                    <div className="p-3 bg-[#0A0A0E] rounded-lg border border-[#1E1E26] text-xs text-[#D4D4D8] leading-relaxed whitespace-pre-wrap">
                      {item.content}
                    </div>

                    {/* Ảnh đính kèm (nếu độc giả có gửi ảnh) */}
                    {item.imageUrl && (
                      <div className="pt-1">
                        <div className="text-[10px] text-[#A1A1AA] mb-1 font-medium flex items-center gap-1.5">
                          <span>📎 Ảnh chụp màn hình từ độc giả:</span>
                          <span className="text-[9px] text-[#71717A]">(Bấm vào để mở ảnh gốc)</span>
                        </div>
                        <a
                          href={item.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block relative rounded-lg overflow-hidden border border-[#2D2D3D] hover:border-[#7C5CFC] transition group bg-black/60 p-1"
                        >
                          <img
                            src={item.imageUrl}
                            alt="Ảnh lỗi đính kèm từ độc giả"
                            className="max-h-52 max-w-xs sm:max-w-md rounded object-contain"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-semibold transition gap-1.5 backdrop-blur-[1px]">
                            <span>Xem ảnh phóng to</span>
                            <span>↗</span>
                          </div>
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
          </div>
        </div>
      )}
    </div>
  );
}

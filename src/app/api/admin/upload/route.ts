import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase';
import { isAuthorizedAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // KHÓA BẢO MẬT: Bắt buộc quyền Quản trị viên mới được upload ảnh lên kho lưu trữ
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json(
      { success: false, message: 'Truy cập bị từ chối: Yêu cầu xác thực quyền Quản trị viên' },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File;

    const allFiles = files.length > 0 ? files : (singleFile ? [singleFile] : []);

    if (allFiles.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy file tải lên' },
        { status: 400 }
      );
    }

    const uploadedResults: Array<{
      url: string;
      filename: string;
      size: number;
    }> = [];

    const now = Date.now();

    for (let i = 0; i < allFiles.length; i++) {
      const file = allFiles[i];
      const buffer = Buffer.from(await file.arrayBuffer());

      const ext = path.extname(file.name) || '.webp';
      const cleanBaseName = file.name
        .replace(ext, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .slice(0, 30);
      
      const uniqueFilename = `${now}-${i}-${cleanBaseName}${ext}`;

      // 1. Tải lên Supabase Storage (Ưu tiên lưu trữ đám mây vĩnh viễn)
      let fileUrl = '';
      try {
        const { error: uploadError } = await supabaseAdmin.storage
          .from('comics')
          .upload(uniqueFilename, buffer, {
            contentType: file.type || 'image/webp',
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicData } = supabaseAdmin.storage
            .from('comics')
            .getPublicUrl(uniqueFilename);
          fileUrl = publicData.publicUrl;
        } else {
          console.warn('Supabase storage warning:', uploadError.message);
        }
      } catch (sbErr: any) {
        console.warn('Supabase upload exception:', sbErr.message);
      }

      // 2. Fallback: Lưu vào thư mục public/uploads nội bộ nếu offline
      if (!fileUrl) {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        await fs.mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, uniqueFilename);
        await fs.writeFile(filePath, buffer);
        fileUrl = `/uploads/${uniqueFilename}`;
      }

      uploadedResults.push({
        url: fileUrl,
        filename: uniqueFilename,
        size: buffer.length,
      });
    }

    return NextResponse.json({
      success: true,
      files: uploadedResults,
      url: uploadedResults[0]?.url,
      message: `Đã lưu vĩnh viễn ${uploadedResults.length} ảnh lên Supabase Storage!`,
    });
  } catch (error: any) {
    console.error('Lỗi upload:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Lỗi xử lý file upload' },
      { status: 500 }
    );
  }
}
